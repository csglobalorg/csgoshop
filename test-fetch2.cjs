const https = require('https');
https.get('https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/get-products', (res) => {
    console.log('statusCode:', res.statusCode);
    console.log('headers:', res.headers);
    let data = '';
    res.on('data', (d) => data += d);
    res.on('end', () => console.log('data:', data));
}).on('error', (e) => {
    console.error(e);
});
