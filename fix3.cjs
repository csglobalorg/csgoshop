const fs = require('fs');
let content = fs.readFileSync('admin.js', 'utf8');

const additionalFunctions = `
window.closeEditModal = function() {
    document.getElementById('editProductModal').classList.add('hidden');
};

window.handleProductEditSubmit = async function(e) {
    e.preventDefault();
    const id = document.getElementById('editProductId').value;
    const name = document.getElementById('editName').value;
    const price = document.getElementById('editPrice').value;
    const isHidden = document.getElementById('editVisibility').value === 'true';
    const cat = document.getElementById('editCat').value;
    const subcat = document.getElementById('editSubcat').value;
    const subsubcat = document.getElementById('editSubsubcat').value;
    const isBanned = document.getElementById('editBanned').value === 'true';

    try {
        const payload = {
            id,
            override_name: name || null,
            custom_price: price ? parseFloat(price) : null,
            is_hidden: isHidden,
            override_category: cat || null,
            override_subcategory: subcat || null,
            override_sub_subcategory: subsubcat || null,
            is_banned: isBanned
        };
        const res = await adminFetch('update_product', payload);
        alert('Product updated successfully!');
        closeEditModal();
        fetchAndRenderProducts(); // refresh
    } catch(err) {
        alert('Error updating product: ' + err.message);
    }
};
`;

if (!content.includes('window.closeEditModal = function')) {
    content += additionalFunctions;
    fs.writeFileSync('admin.js', content, 'utf8');
    console.log('Fixed admin.js (added missing modal functions)');
} else {
    console.log('Already added');
}
