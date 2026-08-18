const fs = require('fs');
const lines = fs.readFileSync('C:/Users/CS/.gemini/antigravity-ide/brain/0b542af6-5f0e-4f90-88f3-904287f48217/.system_generated/logs/transcript_full.jsonl', 'utf8').split('\n');

// Find all logs related to "console_logs"
lines.forEach((l, idx) => {
    if (l.includes('"type":"BROWSER_SUBAGENT"') && l.includes('console')) {
        console.log(`--- Index ${idx} ---`);
        try {
            const data = JSON.parse(l);
            console.log(data.content);
        } catch (e) {
            console.log("Could not parse line:", l.substring(0, 200));
        }
    }
});
