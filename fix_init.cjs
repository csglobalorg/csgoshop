const fs = require('fs');
let code = fs.readFileSync('script.js', 'utf8');

// Remove the event listener I just added
code = code.replace(/\n\/\/ Initial Load\ndocument\.addEventListener\('DOMContentLoaded', \(\) => \{\n    handleRoute\(\);\n    loadProducts\(\);\n\}\);\n/g, '');

// Append direct execution if we're in the browser environment
code += `
// Initialize app if in browser environment
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            handleRoute();
            loadProducts();
        });
    } else {
        handleRoute();
        loadProducts();
    }
}
`;

fs.writeFileSync('script.js', code);
console.log('Appended initialization code.');
