const fs = require('fs');
const path = require('path');

const baseDir = 'c:/Users/Laptop Seller/Desktop/geo or genay do/geo-tag-editor';
const blogDir = path.join(baseDir, 'blog');

let blogPages = [];
if (fs.existsSync(blogDir)) {
  blogPages = fs.readdirSync(blogDir).filter(d => fs.statSync(path.join(blogDir, d)).isDirectory());
}

for (const dir of blogPages) {
  const file = path.join(blogDir, dir, 'index.html');
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    if (!content.includes('Table of Contents')) {
      // Find all h2 tags
      const h2Regex = /<h2[^>]*>(.*?)<\/h2>/g;
      let match;
      const headings = [];
      let i = 0;
      
      // We will replace h2s with id-d h2s
      let newContent = content;
      
      while ((match = h2Regex.exec(content)) !== null) {
        const text = match[1];
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        headings.push({ text, id });
        
        // Add ID to H2 if not present
        if (!match[0].includes('id=')) {
          newContent = newContent.replace(match[0], `<h2 id="${id}">${text}</h2>`);
        }
      }

      if (headings.length > 0) {
        let toc = `
      <div style="background:var(--bg-alt); padding: 24px; border-radius: var(--radius-sm); margin: 32px 0; border: 1px solid var(--border);">
        <h3 style="margin-top:0; font-size: 1.25rem;">Table of Contents</h3>
        <ul style="margin-bottom:0; list-style: none; padding-left: 0;">
        `;
        for (const h of headings) {
          toc += `<li style="margin-bottom: 8px;"><a href="#${h.id}" style="color: var(--primary); text-decoration: none;">${h.text}</a></li>\n`;
        }
        toc += `</ul></div>`;
        
        // Insert TOC after the first paragraph following the H1 or at the beginning of article-content
        const articleMatch = newContent.match(/<div class="article-content">[\s\S]*?(<h2|<p>)/);
        if (articleMatch) {
           if (articleMatch[1] === '<p>') {
              // insert after the first p
              newContent = newContent.replace(/<div class="article-content">\s*<p>(.*?)<\/p>/, `<div class="article-content">\n      <p>$1</p>\n      ${toc}\n`);
           } else {
              // insert before the first h2
              newContent = newContent.replace('<div class="article-content">', `<div class="article-content">\n      ${toc}\n`);
           }
           content = newContent;
           changed = true;
        }
      }
    }

    if (changed) {
      fs.writeFileSync(file, content);
      console.log('Added TOC to ' + file);
    }
  }
}
