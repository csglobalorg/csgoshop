const fs = require('fs');
['index.html', 'admin.html'].forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    if (!content.includes('favicon.png')) {
        content = content.replace('<head>', '<head>\n    <link rel="icon" type="image/png" href="/favicon.png">');
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated ${file}`);
    }
});
