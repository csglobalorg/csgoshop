const https = require('https');

const headersToTry = [
  { 'API-KEY': 'A8niclztH9JtzS4t', 'SECRET-KEY': '2ff380917a11d3a7c97bcf6dddfb8adf38194c7d6b726ab12c4d0d5fb136fef8' },
  { 'api_key': 'A8niclztH9JtzS4t', 'secret_key': '2ff380917a11d3a7c97bcf6dddfb8adf38194c7d6b726ab12c4d0d5fb136fef8' },
  { 'x-api-key': 'A8niclztH9JtzS4t', 'x-secret-key': '2ff380917a11d3a7c97bcf6dddfb8adf38194c7d6b726ab12c4d0d5fb136fef8' },
];

function testApi(headers, index) {
  const options = {
    hostname: 'mohasagor.com.bd',
    path: '/api/reseller/product',
    method: 'GET',
    headers: headers
  };

  const req = https.request(options, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log(`\n--- Test ${index} ---`);
        console.log('Headers:', headers);
        console.log('Status:', res.statusCode);
        console.log('Body:', data.substring(0, 300));
    });
  });

  req.on('error', error => console.error(error));
  req.end();
}

headersToTry.forEach((h, i) => testApi(h, i));
