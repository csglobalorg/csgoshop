const fs = require('fs');
const lines = fs.readFileSync('C:/Users/CS/.gemini/antigravity-ide/brain/0b542af6-5f0e-4f90-88f3-904287f48217/.system_generated/logs/transcript_full.jsonl', 'utf8').split('\n');

// Find step 68 or 92 console logs
lines.forEach((l, idx) => {
    if (l.includes('"step_index":7200') || l.includes('test_live_website')) {
        console.log(`Index ${idx}`);
        try {
            const data = JSON.parse(l);
            console.log(data.content.substring(0, 1000));
        } catch (e) {
            console.log("Error parsing:", e);
        }
    }
});
