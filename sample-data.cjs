const https = require('https');

https.get('https://mohasagor.com.bd/api/reseller/product', {
  headers: {
    'API-KEY': 'A8niclztH9JtzS4t',
    'SECRET-KEY': '2ff380917a11d3a7c97bcf6dddfb8adf38194c7d6b726ab12c4d0d5fb136fef8'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => {
    data += chunk.toString('utf8');
    if (data.length > 50000) res.destroy(); // Get a sample
  });
  res.on('close', () => {
    console.log(data.substring(0, 5000));
  });
});
