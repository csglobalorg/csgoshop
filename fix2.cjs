const fs = require('fs');
let content = fs.readFileSync('admin.js', 'utf8');

// Fix filterOrders
content = content.replace(
    "const searchTerm = document.getElementById('orderSearch').value.toLowerCase();",
    "const searchEl = document.getElementById('orderSearch'); if (!searchEl) return; const searchTerm = searchEl.value.toLowerCase();"
);

// Add fetchAndRenderProducts if missing
if (!content.includes('window.fetchAndRenderProducts')) {
    content += `\n
window.fetchAndRenderProducts = async function() {
    const tbody = document.getElementById('productsTableBody');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-8 text-center"><i class="fas fa-spinner fa-spin text-2xl text-blue-500"></i><br>Fetching latest catalog from APIs and DB...</td></tr>';
    
    try {
        const res = await fetch('https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/get-products?include_hidden=true');
        const data = await res.json();
        if (data.products) {
            cachedProducts = data.products;
            if (typeof renderProductsTable === 'function') {
                renderProductsTable(cachedProducts);
            }
        } else {
            throw new Error("No products returned");
        }
    } catch(err) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-8 text-center text-red-400">Failed to load products. ' + err.message + '</td></tr>';
    }
};
`;
}

fs.writeFileSync('admin.js', content, 'utf8');
console.log('Fixed admin.js');
