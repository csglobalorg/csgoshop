const https = require('https');

const targetUrl = encodeURIComponent('https://mohasagor.com.bd/api/reseller/product');
const options = {
  hostname: 'corsproxy.io',
  path: '/?' + targetUrl,
  method: 'GET',
  headers: {
    'API-KEY': 'A8niclztH9JtzS4t',
    'SECRET-KEY': '2ff380917a11d3a7c97bcf6dddfb8adf38194c7d6b726ab12c4d0d5fb136fef8',
    'Origin': 'https://example.com'
  }
};

const req = https.request(options, res => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Body:', data.substring(0, 200)));
});

req.on('error', error => console.error(error));
req.end();
