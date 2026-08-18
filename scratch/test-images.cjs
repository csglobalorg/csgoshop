const fs = require('fs');

async function testApiImages() {
    try {
        console.log("Fetching...");
        const response = await fetch('https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/get-products');
        const result = await response.json();
        console.log("Result keys:", Object.keys(result));
        
        let data = result;
        if (result.data) data = result.data;
        if (result.products) data = result.products;
        
        console.log("Is array?", Array.isArray(data));
        console.log("Type of data:", typeof data);
        
        if (Array.isArray(data)) {
             const p = data.find(p => p.product_images && (Array.isArray(p.product_images) ? p.product_images.length > 0 : p.product_images.length > 5)) || data[0];
             console.log("Sample product_images:", p.product_images);
        } else {
             console.log("Raw Data sample:", JSON.stringify(data).substring(0, 500));
        }

    } catch (e) {
        console.error("Error:", e);
    }
}
testApiImages();
