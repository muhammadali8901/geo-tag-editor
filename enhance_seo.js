const fs = require('fs');
const path = require('path');

const baseDir = 'c:/Users/Laptop Seller/Desktop/geo or genay do/geo-tag-editor';

// 1. Noindex utility pages
const dirs = ['disclaimer', 'features', 'privacy-policy', 'terms', 'sitemap'];
for (const dir of dirs) {
  const file = path.join(baseDir, dir, 'index.html');
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (!content.includes('noindex')) {
      content = content.replace(/<meta name="robots" content="[^"]*">/, '<meta name="robots" content="noindex, follow">');
      if (!content.includes('noindex')) {
         content = content.replace('</head>', '  <meta name="robots" content="noindex, follow">\n</head>');
      }
      fs.writeFileSync(file, content);
      console.log('Added noindex to ' + dir);
    }
  }
}

// 2. Enhance Blog Pages & Tools
const toolDirs = [
  'add-gps-to-photo-online',
  'remove-geotag-from-photo-online',
  'geotag-photos-online'
];
const blogDir = path.join(baseDir, 'blog');
let blogPages = [];
if (fs.existsSync(blogDir)) {
  blogPages = fs.readdirSync(blogDir).filter(d => fs.statSync(path.join(blogDir, d)).isDirectory());
}

const allPagesToEnhance = [
  ...toolDirs.map(d => path.join(baseDir, d, 'index.html')),
  ...blogPages.map(d => path.join(blogDir, d, 'index.html'))
];

for (const file of allPagesToEnhance) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    
    // Add Key Takeaways if not present and if it's an article/blog
    if (file.includes('blog') && !content.includes('Key Takeaways')) {
      const match = content.match(/(<h2[^>]*>.*?<\/h2>)/);
      if (match) {
        const takeaways = `
      <div style="background:var(--info-bg); border-left: 4px solid var(--primary); padding: 24px; border-radius: var(--radius-sm); margin: 32px 0;">
        <h3 style="margin-top:0; font-size: 1.25rem; color: var(--primary);">Key Takeaways</h3>
        <ul style="margin-bottom:0; color: var(--text-secondary);">
          <li>Geotagging adds GPS coordinates to your photo's EXIF metadata.</li>
          <li>Properly geotagged images can improve local SEO and organization.</li>
          <li>You can add, edit, or remove GPS data safely using our free online tool.</li>
          <li>Always consider privacy before sharing location-tagged photos publicly.</li>
        </ul>
      </div>
        `;
        content = content.replace(match[0], takeaways + '\n' + match[0]);
        changed = true;
      }
    }

    // Improve internal linking by bolding and linking generic terms if not linked
    // We will do a simple string replace for first occurrence of "free online tool"
    if (!content.includes('href="/geo-tag-editor/"') && file.includes('blog')) {
       // Just a check, the template already has links.
    }

    // Add author bio at the end of article content
    if (file.includes('blog') && !content.includes('author-bio')) {
      const bio = `
      <div class="author-bio" style="display:flex; align-items:center; gap: 20px; background: var(--bg-alt); padding: 24px; border-radius: var(--radius); margin-top: 48px;">
        <div style="width:80px; height:80px; border-radius:50%; background:var(--primary); display:flex; align-items:center; justify-content:center; color:#fff; font-size:2rem; font-weight:bold;">GT</div>
        <div>
          <h4 style="margin:0 0 8px; font-size: 1.2rem;">Geo Tags Editor Team</h4>
          <p style="margin:0; color: var(--text-secondary); font-size: 0.95rem;">Experts in digital photography metadata, EXIF data manipulation, and online privacy. We build fast, secure tools for photographers and developers.</p>
        </div>
      </div>
      `;
      content = content.replace('</article>', bio + '\n</article>');
      changed = true;
    }

    // Add FAQ Schema for blog posts that have H3 questions but no schema
    // Too complex to parse reliably, skipping.

    if (changed) {
      fs.writeFileSync(file, content);
      console.log('Enhanced content for ' + file);
    }
  }
}
