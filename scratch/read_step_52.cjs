const fs = require('fs');
const lines = fs.readFileSync('C:/Users/CS/.gemini/antigravity-ide/brain/0b542af6-5f0e-4f90-88f3-904287f48217/.system_generated/logs/transcript_full.jsonl', 'utf8').split('\n');

lines.forEach((l, idx) => {
    if (l.includes('capture_browser_console_logs') && l.includes('"source":"SYSTEM"')) {
        console.log(`--- SYSTEM RESPONSE AT LINE ${idx} ---`);
        try {
            const data = JSON.parse(l);
            console.log(JSON.stringify(data, null, 2).substring(0, 2000));
        } catch (e) {
            console.log("Error parsing:", e);
        }
    }
});
