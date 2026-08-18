const fs = require('fs'); let content = fs.readFileSync('admin.js', 'utf8'); content = content.replace(/\\\/g, '\').replace(/\\\$/g, '$'); fs.writeFileSync('admin.js', content);
