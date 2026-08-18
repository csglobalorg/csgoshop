const fs = require('fs');
let c = fs.readFileSync('script.js', 'utf8');

// Remove existing declarations to avoid "document.getElementById(...) = document.getElementById(...)"
c = c.replace(/const mainContent = document\.getElementById\('main-content'\);/g, '');

// Safely replace mainContent usages (that are not part of strings or properties if possible, but regex boundary works)
c = c.replace(/\bmainContent\b/g, "document.getElementById('main-content')");

fs.writeFileSync('script.js', c);
console.log('Successfully replaced mainContent references.');
