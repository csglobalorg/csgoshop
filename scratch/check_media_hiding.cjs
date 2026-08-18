const fs = require('fs');
const lines = fs.readFileSync('style.css', 'utf8').split('\n');
lines.forEach((l, idx) => {
    if (l.includes('display: none') || l.includes('display:none')) {
        console.log(`Line ${idx + 1}: ${l}`);
        for (let i = Math.max(0, idx - 4); i < Math.min(lines.length, idx + 5); i++) {
            console.log(`   ${i + 1}: ${lines[i]}`);
        }
        console.log('------------------');
    }
});
