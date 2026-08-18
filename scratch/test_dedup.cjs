const fs = require('fs');

async function check() {
    try {
        console.log('Fetching products from API...');
        const res = await fetch('https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/get-products');
        const data = await res.json();
        console.log('Raw products count:', data.products?.length);

        function parsePrice(p) {
            if (!p) return 0;
            if (typeof p === 'number') return p;
            return parseFloat(p.toString().replace(/[^0-9.]/g, '')) || 0;
        }

        const productsMap = new Map();
        for (const p of data.products) {
            let category = p.category ? p.category.trim() : 'Others';
            if (category === "Woman's Fashion") category = "Women's Fashion";
            let originalImageUrl = (p.thumbnail_img || p.image || '').trim();
            const name = p.name || '';
            const priceKey = parsePrice(p.price) || 0;
            let imageKey = 'noimg';
            if (originalImageUrl) {
                try { imageKey = originalImageUrl.split('/').pop(); } catch(e) {}
            }
            const dedupKey = `${name.toLowerCase().trim()}_${priceKey}_${imageKey}`;
            if (!productsMap.has(dedupKey)) {
                productsMap.set(dedupKey, p);
            }
        }
        console.log('Processed unique products count (with fix):', productsMap.size);
    } catch (e) {
        console.error(e);
    }
}

check();
