const https = require('https');
https.get('https://api.allorigins.win/raw?url=' + encodeURIComponent('https://mohasagor.com.bd/api/reseller/product'), {
  headers: {
    'API-KEY': 'A8niclztH9JtzS4t',
    'SECRET-KEY': '2ff380917a11d3a7c97bcf6dddfb8adf38194c7d6b726ab12c4d0d5fb136fef8'
  }
}, (res) => {
  let size = 0;
  res.on('data', chunk => size += chunk.length);
  res.on('end', () => console.log('Allorigins size:', size));
});
