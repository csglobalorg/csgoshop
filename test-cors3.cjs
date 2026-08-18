const { JSDOM } = require("jsdom");
const dom = new JSDOM(\`<!DOCTYPE html><p>Hello world</p>\`, { url: "http://localhost/" });
const fetch = require("node-fetch");
async function test() {
  try {
    const res = await fetch('https://mohasagor.com.bd/api/reseller/product', {
      method: 'GET',
      headers: {
        'API-KEY': 'A8niclztH9JtzS4t',
        'SECRET-KEY': '2ff380917a11d3a7c97bcf6dddfb8adf38194c7d6b726ab12c4d0d5fb136fef8',
        'Origin': 'http://localhost'
      }
    });
    console.log("Status:", res.status);
    console.log("CORS:", res.headers.get("access-control-allow-origin"));
  } catch(e) {
    console.log(e);
  }
}
test();
