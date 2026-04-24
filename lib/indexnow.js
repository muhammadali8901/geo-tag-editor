/**
 * IndexNow client for geotagseditor.online
 * - Batches up to 100 URLs per request
 * - De-duplicates submissions (same URL not resubmitted within 24h)
 * - Retries once on transient failure (5xx / network)
 * - Logs every attempt to /tmp/indexnow.log and stdout
 *
 * Spec: https://www.indexnow.org/documentation
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const HOST = 'geotagseditor.online';
const KEY = '2f7faa808792498083543bb6cffb4123';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const ENDPOINT_HOST = 'api.indexnow.org';
const ENDPOINT_PATH = '/indexnow';
const BATCH_SIZE = 100;
const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

const LOG_PATH = '/tmp/indexnow.log';
const DEDUP_PATH = path.join(__dirname, '..', '.indexnow-submitted.json');

// In-memory cache: url -> last-submitted timestamp (ms)
let submitted = loadDedupCache();

function loadDedupCache() {
  try {
    const raw = fs.readFileSync(DEDUP_PATH, 'utf8');
    const data = JSON.parse(raw);
    const now = Date.now();
    // Drop entries older than dedup window
    const fresh = {};
    for (const [url, ts] of Object.entries(data)) {
      if (now - ts < DEDUP_WINDOW_MS) fresh[url] = ts;
    }
    return fresh;
  } catch {
    return {};
  }
}

function saveDedupCache() {
  try {
    fs.writeFileSync(DEDUP_PATH, JSON.stringify(submitted), 'utf8');
  } catch (err) {
    log('warn', `Failed to write dedup cache: ${err.message}`);
  }
}

function log(level, message) {
  const line = `[${new Date().toISOString()}] [indexnow] [${level}] ${message}`;
  console.log(line);
  try { fs.appendFileSync(LOG_PATH, line + '\n'); } catch {}
}

function normalizeUrl(u) {
  if (!u) return null;
  try {
    const parsed = new URL(u, `https://${HOST}`);
    if (parsed.hostname !== HOST) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function dedupAndFilter(urls, { force = false } = {}) {
  const now = Date.now();
  const seen = new Set();
  const out = [];
  for (const raw of urls) {
    const u = normalizeUrl(raw);
    if (!u) continue;
    if (seen.has(u)) continue;
    seen.add(u);
    if (!force) {
      const last = submitted[u];
      if (last && now - last < DEDUP_WINDOW_MS) continue;
    }
    out.push(u);
  }
  return out;
}

function postJson(payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = https.request({
      hostname: ENDPOINT_HOST,
      port: 443,
      path: ENDPOINT_PATH,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
        'Accept': 'application/json',
        'User-Agent': `geotagseditor-indexnow/1.0 (+https://${HOST})`,
      },
      timeout: 15000,
    }, (res) => {
      let chunks = '';
      res.on('data', (c) => { chunks += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: chunks }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(new Error('IndexNow request timeout')); });
    req.write(body);
    req.end();
  });
}

async function submitBatch(urlList, attempt = 1) {
  const payload = { host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList };
  try {
    const { status, body } = await postJson(payload);
    // 200 = accepted; 202 = accepted (processing); both are success.
    // 422 = some URLs invalid; logged but not retried (won't help).
    // 429 = rate-limited; retry once after 2s.
    // 5xx = server error; retry once after 2s.
    if (status === 200 || status === 202) {
      log('info', `OK status=${status} count=${urlList.length}`);
      const now = Date.now();
      for (const u of urlList) submitted[u] = now;
      saveDedupCache();
      return { ok: true, status, count: urlList.length };
    }
    if ((status === 429 || (status >= 500 && status < 600)) && attempt === 1) {
      log('warn', `Transient status=${status} body=${body.slice(0, 200)} — retrying in 2s`);
      await new Promise(r => setTimeout(r, 2000));
      return submitBatch(urlList, 2);
    }
    log('error', `Failed status=${status} body=${body.slice(0, 300)} count=${urlList.length}`);
    return { ok: false, status, count: urlList.length, body: body.slice(0, 300) };
  } catch (err) {
    if (attempt === 1) {
      log('warn', `Network error "${err.message}" — retrying in 2s`);
      await new Promise(r => setTimeout(r, 2000));
      return submitBatch(urlList, 2);
    }
    log('error', `Network error "${err.message}" after retry`);
    return { ok: false, status: 0, count: urlList.length, error: err.message };
  }
}

/**
 * Submit one or more URLs to IndexNow.
 * Options:
 *   force = true → bypass 24h dedup (use for daily full re-pings)
 * Returns array of batch results.
 */
async function submitUrls(urls, { force = false } = {}) {
  if (!Array.isArray(urls)) urls = [urls];
  const filtered = dedupAndFilter(urls, { force });
  if (filtered.length === 0) {
    log('info', `No new URLs to submit (all ${urls.length} skipped: invalid or recently submitted)`);
    return [{ ok: true, status: 0, count: 0, skipped: urls.length }];
  }
  const results = [];
  for (let i = 0; i < filtered.length; i += BATCH_SIZE) {
    const batch = filtered.slice(i, i + BATCH_SIZE);
    results.push(await submitBatch(batch));
  }
  return results;
}

/**
 * Parse sitemap.xml and submit every <loc> in it.
 * Pass { force: true } from the daily job to actually resubmit everything
 * regardless of the 24h dedup window.
 */
async function submitFromSitemap(opts = {}) {
  const { sitemapPath: customPath, force = false } = opts;
  const sitemapPath = customPath || path.join(__dirname, '..', 'sitemap.xml');
  let xml;
  try {
    xml = fs.readFileSync(sitemapPath, 'utf8');
  } catch (err) {
    log('error', `Cannot read sitemap at ${sitemapPath}: ${err.message}`);
    return [{ ok: false, error: 'sitemap_unreadable' }];
  }
  const urls = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(m => m[1]);
  log('info', `Sitemap submission starting — ${urls.length} URLs found in ${path.basename(sitemapPath)} (force=${force})`);
  return submitUrls(urls, { force });
}

/**
 * Force-resubmit a URL even if it's in the dedup cache.
 * Use sparingly (manual /submit-indexnow endpoint).
 */
async function forceSubmit(url) {
  const u = normalizeUrl(url);
  if (!u) return { ok: false, error: 'invalid_url' };
  delete submitted[u];
  const results = await submitUrls([u]);
  return results[0];
}

module.exports = {
  submitUrls,
  submitFromSitemap,
  forceSubmit,
  _internal: { normalizeUrl, dedupAndFilter, KEY, HOST, KEY_LOCATION },
};
