const puppeteer = require('puppeteer');

(async () => {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
        page.on('requestfailed', request => {
            console.log('REQUEST FAILED:', request.url(), request.failure().errorText);
        });
        page.on('response', response => {
            if (!response.ok()) {
                console.log('RESPONSE NOT OK:', response.url(), response.status());
            }
        });

        await page.goto('http://localhost:8080/');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await browser.close();
    } catch (e) {
        console.error("Puppeteer Script Error:", e);
    }
})();
