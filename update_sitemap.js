const fs = require('fs');

let sitemap = fs.readFileSync('sitemap.xml', 'utf8');

sitemap = sitemap.replace(/<image:title>(.*?)<\/image:title>/g, (match, p1) => {
    let clean = p1.replace(/\s*[-—|:]\s*/g, ' ');
    return '<image:title>' + clean + '</image:title>';
});

sitemap = sitemap.replace(/<image:caption>(.*?)<\/image:caption>/g, (match, p1) => {
    let clean = p1.replace(/\s*[-—|:]\s*/g, ' ');
    return '<image:caption>' + clean + '</image:caption>';
});

fs.writeFileSync('sitemap.xml', sitemap, 'utf8');
console.log('Sitemap updated.');
