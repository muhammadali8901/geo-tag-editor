const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5000;
const HOST = '0.0.0.0';

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

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];

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
});
