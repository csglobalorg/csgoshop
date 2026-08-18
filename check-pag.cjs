const https = require('https');

const tests = [
  'https://mohasagor.com.bd/api/reseller/product?page=1&limit=5',
  'https://mohasagor.com.bd/api/reseller/product?per_page=5',
  'https://mohasagor.com.bd/api/reseller/product?offset=0&limit=5'
];

tests.forEach((url, index) => {
  https.get(url, {
    headers: {
      'API-KEY': 'A8niclztH9JtzS4t',
      'SECRET-KEY': '2ff380917a11d3a7c97bcf6dddfb8adf38194c7d6b726ab12c4d0d5fb136fef8'
    }
  }, (res) => {
    let size = 0;
    res.on('data', chunk => size += chunk.length);
    res.on('end', () => console.log(`Test ${index} size:`, size));
  });
});
