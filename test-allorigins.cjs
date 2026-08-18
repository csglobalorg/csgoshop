const https = require('https');

const targetUrl = 'https://mohasagor.com.bd/api/reseller/product';
const proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(targetUrl);

https.get(proxyUrl, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('Status:', res.statusCode);
      console.log('Contents length:', json.contents.length);
      console.log('Sample content:', json.contents.substring(0, 100));
    } catch (e) {
      console.log('Error parsing:', e.message);
      console.log('Raw data:', data.substring(0, 200));
    }
  });
}).on('error', e => console.error(e));
