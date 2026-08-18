const https = require('https');

https.get('https://mohasagor.com.bd/api/reseller/product', {
  headers: {
    'API-KEY': 'A8niclztH9JtzS4t',
    'SECRET-KEY': '2ff380917a11d3a7c97bcf6dddfb8adf38194c7d6b726ab12c4d0d5fb136fef8'
  }
}, (res) => {
  let rawData = '';
  res.on('data', chunk => rawData += chunk);
  res.on('end', () => {
    try {
      const data = JSON.parse(rawData);
      console.log('Original items:', data.products?.length);
      console.log('Original size (bytes):', rawData.length);
      
      if (data.products) {
        // Try mapping
        const minified = data.products.map(p => ({
            id: p.id,
            name: p.name,
            c: p.category, // map short keys?
            t: p.thumbnail_img,
            p: p.price,
            s: p.sale_price,
            v: p.product_variants,
            i: p.product_images
            // Omit details perhaps? Wait, details are needed. 
        }));
        const strippedJSON = JSON.stringify(minified);
        console.log('Without details size (bytes):', strippedJSON.length);
        
        let totalDetailsLength = 0;
        data.products.forEach(p => { if (p.details) totalDetailsLength += p.details.length });
        console.log('Total characters in details fields:', totalDetailsLength);
      }
    } catch(e) {
      console.error(e.message);
    }
  });
});
