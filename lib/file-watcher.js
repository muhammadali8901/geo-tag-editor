/**
 * Watches the project for HTML changes and submits to IndexNow.
 * - Debounces bursts (30s window — handles bulk edits as one submission)
 * - Maps file path -> public URL
 * - Skips templates / hidden / asset directories
 * - Also runs a daily full-sitemap submission
 */

const fs = require('fs');
const path = require('path');
const indexnow = require('./indexnow');

const ROOT = path.join(__dirname, '..');
const DEBOUNCE_MS = 30 * 1000;
const DAILY_MS = 24 * 60 * 60 * 1000;

const SKIP_DIRS = new Set([
  'node_modules', '.git', '.cache', '.upm', '.local', '.config',
  'attached_assets', 'lib', 'partials', 'images', 'css', 'js',
]);

const SKIP_FILES = new Set([
  'adsense-placements.html',
  'test-coordinate-input.html',
  'protection-template.html',
  'social-preview-template.html',
  '404.html',
]);

function fileToUrl(filePath) {
  const rel = path.relative(ROOT, filePath).split(path.sep).join('/');
  if (SKIP_FILES.has(path.basename(rel))) return null;
  if (rel === 'index.html') return 'https://geotagseditor.online/';
  if (rel.endsWith('/index.html')) {
    return `https://geotagseditor.online/${rel.slice(0, -'index.html'.length)}`;
  }
  if (rel.endsWith('.html')) {
    return `https://geotagseditor.online/${rel}`;
  }
  return null;
}

// Two independent timers so a sitemap.xml change cannot strand pending HTML URL flushes.
const pendingUrls = new Set();
let urlDebounceTimer = null;
let sitemapDebounceTimer = null;

function scheduleUrlSubmission(url) {
  pendingUrls.add(url);
  if (urlDebounceTimer) clearTimeout(urlDebounceTimer);
  urlDebounceTimer = setTimeout(async () => {
    const batch = [...pendingUrls];
    pendingUrls.clear();
    urlDebounceTimer = null;
    console.log(`[indexnow-watcher] Flushing ${batch.length} changed URL(s) to IndexNow`);
    await indexnow.submitUrls(batch);
  }, DEBOUNCE_MS);
}

function scheduleSitemapSubmission() {
  if (sitemapDebounceTimer) clearTimeout(sitemapDebounceTimer);
  sitemapDebounceTimer = setTimeout(async () => {
    sitemapDebounceTimer = null;
    console.log('[indexnow-watcher] sitemap.xml debounce fired — submitting full sitemap');
    await indexnow.submitFromSitemap();
  }, DEBOUNCE_MS);
}

function watchTree(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    if (SKIP_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      watchTree(full);
    }
  }
  // Watch this directory non-recursively (recursive:true is unreliable on Linux)
  try {
    fs.watch(dir, (eventType, filename) => {
      if (!filename) return;
      if (!filename.endsWith('.html') && !filename.endsWith('sitemap.xml')) return;
      const full = path.join(dir, filename);
      // Sitemap edits → submit the whole sitemap (independent timer so it
      // does not cancel any pending HTML URL flush).
      if (filename === 'sitemap.xml' && dir === ROOT) {
        console.log('[indexnow-watcher] sitemap.xml changed — queuing full resubmit');
        scheduleSitemapSubmission();
        return;
      }
      const url = fileToUrl(full);
      if (!url) return;
      // For deletes, IndexNow still wants the URL (it will return a 404 on
      // crawl, signalling removal). So we submit on any event type.
      console.log(`[indexnow-watcher] ${eventType}: ${filename} -> ${url}`);
      scheduleUrlSubmission(url);
    });
  } catch (err) {
    console.warn(`[indexnow-watcher] Cannot watch ${dir}: ${err.message}`);
  }
}

function startDailySitemapJob() {
  // Submit once at boot (after a 60s warm-up so the server is ready),
  // then every 24h. Daily job uses { force: true } to bypass the 24h dedup
  // window so the full sitemap is genuinely re-pinged each day.
  setTimeout(() => {
    console.log('[indexnow-watcher] Initial sitemap submission (forced)');
    indexnow.submitFromSitemap({ force: true });
  }, 60 * 1000);
  setInterval(() => {
    console.log('[indexnow-watcher] Daily sitemap submission (forced)');
    indexnow.submitFromSitemap({ force: true });
  }, DAILY_MS);
}

function start() {
  console.log('[indexnow-watcher] Starting file watcher on', ROOT);
  watchTree(ROOT);
  startDailySitemapJob();
}

module.exports = { start, fileToUrl };
