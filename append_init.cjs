const fs = require('fs');
fs.appendFileSync('script.js', `
// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    handleRoute();
    loadProducts();
});
`);
