const https = require('https');

https.get('https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/get-products', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk.toString('utf8'));
  res.on('end', () => console.log('End with characters:', data.substring(data.length - 100)));
});
