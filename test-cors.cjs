const https = require('https');

const options = {
  hostname: 'mohasagor.com.bd',
  path: '/api/reseller/product',
  method: 'OPTIONS',
  headers: {
    'Origin': 'https://example.com',
    'Access-Control-Request-Method': 'GET'
  }
};

const req = https.request(options, res => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);
});

req.on('error', error => console.error(error));
req.end();
