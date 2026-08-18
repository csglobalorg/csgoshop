const fs = require('fs');
let script = fs.readFileSync('script.js', 'utf8');
let fix = fs.readFileSync('fix.txt', 'utf8');

const start = script.indexOf('window.adminHandleCSVUpload = function(event)');
const end = script.indexOf('window.adminShowCategories = function()');

if (start !== -1 && end !== -1) {
    const newScript = script.substring(0, start) + fix + '\n\n' + script.substring(end);
    fs.writeFileSync('script.js', newScript, 'utf8');
    console.log('Fixed script!');
} else {
    console.log('Bounds not found', start, end);
}
