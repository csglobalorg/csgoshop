const fs = require('fs');

async function check() {
    try {
        const res = await fetch('https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/get-products');
        const data = await res.json();
        
        // Find some items with name "Premium Drop Shoulder T-Shirt"
        const items = data.products.filter(p => p.name === 'Premium Drop Shoulder T-Shirt').slice(0, 5);
        console.log(items.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            thumbnail_img: item.thumbnail_img,
            image: item.image,
            product_code: item.product_code
        })));
    } catch (e) {
        console.error(e);
    }
}

check();
