const https = require('https');

https.get('https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/get-products', (res) => {
  console.log('Status Code:', res.statusCode);
  let size = 0;
  res.on('data', chunk => size += chunk.length);
  res.on('end', () => console.log('Supabase Total size:', size));
});
