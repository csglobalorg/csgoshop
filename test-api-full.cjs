const https = require('https');

const options = {
  hostname: 'mohasagor.com.bd',
  path: '/api/reseller/product',
  method: 'GET',
  headers: {
    'API-KEY': 'A8niclztH9JtzS4t',
    'SECRET-KEY': '2ff380917a11d3a7c97bcf6dddfb8adf38194c7d6b726ab12c4d0d5fb136fef8'
  }
};

const req = https.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
      const json = JSON.parse(data);
      console.log(JSON.stringify(json.products[0], null, 2));
  });
});

req.on('error', error => console.error(error));
req.end();
