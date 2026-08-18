import fs from 'fs';

let content = fs.readFileSync('admin.js', 'utf8');

// 1. Add View Products & Move Logic
const advancedCategoryCode = `
window.catProducts = null;
window.loadCategoryProducts = async function() {
    if (!window.catProducts) {
        const { data: { session } } = await window.supabase.auth.getSession();
        const pRes = await fetch('https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/get-products?include_hidden=true');
        const pData = await pRes.json();
        window.catProducts = pData.products || [];
    }
    return window.catProducts;
}

window.viewCategoryProducts = async function(level, name1, name2 = null, name3 = null) {
    const btn = event.currentTarget;
    const oldHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    try {
        const products = await loadCategoryProducts();
        
        let filtered = products.filter(p => p.category && p.category.trim() === name1.trim());
        if (level >= 2 && name2) {
            filtered = filtered.filter(p => p.subcategory && p.subcategory.trim() === name2.trim());
        }
        if (level === 3 && name3) {
            filtered = filtered.filter(p => p.sub_subcategory && p.sub_subcategory.trim() === name3.trim());
        }
        
        showProductMoverModal(filtered, level, name1, name2, name3);
    } catch(e) {
        alert('Failed to load products: ' + e.message);
    } finally {
        btn.innerHTML = oldHtml;
    }
}

window.showProductMoverModal = function(products, level, name1, name2, name3) {
    let modal = document.getElementById('productMoverModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'productMoverModal';
        modal.className = 'fixed inset-0 z-50 bg-gray-900 bg-opacity-95 flex items-center justify-center backdrop-blur-sm';
        document.body.appendChild(modal);
    }
    
    let path = name1;
    if (name2) path += ' > ' + name2;
    if (name3) path += ' > ' + name3;
    
    // Generate Tree for Destination Select
    const level1 = cachedCategories.filter(c => c.level === 1);
    const level2 = cachedCategories.filter(c => c.level === 2);
    const level3 = cachedCategories.filter(c => c.level === 3);
    
    let destOptions = '<option value="">-- Select Destination --</option>';
    level1.forEach(c1 => {
        destOptions += \`<option value="\${c1.name}|">📁 \${c1.name}</option>\`;
        level2.filter(c => c.parent_id === c1.id).forEach(c2 => {
            destOptions += \`<option value="\${c1.name}|\${c2.name}">-- 📂 \${c2.name}</option>\`;
            level3.filter(c => c.parent_id === c2.id).forEach(c3 => {
                destOptions += \`<option value="\${c1.name}|\${c2.name}|\${c3.name}">---- 📄 \${c3.name}</option>\`;
            });
        });
    });

    modal.innerHTML = \`
        <div class="bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] border border-gray-700 flex flex-col transform transition-all m-4">
            <div class="flex justify-between items-center p-6 border-b border-gray-700 bg-gray-800 rounded-t-xl">
                <div>
                    <h3 class="text-2xl font-bold text-white">Manage Products in Category</h3>
                    <p class="text-sm text-gray-400 mt-1">\${path} (\${products.length} items)</p>
                </div>
                <button onclick="document.getElementById('productMoverModal').classList.add('hidden')" class="text-gray-400 hover:text-white text-2xl"><i class="fas fa-times"></i></button>
            </div>
            
            <div class="flex-1 overflow-y-auto p-6 bg-gray-900">
                <div class="mb-4 flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-sm gap-4">
                    <div class="flex items-center space-x-4">
                        <label class="flex items-center text-gray-300 hover:text-white cursor-pointer">
                            <input type="checkbox" id="selectAllProds" class="w-5 h-5 mr-3 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500" onchange="toggleAllProds(this)">
                            <span class="font-semibold">Select All</span>
                        </label>
                        <span id="selectedCount" class="text-blue-400 font-semibold px-3 py-1 bg-blue-900 bg-opacity-30 rounded-full text-sm whitespace-nowrap">0 selected</span>
                    </div>
                    
                    <div class="flex items-center space-x-3 w-full md:w-auto">
                        <select id="moveDestination" class="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64 truncate">
                            \${destOptions}
                        </select>
                        <button onclick="executeBulkMove()" class="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold px-6 py-2 rounded-lg shadow-lg transition flex items-center whitespace-nowrap">
                            <i class="fas fa-truck-moving mr-2"></i> Move
                        </button>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4" id="prodGrid">
                    \${products.map(p => \`
                        <div class="bg-gray-800 border border-gray-700 rounded-lg p-3 flex flex-col relative group hover:border-blue-500 transition cursor-pointer" onclick="document.getElementById('chk_\${p.id}').click()">
                            <input type="checkbox" id="chk_\${p.id}" value="\${p.id}" class="prod-chk absolute top-2 right-2 w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 z-10" onclick="event.stopPropagation(); updateSelectedCount()">
                            <img src="\${p.thumbnail_img || '/placeholder.png'}" class="w-full h-24 object-contain mb-2 rounded bg-white p-1">
                            <h4 class="text-sm font-semibold text-white truncate" title="\${p.name}">\${p.name}</h4>
                            <p class="text-xs text-blue-400 mt-1">\${p.price} BDT</p>
                        </div>
                    \`).join('')}
                    \${products.length === 0 ? '<div class="col-span-full py-12 text-center text-gray-400 text-lg">No products found in this category.</div>' : ''}
                </div>
            </div>
        </div>
    \`;
    modal.classList.remove('hidden');
}

window.toggleAllProds = function(cb) {
    document.querySelectorAll('.prod-chk').forEach(c => c.checked = cb.checked);
    updateSelectedCount();
}

window.updateSelectedCount = function() {
    const cnt = document.querySelectorAll('.prod-chk:checked').length;
    document.getElementById('selectedCount').innerText = cnt + ' selected';
}

window.executeBulkMove = async function() {
    const selected = Array.from(document.querySelectorAll('.prod-chk:checked')).map(c => c.value);
    if (selected.length === 0) {
        alert('Select at least one product to move.');
        return;
    }
    
    const dest = document.getElementById('moveDestination').value;
    if (!dest) {
        alert('Please select a destination category.');
        return;
    }
    
    const parts = dest.split('|');
    const cat = parts[0] || null;
    const subcat = parts[1] || null;
    const subsubcat = parts[2] || null;
    
    if (!confirm(\`Are you sure you want to move \${selected.length} products to \${cat} \${subcat ? '> '+subcat : ''}?\`)) return;
    
    const btn = event.currentTarget;
    const oldHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Moving...';
    btn.disabled = true;
    
    try {
        const { data: { session } } = await window.supabase.auth.getSession();
        
        const updates = { category: cat, subcategory: subcat, sub_subcategory: subsubcat };
        
        // Supabase bulk update using IN filter
        const res = await fetch(\`https://sdbgeuyzepwnxpresktm.supabase.co/rest/v1/products?id=in.(\${selected.join(',')})\`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': \`Bearer \${session.access_token}\`,
                'apikey': SUPABASE_ANON_KEY,
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify(updates)
        });
        
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Bulk update failed');
        }
        
        alert(\`Successfully moved \${selected.length} products!\`);
        
        // Invalidate product cache so it reloads fresh
        window.catProducts = null; 
        document.getElementById('productMoverModal').classList.add('hidden');
        
    } catch (e) {
        alert('Error: ' + e.message);
    } finally {
        btn.innerHTML = oldHtml;
        btn.disabled = false;
    }
}
`;

// Inject this block into admin.js, right before renderCategoryTree
content = content.replace('function renderCategoryTree() {', advancedCategoryCode + '\n\nfunction renderCategoryTree() {');

// 2. Modify renderCategoryTree to be Premium and include "View Products" buttons
let treeHtmlPatch = `
    let html = '';
    level1.forEach(cat => {
        const children = level2.filter(c => c.parent_id === cat.id);
        const statusBadge = cat.is_active
            ? '<span class="text-xs bg-green-500 bg-opacity-20 text-green-400 px-2 py-1 rounded border border-green-500/30">Active</span>'
            : '<span class="text-xs bg-red-500 bg-opacity-20 text-red-400 px-2 py-1 rounded border border-red-500/30">Hidden</span>';
        
        html += \`
        <div class="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition duration-300">
            <!-- Level 1 Header -->
            <div class="flex flex-col md:flex-row md:items-center justify-between px-6 py-4 bg-gradient-to-r from-gray-800 to-gray-750 border-b border-gray-700 gap-4">
                <div class="flex items-center space-x-4">
                    <div class="w-10 h-10 rounded-full bg-blue-900 bg-opacity-30 flex items-center justify-center border border-blue-500/30">
                        <i class="fas fa-folder text-blue-400 text-lg"></i>
                    </div>
                    <div>
                        <div class="flex items-center space-x-3">
                            <span class="font-bold text-white text-lg">\${cat.name}</span>
                            \${statusBadge}
                        </div>
                        <p class="text-sm text-gray-400 mt-0.5">\${children.length} Subcategories</p>
                    </div>
                </div>
                <div class="flex items-center flex-wrap gap-2">
                    <button onclick="viewCategoryProducts(1, '\${cat.name}')" class="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded-lg transition border border-gray-600 shadow-sm flex items-center">
                        <i class="fas fa-box-open mr-2 text-blue-400"></i> <span>Manage</span>
                    </button>
                    <div class="h-6 w-px bg-gray-600 hidden sm:block mx-1"></div>
                    <button onclick="openCatModal('\${cat.id}')" class="text-blue-400 hover:text-blue-300 text-sm p-2 rounded-lg hover:bg-gray-700 transition"><i class="fas fa-edit"></i></button>
                    <button onclick="openCatModal(null, null, '\${cat.id}', 2)" class="text-green-400 hover:text-green-300 text-sm p-2 rounded-lg hover:bg-gray-700 transition" title="Add Subcategory"><i class="fas fa-plus"></i></button>
                    <button onclick="deleteCategory('\${cat.id}', '\${cat.name}')" class="text-red-400 hover:text-red-300 text-sm p-2 rounded-lg hover:bg-gray-700 transition"><i class="fas fa-trash"></i></button>
                </div>
            </div>\`;
        
        if (children.length > 0) {
            html += \`<div class="divide-y divide-gray-700/50">\`;
            children.forEach(sub => {
                const grandchildren = level3.filter(c => c.parent_id === sub.id);
                const subStatus = sub.is_active ? '' : '<span class="text-xs bg-red-900 text-red-300 px-2 py-0.5 rounded">Hidden</span>';
                html += \`
                    <div class="px-3 sm:px-6 py-3 bg-gray-800/80 hover:bg-gray-750 transition">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between ml-4 sm:ml-10 border-l-2 border-gray-600 pl-4 py-2 gap-3">
                            <div class="flex items-center flex-wrap gap-2">
                                <i class="fas fa-folder-open text-blue-400/70 text-sm hidden sm:inline"></i>
                                <span class="text-gray-200 font-medium">\${sub.name}</span>
                                \${subStatus}
                                <span class="text-xs text-gray-500 bg-gray-900 px-2 py-1 rounded-full border border-gray-700">\${grandchildren.length} sub</span>
                            </div>
                            <div class="flex items-center flex-wrap gap-1 opacity-90 hover:opacity-100 transition">
                                <button onclick="viewCategoryProducts(2, '\${cat.name}', '\${sub.name}')" class="text-blue-300 hover:text-blue-200 text-xs px-3 py-1.5 rounded hover:bg-gray-700 border border-gray-600 transition mr-1 sm:mr-2 flex items-center">
                                    <i class="fas fa-box text-[10px] mr-1.5"></i> <span>Products</span>
                                </button>
                                <button onclick="openCatModal('\${sub.id}')" class="text-blue-400 hover:text-blue-300 text-sm p-1.5 rounded hover:bg-gray-700"><i class="fas fa-edit"></i></button>
                                <button onclick="openCatModal(null, null, '\${sub.id}', 3)" class="text-green-400 hover:text-green-300 text-sm p-1.5 rounded hover:bg-gray-700" title="Add Sub-subcategory"><i class="fas fa-plus"></i></button>
                                <button onclick="deleteCategory('\${sub.id}', '\${sub.name}')" class="text-red-400 hover:text-red-300 text-sm p-1.5 rounded hover:bg-gray-700"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                        \${grandchildren.length > 0 ? \`
                        <div class="ml-8 sm:ml-16 mt-2 space-y-1.5">
                            \${grandchildren.map(gc => \`
                            <div class="flex flex-col sm:flex-row sm:items-center justify-between py-2 px-3 sm:px-4 bg-gray-900/50 rounded-lg border border-gray-700 hover:border-gray-600 transition gap-2">
                                <div class="flex items-center flex-wrap gap-2 border-l-2 border-gray-500 pl-3">
                                    <i class="fas fa-tag text-gray-500 text-xs hidden sm:inline"></i>
                                    <span class="text-gray-300 text-sm font-medium">\${gc.name}</span>
                                    \${gc.is_active ? '' : '<span class="text-xs bg-red-900 text-red-300 px-1.5 py-0.5 rounded">Hidden</span>'}
                                </div>
                                <div class="flex items-center flex-wrap gap-1">
                                    <button onclick="viewCategoryProducts(3, '\${cat.name}', '\${sub.name}', '\${gc.name}')" class="text-blue-300 hover:text-blue-200 text-xs px-2 py-1 rounded hover:bg-gray-700 border border-gray-600 transition mr-1 sm:mr-2 flex items-center">
                                        <i class="fas fa-box text-[10px] mr-1"></i> <span>Products</span>
                                    </button>
                                    <button onclick="openCatModal('\${gc.id}')" class="text-blue-400 hover:text-blue-300 text-xs p-1.5 rounded hover:bg-gray-600"><i class="fas fa-edit"></i></button>
                                    <button onclick="deleteCategory('\${gc.id}', '\${gc.name}')" class="text-red-400 hover:text-red-300 text-xs p-1.5 rounded hover:bg-gray-600"><i class="fas fa-trash"></i></button>
                                </div>
                            </div>\`).join('')}
                        </div>\` : ''}
                    </div>\`;
            });
            html += \`</div>\`;
        }
        html += \`</div>\`;
    });
    
    tree.innerHTML = html;
`;

const renderCatMatch = content.match(/let html = '';\s*level1\.forEach[\s\S]*tree\.innerHTML = html;/);
if (renderCatMatch) {
    content = content.replace(renderCatMatch[0], treeHtmlPatch);
} else {
    console.error('Could not find renderCategoryTree body');
}

fs.writeFileSync('admin.js', content);
console.log('Successfully patched admin.js');
