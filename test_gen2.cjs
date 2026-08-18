const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const dom = new JSDOM('<!DOCTYPE html><html lang="en"><body><main id="main-content"><div id="skeleton-container"></div></main></body></html>', {
  url: 'http://localhost/'
});

global.window = dom.window;
global.document = dom.window.document;
global.localStorage = {
  getItem: () => '[]',
  setItem: () => {}
};
global.CookieHelper = { get: () => null, set: () => {} };
global.supabase = null;
global.navigator = dom.window.navigator;

const scriptContent = fs.readFileSync('c:/Users/CS/OneDrive/Desktop/CSGO APP/script.js', 'utf-8');

try {
  eval(scriptContent);
  
  // Mock globals needed for renderHome
  global.products = [
    { id: '1', name: 'Test Product 1', price: 100, originalPrice: 150, category: 'Tech', isTrending: true, badge: 'new' }
  ];
  global.categories = [{ name: 'Tech', displayName: 'Tech', icon: 'fas fa-laptop' }];
  global.mainContent = document.getElementById('main-content');
  
  // Call renderHome
  renderHome();
  console.log("Number of product cards: " + document.querySelectorAll('.product-card').length);
} catch (e) {
  console.error('ERROR DURING EXECUTION:', e);
}
