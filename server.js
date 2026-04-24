const http = require('http');
const fs = require('fs');
const path = require('path');
const indexnow = require('./lib/indexnow');
const fileWatcher = require('./lib/file-watcher');

const PORT = 5000;
const HOST = '0.0.0.0';

// Admin key for the manual IndexNow trigger endpoints.
// Set INDEXNOW_ADMIN_KEY in your environment (cPanel: Setup Node.js App → Environment Variables)
// to lock the endpoints. If unset, manual endpoints are disabled (returns 403).
const INDEXNOW_ADMIN_KEY = process.env.INDEXNOW_ADMIN_KEY || '';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json',
  '.md': 'text/markdown',
};

// Assets that can be cached aggressively (1 year, immutable)
const IMMUTABLE_EXTS = new Set(['.css', '.js', '.png', '.jpg', '.jpeg', '.gif',
  '.svg', '.ico', '.webp', '.woff', '.woff', '.woff2', '.ttf', '.eot']);

const BLOCKED_PATHS = new Set([
  '/adsense-placements.html',
  '/test-coordinate-input.html',
  '/protection-template.html',
  '/social-preview-template.html',
]);

const REWRITES = {
  '/about': '/about/index.html',
  '/about/': '/about/index.html',
  '/contact': '/contact/index.html',
  '/contact/': '/contact/index.html',
  '/disclaimer': '/disclaimer/index.html',
  '/disclaimer/': '/disclaimer/index.html',
  '/privacy-policy': '/privacy-policy/index.html',
  '/privacy-policy/': '/privacy-policy/index.html',
  '/terms': '/terms/index.html',
  '/terms/': '/terms/index.html',
  '/blog': '/blog/index.html',
  '/blog/': '/blog/index.html',
  '/add-gps-to-photo-online': '/add-gps-to-photo-online/index.html',
  '/add-gps-to-photo-online/': '/add-gps-to-photo-online/index.html',
  '/remove-geotag-from-photo-online': '/remove-geotag-from-photo-online/index.html',
  '/remove-geotag-from-photo-online/': '/remove-geotag-from-photo-online/index.html',
  '/geo-tag-editor': '/geo-tag-editor/index.html',
  '/geo-tag-editor/': '/geo-tag-editor/index.html',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

function getCacheHeader(ext) {
  if (IMMUTABLE_EXTS.has(ext)) {
    return 'public, max-age=31536000, immutable';
  }
  if (ext === '.html' || ext === '.webmanifest') {
    return 'public, max-age=0, must-revalidate';
  }
  return 'public, max-age=3600';
}

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const cacheControl = getCacheHeader(ext);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html', ...SECURITY_HEADERS });
      res.end('<h1>404 Not Found</h1>');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': cacheControl,
      'Vary': 'Accept-Encoding',
      ...SECURITY_HEADERS,
    });
    res.end(data);
  });
}

function jsonResponse(res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...SECURITY_HEADERS,
  });
  res.end(body);
}

async function handleIndexNow(req, res, urlPath, query) {
  // Auth check
  if (!INDEXNOW_ADMIN_KEY) {
    return jsonResponse(res, 403, {
      ok: false,
      error: 'INDEXNOW_ADMIN_KEY env var is not set; manual endpoint disabled.',
    });
  }
  const provided = query.get('key') || req.headers['x-admin-key'] || '';
  if (provided !== INDEXNOW_ADMIN_KEY) {
    return jsonResponse(res, 403, { ok: false, error: 'Invalid or missing admin key' });
  }

  // /submit-indexnow/sitemap → submit every URL in sitemap.xml
  if (urlPath === '/submit-indexnow/sitemap') {
    const results = await indexnow.submitFromSitemap();
    return jsonResponse(res, 200, { ok: true, mode: 'sitemap', results });
  }

  // /submit-indexnow?url=https://...&url=https://... → submit one or more URLs
  // Also accepts ?url=a,b,c (comma-separated) for convenience.
  if (urlPath === '/submit-indexnow') {
    const urls = [];
    for (const v of query.getAll('url')) {
      for (const part of v.split(',')) {
        const trimmed = part.trim();
        if (trimmed) urls.push(trimmed);
      }
    }
    if (urls.length === 0) {
      return jsonResponse(res, 400, {
        ok: false,
        error: 'Provide at least one ?url=... parameter',
        usage: '/submit-indexnow?key=ADMIN_KEY&url=https://geotagseditor.online/page/',
      });
    }
    // Force-submit the first URL (bypass dedup) so manual triggers always fire.
    if (urls.length === 1) {
      const result = await indexnow.forceSubmit(urls[0]);
      return jsonResponse(res, 200, { ok: result.ok !== false, mode: 'single', url: urls[0], result });
    }
    const results = await indexnow.submitUrls(urls);
    return jsonResponse(res, 200, { ok: true, mode: 'batch', count: urls.length, results });
  }

  return jsonResponse(res, 404, { ok: false, error: 'Unknown IndexNow endpoint' });
}

const server = http.createServer(async (req, res) => {
  const fullUrl = new URL(req.url, `http://${req.headers.host || HOST}`);
  let urlPath = fullUrl.pathname;
  const query = fullUrl.searchParams;

  // IndexNow management endpoints (auth-gated)
  if (urlPath === '/submit-indexnow' || urlPath === '/submit-indexnow/sitemap') {
    try {
      await handleIndexNow(req, res, urlPath, query);
    } catch (err) {
      jsonResponse(res, 500, { ok: false, error: err.message });
    }
    return;
  }

  if (BLOCKED_PATHS.has(urlPath)) {
    res.writeHead(404, { 'Content-Type': 'text/html', ...SECURITY_HEADERS });
    res.end('<h1>404 Not Found</h1>');
    return;
  }

  const rewrittenPath = REWRITES[urlPath];
  if (rewrittenPath) {
    urlPath = rewrittenPath;
  }

  if (urlPath === '/' || urlPath === '') {
    urlPath = '/index.html';
  }

  const filePath = path.join(__dirname, urlPath);

  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isFile()) {
      serveFile(filePath, res);
      return;
    }

    if (!err && stat.isDirectory()) {
      const indexPath = path.join(filePath, 'index.html');
      fs.stat(indexPath, (err2) => {
        if (!err2) {
          serveFile(indexPath, res);
        } else {
          res.writeHead(404, { 'Content-Type': 'text/html', ...SECURITY_HEADERS });
          res.end('<h1>404 Not Found</h1>');
        }
      });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/html', ...SECURITY_HEADERS });
    res.end('<h1>404 Not Found</h1>');
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
  // Start IndexNow file watcher + daily sitemap submission
  // (Disable in dev by setting INDEXNOW_DISABLE_WATCHER=1)
  if (process.env.INDEXNOW_DISABLE_WATCHER !== '1') {
    try {
      fileWatcher.start();
    } catch (err) {
      console.warn('[indexnow-watcher] Failed to start:', err.message);
    }
  } else {
    console.log('[indexnow-watcher] Disabled via INDEXNOW_DISABLE_WATCHER=1');
  }
});
