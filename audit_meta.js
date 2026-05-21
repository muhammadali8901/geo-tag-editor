const fs = require('fs');
const path = require('path');

const baseDir = '.';
const htmlFiles = [];

function findHtmlFiles(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            findHtmlFiles(fullPath);
        } else if (file === 'index.html' && !fullPath.includes('node_modules')) {
            htmlFiles.push(fullPath);
        }
    }
}

findHtmlFiles(baseDir);

const data = {};

for (const file of htmlFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const titleMatch = content.match(/<title>([\s\S]*?)<\/title>/i);
    const descMatch = content.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']/i);
    
    data[file] = {
        title: titleMatch ? titleMatch[1].trim() : '',
        description: descMatch ? descMatch[1].trim() : ''
    };
}

fs.writeFileSync('meta_audit.json', JSON.stringify(data, null, 2));
console.log('Done auditing ' + htmlFiles.length + ' files');
