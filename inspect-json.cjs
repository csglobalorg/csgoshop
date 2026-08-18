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
    const data = JSON.parse(rawData);
    console.log(Object.keys(data.products[0]));
    console.log(JSON.stringify(data.products[0], null, 2));
  });
});
