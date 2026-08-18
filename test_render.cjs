const fs = require('fs');
const vm = require('vm');

(async () => {
    try {
        const fetch = (await import('node-fetch')).default;
        const res = await fetch('https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/get-products');
        const data = await res.json();
        
        let products = data;
        if (data.products) products = data.products;
        
        const content = fs.readFileSync('c:/Users/CS/OneDrive/Desktop/CSGO APP/script.js', 'utf-8');
        
        const context = vm.createContext({
            window: { location: { hash: '', search: '' }, addEventListener: () => {}, innerWidth: 1024 },
            document: { 
                getElementById: (id) => ({ style: {}, appendChild: () => {}, innerHTML: '', id }),
                createElement: () => ({ innerHTML: '' }),
                addEventListener: () => {},
                head: { appendChild: () => {} }
            },
            localStorage: { getItem: () => null, setItem: () => {} },
            URLSearchParams: global.URLSearchParams,
            console: console,
            setTimeout: setTimeout,
            setInterval: setInterval,
            products: products, // Inject real products!
            loadError: false,
            generateProductsHtml: (p) => "HTML"
        });
        
        // Remove 'const products = []' and 'let loadError = false' from script.js to avoid re-declaration errors in VM if we just inject them
        // Actually, we can just eval the script, the VM's global 'products' will be overwritten by the script's 'let products = []'.
        // Let's just execute renderHome inside the script directly by calling it.
        
        let modifiedContent = content + `\n
            products = ${JSON.stringify(products)};
            try {
                renderHome();
                console.log("RENDER HOME SUCCESS!");
            } catch(e) {
                console.log("RENDER HOME ERROR:", e.message, e.stack);
            }
        `;
        
        vm.runInContext(modifiedContent, context);
        
    } catch(e) {
        console.log("Test error:", e);
    }
})();
