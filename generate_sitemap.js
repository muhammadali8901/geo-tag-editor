const fs = require('fs');
const path = require('path');

const domain = 'https://geotagseditor.online';
const root = __dirname;

function walk(dir) {
  let out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      entry.name === 'node_modules' ||
      entry.name.startsWith('.git') ||
      entry.name === 'attached_assets' ||
      entry.name === 'backup_assets'
    ) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out = out.concat(walk(full));
    } else if (/\.html?$/i.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function generateSitemap() {
  const htmlFiles = walk(root);
  console.log(`Found ${htmlFiles.length} HTML files to inspect...`);
  
  let entries = [];

  for (const file of htmlFiles) {
    const relPath = path.relative(root, file).replace(/\\/g, '/');

    // Skip utility blocks, templates, redirect files and 404
    const isExcluded =
      relPath.startsWith('partials/') ||
      relPath.startsWith('components/') ||
      relPath === '404.html' ||
      relPath === 'adsense-placements.html' ||
      relPath === 'test-coordinate-input.html';

    if (isExcluded) continue;

    const content = fs.readFileSync(file, 'utf8');
    
    // Skip if it contains noindex or is a redirect page
    if (content.includes('name="robots" content="noindex"') || content.includes('http-equiv="refresh"')) {
      continue;
    }

    // Determine clean URL route
    let route = '/' + relPath;
    if (route.endsWith('/index.html')) {
      route = route.slice(0, -'index.html'.length);
    } else if (route === '/index.html') {
      route = '/';
    } else if (route.endsWith('.html')) {
      route = route.slice(0, -5) + '/'; // enforce trailing slash
    }

    const fullUrl = domain + route;
    const stat = fs.statSync(file);
    const lastMod = stat.mtime.toISOString().split('T')[0];

    // Determine priority based on route depth and type
    let priority = '0.5';
    if (route === '/' || route === '/geo-tag-editor/' || route === '/add-gps-to-photo-online/') {
      priority = '1.0';
    } else if (route.startsWith('/blog/')) {
      priority = route === '/blog/' ? '0.8' : '0.7';
    } else if (route.startsWith('/features/') || route.startsWith('/bulk-geotag/')) {
      priority = '0.8';
    } else if (route.startsWith('/privacy-policy/') || route.startsWith('/terms/') || route.startsWith('/disclaimer/')) {
      priority = '0.3';
    }

    entries.push({
      url: fullUrl,
      lastMod: lastMod,
      priority: priority
    });
  }

  // Deduplicate and sort urls alphabetically
  const uniqueEntries = Array.from(new Map(entries.map(e => [e.url, e])).values())
    .sort((a, b) => a.url.localeCompare(b.url));

  let sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`;

  for (const entry of uniqueEntries) {
    sitemapContent += `  <url>
    <loc>${entry.url}</loc>
    <lastmod>${entry.lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${entry.priority}</priority>
  </url>\n`;
  }

  sitemapContent += `</urlset>\n`;

  fs.writeFileSync(path.join(root, 'sitemap.xml'), sitemapContent, 'utf8');
  console.log(`Sitemap compiled successfully! Total indexed pages: ${uniqueEntries.length}`);
}

generateSitemap();
