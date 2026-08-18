const { JSDOM } = require('jsdom');
const fs = require('fs');

const dom = new JSDOM(fs.readFileSync('index.html', 'utf8'), { runScripts: 'dangerously' });
const script = fs.readFileSync('script.js', 'utf8');

// Mock fetch and URLSearchParams for JSDOM
dom.window.fetch = async () => ({
    ok: true,
    json: async () => ({})
});
dom.window.URLSearchParams = URLSearchParams;
dom.window.indexedDB = { open: () => ({ onsuccess: () => {}, onerror: () => {}, onupgradeneeded: () => {} }) };

try {
    dom.window.eval(script);
    console.log('Script evaluated OK');
    if (typeof dom.window.loadProducts === 'function') {
        dom.window.loadProducts().then(() => console.log('loadProducts finished')).catch(console.error);
    } else {
        console.log('loadProducts is not defined globally');
    }
} catch(e) {
    console.error('Eval error:', e);
}
