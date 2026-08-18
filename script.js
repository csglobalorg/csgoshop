
let products = [];
let cart = JSON.parse(localStorage.getItem('csgo_cart')) || [];
let loadError = false;
let isFirstLoad = true;
let homeDiscoverPage = 1;
let homeDiscoverList = [];

// IndexedDB Cache Setup
const DB_NAME = 'CSGO_SHOP_DB';
const DB_VERSION = 1;
const STORE_NAME = 'products_cache';

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
}

async function getCachedProducts(key = 'all_products_v2') {
    try {
        const db = await initDB();
        return new Promise((resolve) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(key);
            request.onsuccess = () => {
                const data = request.result;
                // Cache valid for 12 hours
                if (data && (Date.now() - data.timestamp < 12 * 60 * 60 * 1000)) {
                    resolve(data.products);
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => resolve(null);
        });
    } catch (e) {
        return null;
    }
}

async function deleteOldCache(key = 'all_products') {
    try {
        const db = await initDB();
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.delete(key);
    } catch (e) {}
}

async function setCachedProducts(productsData) {
    try {
        const db = await initDB();
        return new Promise((resolve) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            store.put({ timestamp: Date.now(), products: productsData }, 'all_products_v2');
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => resolve();
        });
    } catch (e) {
        // ignore
    }
}

window.handleMobileSearch = function() {
    const query = document.getElementById('mobile-search-input').value.trim();
    if (query) {
        document.getElementById('mobile-search-input').value = '';
        toggleMobileSearch(); // close the bar first
        navigateTo('search', query);
    }
}

window.toggleMobileSearch = function() {
    const searchBar = document.getElementById('mobile-search-bar');
    if (searchBar.style.display === 'none' || searchBar.style.display === '') {
        searchBar.style.display = 'block';
        document.getElementById('mobile-search-input').focus();
    } else {
        searchBar.style.display = 'none';
    }
}
async function apiFetch(url, options = {}, retries = 2) {
    // We fetch directly from Supabase via CORS. Added retry logic for edge function intermittent failures.
    for (let i = 0; i <= retries; i++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
            const fetchOptions = { ...options, signal: controller.signal };
            
            const response = await fetch(url, fetchOptions);
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            console.warn(`apiFetch attempt ${i + 1} failed:`, error.message);
            if (i === retries) throw error;
            // Wait 1 second before retrying
            await new Promise(res => setTimeout(res, 1000));
        }
    }
}

function hideLoader() {
    const loader = document.getElementById('loader');
    if (loader && loader.style.display !== 'none') {
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 500);
    }
}

// Function to load products from API


// Safe Numeric Parser
const parsePrice = (val) => {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return isFinite(val) ? val : 0;
    if (typeof val === 'string') {
        if (val.includes('%') || val.toLowerCase().includes('free') || val.toLowerCase() === 'n/a') return 0;
        let s = val.replace(/,/g, ''); 
        s = s.replace(/[^\d.]/g, ' '); 
        const matches = s.trim().split(/\s+/);
        if (matches.length !== 1) return 0; 
        if (matches[0] === '') return 0;
        const parsed = parseFloat(matches[0]);
        return isFinite(parsed) && parsed >= 0 ? parsed : 0;
    }
    return 0;
};

function processProductsData(data) {
    if (data && data.status === 200 && data.products) {
        const productsMap = new Map();
        for (const p of data.products) {
            try {
                let category = p.category ? p.category.trim() : "Others";
                if (category === "Woman's Fashion") category = "Women's Fashion";
                if (category === "Home & Life Style") category = "Home & Lifestyle";
                if (category === "Gedgets & Electronics") category = "Gadgets & Electronics";

                let originalImageUrl = (p.thumbnail_img || p.image || "").trim();
                
                // Safe legacy wsrv.nl URL recovery
                if (originalImageUrl.includes('wsrv.nl') && originalImageUrl.includes('url=')) {
                    try {
                        const urlObj = new URL(originalImageUrl);
                        const nestedUrl = urlObj.searchParams.get('url');
                        if (nestedUrl && nestedUrl.startsWith('http')) {
                            originalImageUrl = nestedUrl; // recovered pure source
                        }
                    } catch (e) {}
                }

                let thumbnailImageUrl = originalImageUrl;
                let detailImageUrl = originalImageUrl;

                if (originalImageUrl.startsWith('http') && !originalImageUrl.includes('wsrv.nl')) {
                    const encodedUrl = encodeURIComponent(originalImageUrl);
                    thumbnailImageUrl = 'https://wsrv.nl/?url=' + encodedUrl + '&w=600&q=90&fit=contain&output=webp';
                    detailImageUrl = 'https://wsrv.nl/?url=' + encodedUrl + '&w=1200&q=90&fit=contain&output=webp';
                } else if (originalImageUrl.includes('wsrv.nl')) {
                    thumbnailImageUrl = originalImageUrl.replace(/&w=\d+/, '&w=600').replace(/&h=\d+/, '').replace(/&fit=\w+/, '&fit=contain');
                    detailImageUrl = originalImageUrl.replace(/&w=\d+/, '&w=1200').replace(/&h=\d+/, '').replace(/&fit=\w+/, '&fit=contain');
                }

                let variants = null;
                if (p.product_variants && p.product_variants.length > 0) {
                    variants = {};
                    p.product_variants.forEach(v => {
                        if (!variants[v.attribute]) variants[v.attribute] = [];
                        if (!variants[v.attribute].includes(v.variant)) {
                            variants[v.attribute].push(v.variant);
                        }
                    });
                } else {
                    if (category.includes("Fashion")) {
                        variants = { Size: ['M', 'L', 'XL', 'XXL'], Color: ['Black', 'White', 'Navy Blue'] };
                    } else if (category.includes("Gadgets")) {
                        variants = { Color: ['Black', 'Silver'] };
                    }
                }

                const regularPriceNumeric = parsePrice(p.price);
                const salePriceNumeric = parsePrice(p.sale_price);
                const hasValidDiscount = regularPriceNumeric > 0 && salePriceNumeric > 0 && regularPriceNumeric > salePriceNumeric;
                
                let badge = "";
                if (p.status === "stock-out") badge = "stock-out";

                let subcategory = null;
                const nameLower = (p.name || '').toLowerCase();
                if (category === "Men's Fashion") {
                    if (nameLower.includes('panjabi')) subcategory = 'Panjabi';
                    else if (nameLower.includes('pajama') || nameLower.includes('pyjama')) subcategory = 'Pajama';
                    else if (nameLower.includes('t-shirt') || nameLower.includes('tshirt') || nameLower.includes('polo')) subcategory = 'T-Shirt';
                    else if (nameLower.includes('shirt')) subcategory = 'Shirts';
                    else if (nameLower.includes('pant') || nameLower.includes('trouser') || nameLower.includes('jeans') || nameLower.includes('gabardine')) subcategory = 'Pants';
                    else if (nameLower.includes('jersey')) subcategory = 'Jersey';
                    else if (nameLower.includes('wallet') || nameLower.includes('belt') || nameLower.includes('sunglass')) subcategory = "Men's Accessories";
                } else if (category === "Women's Fashion") {
                    if (nameLower.includes('sharee') || nameLower.includes('saree') || nameLower.includes('shari')) {
                        subcategory = 'Sharee';
                        // Detect saree type for 3rd-level filtering
                        let sareeType = 'Others';
                        if (nameLower.includes('jamdani') || nameLower.includes('জামদানি')) sareeType = 'Jamdani';
                        else if (nameLower.includes('half silk') || nameLower.includes('halk silk') || nameLower.includes('half-silk') || nameLower.includes('half_silk')) sareeType = 'Half Silk';
                        else if (nameLower.includes('silk') || nameLower.includes('silky')) sareeType = 'Silk';
                        else if (nameLower.includes('cotton') || nameLower.includes('khadi')) sareeType = 'Cotton';
                        else if (nameLower.includes('georgette') || nameLower.includes('jorget')) sareeType = 'Georgette';
                        else if (nameLower.includes('muslin') || nameLower.includes('মসলিন')) sareeType = 'Muslin';
                        else if (nameLower.includes('voile') || nameLower.includes('voil')) sareeType = 'Voile';
                        else if (nameLower.includes('chiffon') || nameLower.includes('crepe')) sareeType = 'Chiffon';
                        else if (nameLower.includes('linen')) sareeType = 'Linen';
                        p.sareeType = sareeType;
                    }
                    else if (nameLower.includes('salwar') || nameLower.includes('kameez') || nameLower.includes('three piece')) subcategory = 'Salwar';
                    else if (nameLower.includes('kurti') || nameLower.includes('tops')) subcategory = 'Kurti';
                    else if (nameLower.includes('borka') || nameLower.includes('hijab') || nameLower.includes('abaya')) subcategory = 'Borka';
                    else if (nameLower.includes('bag') || nameLower.includes('jewelry') || nameLower.includes('necklace')) subcategory = "Women's Accessories";
                    else if (nameLower.includes('cream') || nameLower.includes('lotion') || nameLower.includes('makeup') || nameLower.includes('lipstick')) subcategory = 'Cosmetics';
                } else if (category === "Gadgets & Electronics") {
                    if (nameLower.includes('cable') || nameLower.includes('charger') || nameLower.includes('cover') || nameLower.includes('stand')) subcategory = 'Mobile Accessories';
                    else if (nameLower.includes('mouse') || nameLower.includes('keyboard') || nameLower.includes('router') || nameLower.includes('pendrive')) subcategory = 'Computer';
                    else if (nameLower.includes('headphone') || nameLower.includes('earphone') || nameLower.includes('speaker') || nameLower.includes('airpods') || nameLower.includes('earbuds')) subcategory = 'Audio';
                    else if (nameLower.includes('power bank')) subcategory = 'Power Bank';
                    else if (nameLower.includes('trimmer') || nameLower.includes('shaver') || nameLower.includes('clipper')) subcategory = 'Trimmer';
                } else if (category === "Home & Lifestyle") {
                    if (nameLower.includes('bed sheet') || nameLower.includes('bed cover')) subcategory = 'Bed Sheet';
                    else if (nameLower.includes('blender') || nameLower.includes('iron') || nameLower.includes('fan') || nameLower.includes('machine')) subcategory = 'Home Appliance';
                    else if (nameLower.includes('bottle') || nameLower.includes('mug') || nameLower.includes('spoon') || nameLower.includes('rack')) subcategory = 'Kitchen';
                    else if (nameLower.includes('massager') || nameLower.includes('scale') || nameLower.includes('trimmer')) subcategory = 'Health';
                } else if (category === "Kids Zone") {
                    if (nameLower.includes('toy') || nameLower.includes('car') || nameLower.includes('puzzle')) subcategory = 'Toys';
                    else if (nameLower.includes('diaper') || nameLower.includes('feeder') || nameLower.includes('baby')) subcategory = 'Baby';
                    else if (nameLower.includes('dress') || nameLower.includes('kid')) subcategory = 'Children';
                } else if (category === "Customize & Gift") {
                    if (nameLower.includes('mug') || nameLower.includes('t-shirt') || nameLower.includes('custom')) subcategory = 'Customize';
                    else subcategory = 'Gift';
                } else if (category === "Offer") {
                    if (nameLower.includes('clearance')) subcategory = 'Stock Clearance Sale';
                    else if (nameLower.includes('mystery')) subcategory = 'Mystery Box';
                    else if (nameLower.includes('shirt')) subcategory = 'Full Sleeve Shirt';
                    else subcategory = 'Big Offer';
                }

                // Generic subType detection using subTypeRules (runs after subcategory is set)
                let subType = null;
                if (subcategory && typeof subTypeRules !== 'undefined' && subTypeRules[subcategory]) {
                    const rules = subTypeRules[subcategory];
                    for (const rule of rules) {
                        if (rule.keywords.some(kw => nameLower.includes(kw))) {
                            subType = rule.label;
                            break;
                        }
                    }
                    if (!subType) subType = 'Others';
                }

                const name = p.name || '';
                const priceKey = regularPriceNumeric || 0;
                let imageKey = "noimg";
                if (originalImageUrl) {
                    try { imageKey = originalImageUrl.split('/').pop(); } catch(e) {}
                }
                const dedupKey = `${name.toLowerCase().trim()}_${priceKey}_${imageKey}`;
                
                if (!productsMap.has(dedupKey)) {
                    productsMap.set(dedupKey, {
                        id: p.product_code ? String(p.product_code) : String(p.id),
                        name: name,
                        price: priceKey,
                        sale_price: salePriceNumeric || 0,
                        hasValidDiscount: hasValidDiscount,
                        originalPrice: null,
                        category: category,
                        subcategory: subcategory,
                        subType: subType,
                        image: originalImageUrl,
                        originalImageUrl: originalImageUrl,
                        thumbnailImageUrl: thumbnailImageUrl,
                        detailImageUrl: detailImageUrl,
                        thumbnail_img: thumbnailImageUrl,
                        desc: p.details || p.name || '',
                        badge: p.badge || badge,
                        dateAdded: new Date().toISOString().split('T')[0],
                        variants: variants,
                        images: p.product_images ? p.product_images.map(img => img.product_image) : []
                    });
                }
            } catch (e) {
                console.warn("Skipping malformed product:", p.id, e);
            }
        }
        return Array.from(productsMap.values());
    }
    return [];
}

// ── Meronno API Integration ──────────────────────────────────────────────────

function processMeronnoProduct(p) {
    try {
        const name = (p.name || '').trim();
        if (!name) return null;

        const price = parseFloat(p.base_price) || 0;
        const salePrice = parseFloat(p.base_discounted_price) || 0;
        const hasValidDiscount = price > 0 && salePrice > 0 && price > salePrice;

        // Build image URL
        const rawImg = p.thumbnail_image || '';
        const imageUrl = rawImg ? `https://merrono.com/${rawImg}` : '';
        const encodedImg = imageUrl ? encodeURIComponent(imageUrl) : '';
        const thumbnailImageUrl = encodedImg ? `https://wsrv.nl/?url=${encodedImg}&w=600&q=85&fit=contain&output=webp` : '';
        const detailImageUrl = encodedImg ? `https://wsrv.nl/?url=${encodedImg}&w=1200&q=90&fit=contain&output=webp` : '';

        // Auto-detect category from name
        const nameLower = name.toLowerCase();
        let category = 'Others';
        if (nameLower.includes('sharee') || nameLower.includes('saree') || nameLower.includes('shari') ||
            nameLower.includes('salwar') || nameLower.includes('kurti') || nameLower.includes('borka') ||
            nameLower.includes('hijab') || nameLower.includes('abaya') || nameLower.includes('cosmetic') ||
            nameLower.includes('lipstick') || nameLower.includes('makeup') || nameLower.includes('cream')) {
            category = "Women's Fashion";
        } else if (nameLower.includes('panjabi') || nameLower.includes('pajama') ||
            nameLower.includes('t-shirt') || nameLower.includes('tshirt') || nameLower.includes('polo') ||
            nameLower.includes('jersey') || nameLower.includes('gabardine') || nameLower.includes('wallet')) {
            category = "Men's Fashion";
        } else if (nameLower.includes('mobile') || nameLower.includes('phone') || nameLower.includes('charger') ||
            nameLower.includes('cable') || nameLower.includes('headphone') || nameLower.includes('earphone') ||
            nameLower.includes('speaker') || nameLower.includes('router') || nameLower.includes('mouse') ||
            nameLower.includes('keyboard') || nameLower.includes('laptop') || nameLower.includes('earbuds') ||
            nameLower.includes('airpods') || nameLower.includes('trimmer') || nameLower.includes('power bank')) {
            category = "Gadgets & Electronics";
        } else if (nameLower.includes('bed sheet') || nameLower.includes('pillow') || nameLower.includes('blender') ||
            nameLower.includes('fan') || nameLower.includes('iron') || nameLower.includes('bottle') ||
            nameLower.includes('mug') || nameLower.includes('kitchen') || nameLower.includes('massager') ||
            nameLower.includes('cleaner') || nameLower.includes('spray') || nameLower.includes('bag') ||
            nameLower.includes('foil') || nameLower.includes('rack') || nameLower.includes('organizer')) {
            category = "Home & Lifestyle";
        } else if (nameLower.includes('toy') || nameLower.includes('puzzle') || nameLower.includes('baby') ||
            nameLower.includes('kid') || nameLower.includes('children') || nameLower.includes('book') ||
            nameLower.includes('educational')) {
            category = "Kids Zone";
        }

        // Apply subcategory detection (reuse same logic)
        let subcategory = null;
        let subType = null;
        if (category === "Women's Fashion") {
            if (nameLower.includes('sharee') || nameLower.includes('saree') || nameLower.includes('shari')) subcategory = 'Sharee';
            else if (nameLower.includes('salwar') || nameLower.includes('kameez')) subcategory = 'Salwar';
            else if (nameLower.includes('kurti') || nameLower.includes('tops')) subcategory = 'Kurti';
            else if (nameLower.includes('borka') || nameLower.includes('hijab') || nameLower.includes('abaya')) subcategory = 'Borka';
            else subcategory = 'Cosmetics';
        } else if (category === "Men's Fashion") {
            if (nameLower.includes('panjabi')) subcategory = 'Panjabi';
            else if (nameLower.includes('pajama') || nameLower.includes('pyjama')) subcategory = 'Pajama';
            else if (nameLower.includes('t-shirt') || nameLower.includes('tshirt') || nameLower.includes('polo')) subcategory = 'T-Shirt';
            else if (nameLower.includes('jersey')) subcategory = 'Jersey';
            else if (nameLower.includes('wallet') || nameLower.includes('belt')) subcategory = "Men's Accessories";
            else subcategory = 'Shirts';
        } else if (category === "Gadgets & Electronics") {
            if (nameLower.includes('charger') || nameLower.includes('cable') || nameLower.includes('cover') || nameLower.includes('phone')) subcategory = 'Mobile Accessories';
            else if (nameLower.includes('headphone') || nameLower.includes('earphone') || nameLower.includes('speaker') || nameLower.includes('airpods') || nameLower.includes('earbuds')) subcategory = 'Audio';
            else if (nameLower.includes('mouse') || nameLower.includes('keyboard') || nameLower.includes('router')) subcategory = 'Computer';
            else if (nameLower.includes('power bank')) subcategory = 'Power Bank';
            else if (nameLower.includes('trimmer') || nameLower.includes('shaver')) subcategory = 'Trimmer';
        } else if (category === "Home & Lifestyle") {
            if (nameLower.includes('bed sheet') || nameLower.includes('pillow')) subcategory = 'Bed Sheet';
            else if (nameLower.includes('blender') || nameLower.includes('iron') || nameLower.includes('fan')) subcategory = 'Home Appliance';
            else if (nameLower.includes('bottle') || nameLower.includes('mug') || nameLower.includes('rack') || nameLower.includes('cleaner') || nameLower.includes('kitchen')) subcategory = 'Kitchen';
            else subcategory = 'Health';
        } else if (category === "Kids Zone") {
            if (nameLower.includes('toy') || nameLower.includes('puzzle') || nameLower.includes('book')) subcategory = 'Toys';
            else if (nameLower.includes('baby')) subcategory = 'Baby';
            else subcategory = 'Children';
        }

        // Detect subType using subTypeRules
        if (subcategory && typeof subTypeRules !== 'undefined' && subTypeRules[subcategory]) {
            const rules = subTypeRules[subcategory];
            for (const rule of rules) {
                if (rule.keywords.some(kw => nameLower.includes(kw))) {
                    subType = rule.label;
                    break;
                }
            }
            if (!subType) subType = 'Others';
        }

        const dedupKey = `${name.toLowerCase().trim()}_${price}_meronno_${p.id}`;
        return {
            id: `meronno_${p.id}`,
            name: name,
            price: price,
            sale_price: hasValidDiscount ? salePrice : 0,
            hasValidDiscount: hasValidDiscount,
            originalPrice: null,
            category: category,
            subcategory: subcategory,
            subType: subType,
            image: imageUrl,
            originalImageUrl: imageUrl,
            thumbnailImageUrl: thumbnailImageUrl,
            detailImageUrl: detailImageUrl,
            thumbnail_img: thumbnailImageUrl,
            desc: name,
            badge: '',
            dateAdded: new Date().toISOString().split('T')[0],
            variants: null,
            images: [],
            source: 'meronno'
        };
    } catch (e) {
        return null;
    }
}

async function fetchAllMeronnoProducts() {
    const API_KEY = '07d5LhLeSvvIZyxLgQ5cACJOHDI1iPEX';
    const BASE_URL = 'https://merrono.com/api/v1/products';
    try {
        // Fetch first page to know total pages
        const firstRes = await fetch(`${BASE_URL}?api_key=${API_KEY}&page=1`);
        if (!firstRes.ok) throw new Error('Meronno API not reachable');
        const firstData = await firstRes.json();
        if (!firstData.success) throw new Error('Meronno API error');

        const totalPages = firstData.meta?.last_page || 1;
        const allProducts = [];

        // Add products from first page
        (firstData.data || []).forEach(p => {
            const processed = processMeronnoProduct(p);
            if (processed) allProducts.push(processed);
        });

        // Fetch remaining pages in parallel batches of 10
        const BATCH_SIZE = 10;
        for (let startPage = 2; startPage <= totalPages; startPage += BATCH_SIZE) {
            const batch = [];
            for (let p = startPage; p < startPage + BATCH_SIZE && p <= totalPages; p++) {
                batch.push(
                    fetch(`${BASE_URL}?api_key=${API_KEY}&page=${p}`)
                        .then(r => r.json())
                        .then(d => d.data || [])
                        .catch(() => [])
                );
            }
            const batchResults = await Promise.all(batch);
            batchResults.forEach(pageProducts => {
                pageProducts.forEach(p => {
                    const processed = processMeronnoProduct(p);
                    if (processed) allProducts.push(processed);
                });
            });
        }

        console.log(`Meronno: fetched ${allProducts.length} products from ${totalPages} pages`);
        return allProducts;
    } catch (e) {
        console.warn('fetchAllMeronnoProducts failed:', e);
        return [];
    }
}

async function loadProducts() {
    loadError = false;
    
    try {
        // Load from cache FIRST for instant UI
        const cached = await getCachedProducts();
        if (cached && cached.length > 0) {
            products = cached;
            isFirstLoad = false;
            handleRoute();
            hideLoader();
            console.log("Loaded products from cache:", products.length);
        } else {
            // Try old cache migration
            const oldCache = await getCachedProducts('all_products');
            if (oldCache && oldCache.length > 0) {
                products = processProductsData({ status: 200, products: oldCache });
                isFirstLoad = false;
                handleRoute();
                hideLoader();
                console.log("Loaded products from old cache:", products.length);
                setCachedProducts(products).then(() => {
                    deleteOldCache('all_products').catch(() => {});
                });
            }
        }
        
        // Fetch Supabase API (which already aggregates Mohasagor, Merrono & CSV)
        const supabaseApiUrl = 'https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/get-products';
        apiFetch(supabaseApiUrl, {}, 2)
            .then(res => { if(!res.ok) throw new Error("Supabase API failed"); return res.json(); })
            .then(data => {
                if (data.status === 200 && data.products) {
                    const newProducts = processProductsData(data);
                    const shouldRerender = products.length === 0 || products.length !== newProducts.length;
                    products = newProducts;
                    setCachedProducts(products).catch(e => console.warn('Cache write failed', e));
                    console.log(`Updated products from API: ${products.length} total (Supabase, Mohasagor, Merrono & CSV)`);
                    if (shouldRerender) {
                        isFirstLoad = false;
                        handleRoute();
                        hideLoader();
                    }
                }
            })
            .catch(e => {
                console.warn("API fetch failed:", e);
                if (products.length === 0) {
                    loadError = true;
                    handleRoute();
                    hideLoader();
                }
            });

    } catch (error) {
        console.error("Critical error in loadProducts orchestration:", error);
        if (products.length === 0) {
            loadError = true;
            handleRoute();
        }
        hideLoader();
    }
}

async function fetchAndUpdateCache() {
    try {
        const supabaseApiUrl = 'https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/get-products';
        const response = await apiFetch(supabaseApiUrl, {}, 2);
        if (!response.ok) throw new Error("API call failed");

        const data = await response.json();
        const newProducts = processProductsData(data);
        if (newProducts.length > 0) {
            products = newProducts;
            await setCachedProducts(products);
        }
        loadError = false;
        
    } catch (error) {
        console.error("Error fetching products from API:", error);
        if (products.length === 0) {
            loadError = true;
            handleRoute(); // Force UI update if there are no products
        }
    }
}

function renderHome() {
    
    const bottomSections = document.getElementById('global-bottom-sections');
    
    if (!document.getElementById('main-content')) return;
    
    if (loadError && products.length === 0) {
        if (bottomSections) bottomSections.style.display = 'none';
        document.getElementById('main-content').innerHTML = `
            <div class="container" style="max-width: 600px; padding: 40px; margin: 60px auto; text-align: center; background: var(--bg-elevated); border: 1px solid var(--border-medium); border-radius: var(--radius-lg);">
                <div style="display: inline-flex; justify-content: center; align-items: center; width: 64px; height: 64px; border-radius: 50%; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.2); margin-bottom: 24px;">
                    <i class="fas fa-wifi" style="font-size: 24px; color: var(--warning);"></i>
                </div>
                <h2 style="font-size: 1.5rem; font-weight: 700; color: #fff; margin-bottom: 12px;">Connection Timeout</h2>
                <p style="color: var(--text-muted); margin-bottom: 32px; font-size: 1.05rem;">Could not load products. Please check your connection.</p>
                <button class="btn" onclick="loadProducts()" style="padding: 10px 24px;"><i class="fas fa-sync-alt mr-2"></i> Retry</button>
            </div>
        `;
        return;
    }
    
    if (bottomSections) bottomSections.style.display = 'block';

    // 1. Premium Hero
    const heroHtml = `
        <section class="premium-hero" style="max-height: 500px;">
            <img src="/hero.webp" alt="CSGO Shop Banner" class="premium-hero-bg" loading="eager" decoding="async">
            <div class="premium-hero-overlay"></div>
            <div class="container" style="position: relative; z-index: 2;">
                <div class="premium-hero-content reveal">
                    <span style="display: inline-block; padding: 6px 16px; background: rgba(245, 158, 11, 0.2); color: var(--accent-primary); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 20px; font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px;">
                        The #1 Premium Shop in BD
                    </span>
                    <h1 style="font-size: var(--fs-h1); font-weight: 800; line-height: 1.1; margin-bottom: 20px; color: #fff;">
                        Level Up Your<br><span style="color: var(--accent-primary);">Lifestyle</span> Today
                    </h1>
                    <p style="font-size: 1.1rem; color: var(--text-secondary); max-width: 500px; margin-bottom: 30px; line-height: 1.6;">
                        Shop the best electronics, fashion, and accessories at unbeatable prices. Fast delivery all over Bangladesh.
                    </p>
                    <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                        <button class="btn" onclick="navigateTo('products')" style="padding: 15px 35px; font-size: 1.1rem; font-weight: 600; border-radius: var(--radius-btn); box-shadow: var(--shadow-premium);">
                            Shop Now <i class="fas fa-arrow-right" style="margin-left: 8px;"></i>
                        </button>
                    </div>
                </div>
            </div>
        </section>
    `;

    // 2. Trust Strip
    const trustHtml = `
        <div style="background: var(--bg-elevated); border-top: 1px solid var(--border-medium); border-bottom: 1px solid var(--border-medium); padding: 15px 0;">
            <div class="container" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                <div style="display: flex; align-items: center; gap: 10px; color: var(--text-secondary); font-size: 0.95rem; font-weight: 500;">
                    <i class="fas fa-shield-alt" style="color: var(--accent-primary); font-size: 1.2rem;"></i> Secure Payments
                </div>
                <div style="display: flex; align-items: center; gap: 10px; color: var(--text-secondary); font-size: 0.95rem; font-weight: 500;">
                    <i class="fas fa-truck" style="color: var(--accent-primary); font-size: 1.2rem;"></i> Fast Delivery
                </div>
                <div style="display: flex; align-items: center; gap: 10px; color: var(--text-secondary); font-size: 0.95rem; font-weight: 500;">
                    <i class="fas fa-check-circle" style="color: var(--accent-primary); font-size: 1.2rem;"></i> 100% Authentic
                </div>
                <div style="display: flex; align-items: center; gap: 10px; color: var(--text-secondary); font-size: 0.95rem; font-weight: 500;">
                    <i class="fas fa-tags" style="color: var(--accent-primary); font-size: 1.2rem;"></i> Best Price in BD
                </div>
            </div>
        </div>
    `;

    // 3. Categories Grid
    const priorityCategories = [
        { name: "Men's Fashion", image: "https://images.unsplash.com/photo-1617137968427-85924c800a22?w=150&h=150&fit=crop", display: "Men's Fashion" },
        { name: "Women's Fashion", image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=150&h=150&fit=crop", display: "Women's Fashion" },
        { name: "Gadgets & Electronics", image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=150&h=150&fit=crop", display: "Electronics" },
        { name: "Home & Lifestyle", image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=150&h=150&fit=crop", display: "Home" },
        { name: "Kids Zone", image: "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=150&h=150&fit=crop", display: "Kids" },
        { name: "Beauty & Health", image: "https://images.unsplash.com/photo-1596462502278-27bf85033e5a?w=150&h=150&fit=crop", display: "Beauty" }
    ];
    let topCategoriesHtml = priorityCategories.map(cat => `
        <div class="premium-category-card" data-category="${cat.name.replace(/"/g, '&quot;').replace(/'/g, '&apos;')}" onclick="filterCategory(this.dataset.category)" style="background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-card); text-align: center; cursor: pointer; transition: all 0.3s ease; display: flex; flex-direction: column; align-items: center; overflow: hidden; padding-bottom: 15px;">
            <img src="${cat.image}" onerror="this.src='https://placehold.co/300x300/1e293b/f59e0b?text=Category'" style="width: 100%; height: 120px; object-fit: cover; margin-bottom: 15px; display: block;" alt="${cat.display}">
            <h3 style="font-size: 0.95rem; font-weight: 600; margin: 0; color: var(--text-primary);">${cat.display}</h3>
        </div>
    `).join('');
    
    let catsHtml = `
        <section class="container" style="padding: 60px 0 20px;">
            <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                <div>
                    <h2 class="section-title" style="margin: 0;">Shop by Category</h2>
                    <p style="color: var(--text-muted); margin-top: 5px;">Discover our top collections</p>
                </div>
                <button class="btn btn-outline" onclick="navigateTo('categories')" style="border-radius: 20px; padding: 8px 20px; font-size: 0.9rem;">View All</button>
            </div>
            <div class="categories-grid">
                ${topCategoriesHtml}
            </div>
        </section>
    `;

    // Deduplication tracker
    const displayedIds = new Set();

    // 4. Trending Now (Strict genuine signal)
    let trendingProducts = products.filter(p => p.badge && p.badge.toLowerCase().includes('trend')).slice(0, 12);
    trendingProducts.forEach(p => displayedIds.add(p.id));
    
    let trendingHtml = '';
    if(trendingProducts.length > 0) {
        trendingHtml = `
            <section class="container products-section">
                <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                    <div>
                        <h2 class="section-title" style="margin: 0; color: var(--accent-primary);"><i class="fas fa-fire"></i> Trending Now</h2>
                    </div>
                </div>
                <div class="products-grid">
                    ${trendingProducts.map(p => generateProductCard(p)).join('')}
                </div>
            </section>
        `;
    }

    // 5. Best Sellers (Strict genuine signal)
    let bestProducts = products.filter(p => p.badge && (p.badge.toLowerCase().includes('hot') || p.badge.toLowerCase().includes('best')) && !displayedIds.has(p.id)).slice(0, 12);
    bestProducts.forEach(p => displayedIds.add(p.id));
    let bestHtml = '';
    if(bestProducts.length > 0) {
        bestHtml = `
            <section class="container products-section">
                <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                    <div>
                        <h2 class="section-title" style="margin: 0;"><i class="fas fa-star" style="color: var(--accent-primary);"></i> Best Sellers</h2>
                    </div>
                </div>
                <div class="products-grid">
                    ${bestProducts.map(p => generateProductCard(p)).join('')}
                </div>
            </section>
        `;
    }

    // 5.5 Discover More (Deterministic neutral fallback if others are empty)
    let discoverHtml = '';
    if (trendingProducts.length === 0 && bestProducts.length === 0 && products.length > 12) {
        let discoverProducts = products.filter(p => !displayedIds.has(p.id)).slice(0, 12);
        discoverProducts.forEach(p => displayedIds.add(p.id));
        discoverHtml = `
            <section class="container products-section">
                <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                    <div>
                        <h2 class="section-title" style="margin: 0;"><i class="fas fa-compass" style="color: var(--accent-primary);"></i> Discover More</h2>
                    </div>
                </div>
                <div class="products-grid">
                    ${discoverProducts.map(p => generateProductCard(p)).join('')}
                </div>
            </section>
        `;
    }

    // 6. New Arrivals
    let newProducts = [...products].reverse().filter(p => !displayedIds.has(p.id)).slice(0, 12);
    newProducts.forEach(p => displayedIds.add(p.id));
    let newHtml = '';
    if(newProducts.length > 0) {
        newHtml = `
            <section class="container products-section">
                <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                    <div>
                        <h2 class="section-title" style="margin: 0;"><i class="fas fa-tags" style="color: var(--accent-primary);"></i> New Arrivals</h2>
                    </div>
                </div>
                <div class="products-grid">
                    ${newProducts.map(p => generateProductCard(p)).join('')}
                </div>
            </section>
        `;
    }
    // 7. Explore More Products (paginated section with Load More)
    homeDiscoverPage = 1;
    homeDiscoverList = products.filter(p => !displayedIds.has(p.id));
    const HOME_EXPLORE_PAGE_SIZE = 24;
    const totalExplorePages = Math.ceil(homeDiscoverList.length / HOME_EXPLORE_PAGE_SIZE);
    const initialExplore = homeDiscoverList.slice(0, HOME_EXPLORE_PAGE_SIZE);
    initialExplore.forEach(p => displayedIds.add(p.id));

    let exploreHtml = '';
    if (homeDiscoverList.length > 0) {
        const paginationHtml = totalExplorePages > 1 ? buildHomePagination(1, totalExplorePages) : '';
        exploreHtml = `
            <section class="container products-section" style="margin-bottom: 60px;">
                <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                    <div>
                        <h2 class="section-title" style="margin: 0;"><i class="fas fa-th-large" style="color: var(--accent-primary);"></i> Explore More Products</h2>
                        <p style="color: var(--text-muted, #aaa); margin: 6px 0 0; font-size: 0.9rem;">${homeDiscoverList.length.toLocaleString()} products &bull; Page <span id="home-explore-page-label">1</span> of ${totalExplorePages}</p>
                    </div>
                </div>
                <div class="products-grid" id="home-explore-grid">
                    ${initialExplore.map(p => generateProductCard(p)).join('')}
                </div>
                <div id="home-explore-pagination" style="display:flex;justify-content:center;align-items:center;gap:8px;margin-top:36px;flex-wrap:wrap;">
                    ${paginationHtml}
                </div>
            </section>
        `;
    }

    document.getElementById('main-content').innerHTML = heroHtml + trustHtml + catsHtml + trendingHtml + bestHtml + discoverHtml + newHtml + exploreHtml;
    
    // Smooth reveal elements
    setTimeout(() => {
        document.querySelectorAll('.premium-hero-content, .premium-category-card, .product-card').forEach((el, index) => {
            if(index < 15) { // Only animate first few to prevent performance hit
                el.style.opacity = '0';
                el.style.transform = 'translateY(15px)';
                setTimeout(() => {
                    el.style.transition = 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
                    el.style.opacity = '1';
                    el.style.transform = 'translateY(0)';
                }, 50 * index);
            }
        });
    }, 50);
}



let currentProductList = [];
let currentProductPage = 1;
const PRODUCTS_PER_PAGE = 1000; // Increased from 24 to show all products

const subcategoriesMap = {
    "Offer": ["Stock Clearance Sale", "Mystery Box", "Big Offer", "Full Sleeve Shirt"],
    "Men's Fashion": ["Panjabi", "Pajama", "T-Shirt", "Shirts", "Pants", "Men's Accessories", "Jersey"],
    "Women's Fashion": ["Sharee", "Salwar", "Kurti", "Borka", "Women's Accessories", "Cosmetics"],
    "Home & Lifestyle": ["Bed Sheet", "Home Appliance", "Kitchen", "Health"],
    "Gadgets & Electronics": ["Mobile Accessories", "Computer", "Audio", "Power Bank", "Trimmer"],
    "Kids Zone": ["Toys", "Baby", "Children"],
    "Customize & Gift": ["Gift", "Customize"]
};

// Sub-type rules for 3rd-level filtering — [keywords] → label
// Format: { subcategory: [ { label, keywords[] } ] }
const subTypeRules = {
    // Women's Fashion
    "Sharee": [
        { label: "Jamdani", keywords: ["jamdani", "জামদানি"] },
        { label: "Half Silk", keywords: ["half silk", "halk silk", "half-silk", "half_silk"] },
        { label: "Silk", keywords: ["silk", "silky"] },
        { label: "Cotton", keywords: ["cotton", "khadi"] },
        { label: "Georgette", keywords: ["georgette", "jorget"] },
        { label: "Muslin", keywords: ["muslin", "মসলিন"] },
        { label: "Voile", keywords: ["voile", "voil"] },
        { label: "Chiffon", keywords: ["chiffon", "crepe"] },
        { label: "Linen", keywords: ["linen"] },
        { label: "Katan", keywords: ["katan", "kataan"] },
        { label: "Tant", keywords: ["tant", "taant"] },
    ],
    "Salwar": [
        { label: "Three Piece", keywords: ["three piece", "3 piece", "3piece"] },
        { label: "Two Piece", keywords: ["two piece", "2 piece", "2piece"] },
        { label: "Embroidery", keywords: ["embroidery", "embroidered", "nakshi"] },
        { label: "Printed", keywords: ["printed", "print"] },
        { label: "Cotton", keywords: ["cotton"] },
        { label: "Georgette", keywords: ["georgette"] },
    ],
    "Kurti": [
        { label: "Cotton Kurti", keywords: ["cotton"] },
        { label: "Printed Kurti", keywords: ["printed", "print"] },
        { label: "Embroidery", keywords: ["embroidery", "nakshi"] },
        { label: "Tops", keywords: ["tops", "top"] },
    ],
    "Borka": [
        { label: "Hijab", keywords: ["hijab"] },
        { label: "Abaya", keywords: ["abaya"] },
        { label: "Niqab", keywords: ["niqab"] },
        { label: "Full Borka", keywords: ["borka", "burka", "burkha"] },
    ],
    "Cosmetics": [
        { label: "Cream", keywords: ["cream", "lotion", "moisturizer"] },
        { label: "Makeup", keywords: ["makeup", "lipstick", "foundation", "blush"] },
        { label: "Skincare", keywords: ["serum", "toner", "sunscreen", "facewash"] },
        { label: "Hair Care", keywords: ["shampoo", "conditioner", "hair oil", "hair"] },
        { label: "Perfume", keywords: ["perfume", "attar", "fragrance", "deodorant"] },
    ],

    // Men's Fashion
    "Panjabi": [
        { label: "Cotton Panjabi", keywords: ["cotton"] },
        { label: "Silk Panjabi", keywords: ["silk"] },
        { label: "Embroidery", keywords: ["embroidery", "nakshi", "embroidered"] },
        { label: "Linen Panjabi", keywords: ["linen"] },
        { label: "Printed", keywords: ["printed", "print"] },
    ],
    "T-Shirt": [
        { label: "Polo", keywords: ["polo"] },
        { label: "Round Neck", keywords: ["round neck", "crew neck"] },
        { label: "V-Neck", keywords: ["v-neck", "v neck"] },
        { label: "Full Sleeve", keywords: ["full sleeve", "full-sleeve", "long sleeve"] },
        { label: "Half Sleeve", keywords: ["half sleeve", "short sleeve"] },
        { label: "Printed", keywords: ["printed", "print", "graphic"] },
        { label: "Plain", keywords: ["plain", "solid", "basic"] },
    ],
    "Shirts": [
        { label: "Casual Shirt", keywords: ["casual"] },
        { label: "Formal Shirt", keywords: ["formal", "office"] },
        { label: "Check Shirt", keywords: ["check", "plaid", "stripe"] },
        { label: "Printed Shirt", keywords: ["printed", "print"] },
        { label: "Linen Shirt", keywords: ["linen"] },
    ],
    "Pants": [
        { label: "Jeans", keywords: ["jeans", "denim"] },
        { label: "Gabardine", keywords: ["gabardine"] },
        { label: "Trouser", keywords: ["trouser", "formal pant"] },
        { label: "Chino", keywords: ["chino", "khaki"] },
        { label: "Cargo", keywords: ["cargo"] },
    ],
    "Jersey": [
        { label: "Football Jersey", keywords: ["football", "soccer"] },
        { label: "Cricket Jersey", keywords: ["cricket"] },
        { label: "Basketball", keywords: ["basketball", "nba"] },
        { label: "Sports Wear", keywords: ["sports", "athletic", "gym"] },
    ],

    // Gadgets & Electronics
    "Mobile Accessories": [
        { label: "Phone Case/Cover", keywords: ["cover", "case", "back cover", "casing"] },
        { label: "Charger/Cable", keywords: ["charger", "cable", "adapter", "data cable"] },
        { label: "Screen Guard", keywords: ["screen", "tempered", "protector", "glass"] },
        { label: "Stand/Holder", keywords: ["stand", "holder", "mount", "grip"] },
        { label: "OTG/USB", keywords: ["otg", "usb", "hub"] },
    ],
    "Audio": [
        { label: "Earphone", keywords: ["earphone", "earbud", "in-ear"] },
        { label: "Headphone", keywords: ["headphone", "headset", "over-ear"] },
        { label: "Bluetooth Speaker", keywords: ["speaker", "bluetooth speaker"] },
        { label: "Airpods/TWS", keywords: ["airpods", "tws", "true wireless"] },
        { label: "Neckband", keywords: ["neckband", "neck band"] },
    ],
    "Computer": [
        { label: "Mouse", keywords: ["mouse"] },
        { label: "Keyboard", keywords: ["keyboard"] },
        { label: "Pendrive/SSD", keywords: ["pendrive", "pen drive", "ssd", "flash drive"] },
        { label: "Webcam", keywords: ["webcam", "web camera"] },
        { label: "Router/Networking", keywords: ["router", "wifi", "network", "modem"] },
    ],
    "Trimmer": [
        { label: "Beard Trimmer", keywords: ["beard", "shaver", "trimmer"] },
        { label: "Hair Clipper", keywords: ["hair clipper", "clipper"] },
        { label: "Lady Shaver", keywords: ["lady", "women", "bikini"] },
        { label: "Nose/Ear Trimmer", keywords: ["nose", "ear"] },
    ],

    // Home & Lifestyle
    "Bed Sheet": [
        { label: "Single Bed", keywords: ["single", "twin"] },
        { label: "Double Bed", keywords: ["double", "queen", "king"] },
        { label: "Pillow Cover", keywords: ["pillow", "cushion"] },
        { label: "Comforter/Blanket", keywords: ["comforter", "blanket", "duvet"] },
        { label: "Mattress Cover", keywords: ["mattress", "bedcover"] },
    ],
    "Kitchen": [
        { label: "Cookware", keywords: ["pot", "pan", "wok", "kadai", "tawa"] },
        { label: "Storage", keywords: ["box", "container", "jar", "rack", "organizer"] },
        { label: "Cutlery", keywords: ["spoon", "fork", "knife", "cutlery"] },
        { label: "Bottle/Mug", keywords: ["bottle", "mug", "flask", "cup", "glass"] },
        { label: "Knife/Chopper", keywords: ["chopper", "cutter", "grater", "peeler"] },
    ],
    "Home Appliance": [
        { label: "Fan", keywords: ["fan", "ceiling fan", "table fan"] },
        { label: "Iron", keywords: ["iron", "steam iron"] },
        { label: "Blender/Mixer", keywords: ["blender", "mixer", "juicer", "grinder"] },
        { label: "Washing", keywords: ["washing", "laundry"] },
        { label: "Heater/Cooler", keywords: ["heater", "cooler", "ac"] },
    ],
    "Health": [
        { label: "Massager", keywords: ["massager", "massage"] },
        { label: "Scale/Monitor", keywords: ["scale", "monitor", "bp", "pressure"] },
        { label: "Fitness", keywords: ["yoga", "exercise", "fitness", "gym", "resistance"] },
        { label: "Thermometer", keywords: ["thermometer", "temperature"] },
        { label: "Pain Relief", keywords: ["pain", "relief", "heat pad", "patch"] },
    ],

    // Kids Zone
    "Toys": [
        { label: "Toy Car/Vehicle", keywords: ["car", "truck", "vehicle", "train", "bike"] },
        { label: "Building Blocks", keywords: ["block", "lego", "brick", "puzzle"] },
        { label: "Doll/Action Figure", keywords: ["doll", "barbie", "action figure", "robot"] },
        { label: "Board Game", keywords: ["board game", "chess", "carom", "game"] },
        { label: "Educational Toy", keywords: ["educational", "learning", "alphabet", "number"] },
    ],
    "Baby": [
        { label: "Diaper/Wipes", keywords: ["diaper", "wipes", "nappy"] },
        { label: "Feeder/Nursing", keywords: ["feeder", "bottle", "nursing", "sippy"] },
        { label: "Baby Cream", keywords: ["cream", "lotion", "powder", "oil"] },
        { label: "Baby Carrier", keywords: ["carrier", "sling", "pram", "stroller"] },
    ],

    // Offer
    "Big Offer": [
        { label: "Flash Sale", keywords: ["flash", "limited time"] },
        { label: "Bundle Deal", keywords: ["bundle", "combo", "pack"] },
        { label: "Clearance", keywords: ["clearance", "last piece"] },
    ],
};


function renderProductList(category = null, searchQuery = null, filter = null) {
    if (loadError && products.length === 0) {
        renderHome();
        return;
    }
    let displayProducts = products;
    let title = "All Products";
    let matchedMainCategory = null;
    let activeSubcategory = null;

    if (filter === 'flash') {
        displayProducts = products.filter(p => p.hasValidDiscount);
        title = "Flash Sale";
        if (displayProducts.length === 0) {
            renderHome(); // Hide section if empty
            return;
        }
    } else if (category) {
        matchedMainCategory = Object.keys(subcategoriesMap).find(k => k.toLowerCase() === category.toLowerCase());

        // Check if this is a sub-type filter (e.g. "Sharee|Jamdani", "T-Shirt|Polo")
        let activeSubType = null;
        if (category.includes('|')) {
            const parts = category.split('|');
            const parentSub = parts[0].trim();
            activeSubType = parts[1].trim();
            // Resolve the parent subcategory
            for (const [mainCat, subCats] of Object.entries(subcategoriesMap)) {
                if (subCats.some(sub => sub.toLowerCase() === parentSub.toLowerCase())) {
                    matchedMainCategory = mainCat;
                    activeSubcategory = parentSub;
                    break;
                }
            }
            // Filter by sub-type (generic: Sharee|Jamdani, T-Shirt|Polo, etc.)
            if (activeSubType === 'Others') {
                const knownLabels = (subTypeRules[parentSub] || []).map(r => r.label).filter(l => l !== 'Others');
                displayProducts = products.filter(p => p.subcategory === parentSub && (!p.subType || p.subType === 'Others' || !knownLabels.includes(p.subType)));
            } else {
                displayProducts = products.filter(p => p.subcategory === parentSub && p.subType === activeSubType);
            }
            title = `${activeSubType} ${parentSub}`;
        } else {
            if (!matchedMainCategory) {
                for (const [mainCat, subCats] of Object.entries(subcategoriesMap)) {
                    if (subCats.some(sub => sub.toLowerCase() === category.toLowerCase())) {
                        matchedMainCategory = mainCat;
                        activeSubcategory = category;
                        break;
                    }
                }
            }

            const mainCategoryMatch = products.filter(p => p.category.toLowerCase() === category.toLowerCase());
            if (mainCategoryMatch.length > 0) {
                displayProducts = mainCategoryMatch;
            } else if (activeSubcategory) {
                displayProducts = products.filter(p => p.subcategory && p.subcategory.toLowerCase() === category.toLowerCase());

                if (displayProducts.length === 0) {
                    const searchTerms = category.toLowerCase().split(/[\s/&]+/);
                    displayProducts = products.filter(p => {
                        const name = p.name.toLowerCase();
                        return searchTerms.some(term => term.length > 2 && name.includes(term));
                    });
                }
            } else {
                displayProducts = products.filter(p => p.name.toLowerCase().includes(category.toLowerCase()));
            }
            title = category;
        }
    } else if (searchQuery) {
        displayProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.category.toLowerCase().includes(searchQuery.toLowerCase()));
        title = `Search Results for "${searchQuery}"`;
    }

    // Compute sub-type counts for the 3rd-level filter (works for any subcategory in subTypeRules)
    let subTypeCountsMap = {};
    const activeSubType = category && category.includes('|') ? category.split('|')[1].trim() : null;
    if (activeSubcategory && subTypeRules[activeSubcategory]) {
        const allInSub = products.filter(p => p.subcategory === activeSubcategory);
        const rules = subTypeRules[activeSubcategory];
        const knownLabels = rules.map(r => r.label);
        rules.forEach(r => {
            subTypeCountsMap[r.label] = allInSub.filter(p => p.subType === r.label).length;
        });
        // Count 'Others' = those with no matching rule
        subTypeCountsMap['Others'] = allInSub.filter(p => !p.subType || p.subType === 'Others' || !knownLabels.includes(p.subType)).length;
    }

    currentProductList = displayProducts;
    currentProductPage = 1;

    // Premium Category Navigation
    let mainCategoriesHtml = `
        <div class="flex gap-3 overflow-x-auto pb-4 mb-6 scrollbar-hide border-b border-[var(--border-subtle)]">
            <button class="px-5 py-2.5 rounded-full whitespace-nowrap font-medium transition-all duration-300 ${!matchedMainCategory && !searchQuery ? 'bg-[var(--accent-primary)] text-[var(--bg-dark)]' : 'bg-[var(--bg-card)] text-white border border-[var(--border-color)] hover:border-[var(--accent-primary)]'}" onclick="navigateTo('products')">All Products</button>
            ${Object.keys(subcategoriesMap).map(cat => `
                <button class="px-5 py-2.5 rounded-full whitespace-nowrap font-medium transition-all duration-300 ${matchedMainCategory === cat ? 'bg-[var(--accent-primary)] text-[var(--bg-dark)]' : 'bg-[var(--bg-card)] text-white border border-[var(--border-color)] hover:border-[var(--accent-primary)]'}" onclick="filterCategory('${cat.replace(/'/g, "\\'")}')"> ${cat}</button>
            `).join('')}
        </div>
    `;

    let subcategoriesHtml = '';
    if (matchedMainCategory && subcategoriesMap[matchedMainCategory]) {
        subcategoriesHtml = `
            <div class="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
                <button class="px-4 py-1.5 text-sm rounded-full whitespace-nowrap transition-all duration-300 ${!activeSubcategory ? 'bg-white/20 text-white' : 'bg-transparent text-[var(--text-muted)] border border-white/10 hover:text-white hover:border-white/30'}" onclick="filterCategory('${matchedMainCategory.replace(/'/g, "\\'")}')">All ${matchedMainCategory}</button>
                ${subcategoriesMap[matchedMainCategory].map(sub => `
                    <button class="px-4 py-1.5 text-sm rounded-full whitespace-nowrap transition-all duration-300 ${activeSubcategory && activeSubcategory.toLowerCase() === sub.toLowerCase() ? 'bg-white/20 text-white' : 'bg-transparent text-[var(--text-muted)] border border-white/10 hover:text-white hover:border-white/30'}" onclick="filterCategory('${sub.replace(/'/g, "\\'")}')"> ${sub}</button>
                `).join('')}
            </div>
        `;
        // 3rd-level: SubType filter (works for any subcategory that has rules)
        if (activeSubcategory && subTypeRules[activeSubcategory]) {
            const rules = subTypeRules[activeSubcategory];
            // Build ordered list: defined rule labels + Others (if count > 0)
            const subTypesWithProducts = [];
            rules.forEach(r => { if ((subTypeCountsMap[r.label] || 0) > 0) subTypesWithProducts.push(r.label); });
            if ((subTypeCountsMap['Others'] || 0) > 0) subTypesWithProducts.push('Others');

            if (subTypesWithProducts.length > 1) {
                const allSubLabel = `সব ${activeSubcategory}`;
                subcategoriesHtml += `
                    <div class="scrollbar-hide" style="display:flex;width:100%;gap:8px;overflow-x:auto;padding-bottom:14px;margin-bottom:14px;border-left:3px solid #F59E0B;padding-left:14px;">
                        <button style="padding:5px 14px;border-radius:20px;white-space:nowrap;font-size:0.80rem;font-weight:600;border:none;background:${!activeSubType ? '#F59E0B' : 'rgba(255,255,255,0.07)'};color:${!activeSubType ? '#020617' : '#fff'};cursor:pointer;flex-shrink:0;" onclick="filterCategory('${activeSubcategory.replace(/'/g, "\\'")}')">✦ ${allSubLabel}</button>
                        ${subTypesWithProducts.map(t => `
                            <button style="padding:5px 14px;border-radius:20px;white-space:nowrap;font-size:0.80rem;font-weight:600;border:1px solid ${activeSubType === t ? '#F59E0B' : 'rgba(255,255,255,0.13)'};background:${activeSubType === t ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)'};color:${activeSubType === t ? '#F59E0B' : '#cbd5e1'};cursor:pointer;flex-shrink:0;" onclick="filterCategory('${activeSubcategory.replace(/'/g, "\\'") + '|' + t}')">${t} <span style="opacity:0.55;font-size:0.72rem;">(${subTypeCountsMap[t] || 0})</span></button>
                        `).join('')}
                    </div>
                `;
            }
        }
    }

    document.getElementById('main-content').innerHTML = `
        <div class="py-12 bg-gradient-to-b from-[var(--bg-elevated)] to-transparent border-b border-[var(--border-subtle)] mb-8">
            <div class="container text-center">
                <h1 class="text-3xl md:text-4xl font-bold text-white mb-4">${title}</h1>
                <p class="text-[var(--text-muted)]">Discover our premium selection of ${displayProducts.length} products</p>
            </div>
        </div>
        <section class="container">
            ${mainCategoriesHtml}
            ${subcategoriesHtml}
            
            <div class="flex flex-col sm:flex-row justify-between items-center bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-color)] mb-8 gap-4">
                <div class="text-[var(--text-muted)] font-medium">
                    Showing <span class="text-white">${displayProducts.length}</span> Products Total
                </div>
                <div class="flex items-center gap-3 w-full sm:w-auto">
                    <label class="text-[var(--text-muted)] whitespace-nowrap">Sort by:</label>
                    <div class="relative w-full sm:w-48">
                        <select class="w-full appearance-none bg-[var(--bg-dark)] border border-[var(--border-color)] text-white py-2 px-4 rounded-lg focus:outline-none focus:border-[var(--accent-primary)] cursor-pointer" id="sort-select" onchange="applySort(this.value, '${(category || '').replace(/'/g, "\\'")}', '${(searchQuery || '').replace(/'/g, "\\'")}')">
                            <option value="default">Default Sorting</option>
                            <option value="price-low">Price: Low to High</option>
                            <option value="price-high">Price: High to Low</option>
                            <option value="newest">Newest Arrivals</option>
                        </select>
                        <i class="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"></i>
                    </div>
                </div>
            </div>
            
            ${displayProducts.length > 0 ? `
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6" id="products-grid-container">
                    ${generateProductsHtml(displayProducts.slice(0, PRODUCTS_PER_PAGE))}
                </div>
                ${displayProducts.length > PRODUCTS_PER_PAGE ? `
                <div class="text-center mt-12 mb-8" id="load-more-container">
                    <button id="load-more-btn" class="bg-transparent text-white border-2 border-[var(--border-color)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] font-bold py-3 px-10 rounded-full transition-all duration-300 flex items-center gap-2 mx-auto" onclick="loadMoreProducts()">
                        Load More Products <i class="fas fa-arrow-down"></i>
                    </button>
                </div>
                ` : '<div id="load-more-container"></div>'}
            ` : `
                <div class="py-20 text-center bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)]">
                    <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/5 mb-6">
                        <i class="fas fa-search text-3xl text-[var(--text-muted)]"></i>
                    </div>
                    <h2 class="text-2xl font-bold text-white mb-3">No products found</h2>
                    <p class="text-[var(--text-muted)] mb-8 max-w-md mx-auto">We couldn't find any products matching your criteria. Try adjusting your filters or search terms.</p>
                    <button class="bg-[var(--accent-gradient)] text-[#020617] font-bold py-3 px-8 rounded-full hover:shadow-lg hover:shadow-[var(--accent-primary)]/20 transition-all duration-300" onclick="navigateTo('products')">View All Products</button>
                </div>
            `}
        </section>
    `;
}


window.loadMoreProducts = function() {
    currentProductPage++;
    const start = (currentProductPage - 1) * PRODUCTS_PER_PAGE;
    const end = start + PRODUCTS_PER_PAGE;
    const nextProducts = currentProductList.slice(start, end);
    
    const container = document.getElementById('products-grid-container');
    if (container) {
        container.insertAdjacentHTML('beforeend', generateProductsHtml(nextProducts));
    }
    
    if (end >= currentProductList.length) {
        const btn = document.getElementById('load-more-btn');
        if (btn) btn.style.display = 'none';
    }
}

// Helper: build pagination HTML for home explore section
function buildHomePagination(currentPage, totalPages) {
    const HOME_EXPLORE_PAGE_SIZE = 24;
    if (totalPages <= 1) return '';
    const btnStyle = (active) => `style="min-width:38px;height:38px;border-radius:8px;border:1px solid ${active ? '#F59E0B' : 'rgba(255,255,255,0.12)'};background:${active ? '#F59E0B' : 'rgba(255,255,255,0.05)'};color:${active ? '#020617' : '#fff'};font-weight:${active ? '700' : '500'};cursor:${active ? 'default' : 'pointer'};font-size:0.9rem;transition:all 0.15s;padding:0 10px;"`;
    let html = '';

    // Prev button
    if (currentPage > 1) {
        html += `<button ${btnStyle(false)} onclick="goToHomeExplorePage(${currentPage - 1},${totalPages})" title="Previous"><i class="fas fa-chevron-left" style="font-size:0.8rem;"></i></button>`;
    }

    // Page numbers with ellipsis
    const range = [];
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            range.push(i);
        } else if (range[range.length - 1] !== '...') {
            range.push('...');
        }
    }

    range.forEach(p => {
        if (p === '...') {
            html += `<span style="color:#94a3b8;padding:0 4px;">…</span>`;
        } else {
            html += `<button ${btnStyle(p === currentPage)} ${p !== currentPage ? `onclick="goToHomeExplorePage(${p},${totalPages})"` : 'disabled'}>${p}</button>`;
        }
    });

    // Next button
    if (currentPage < totalPages) {
        html += `<button ${btnStyle(false)} onclick="goToHomeExplorePage(${currentPage + 1},${totalPages})" title="Next"><i class="fas fa-chevron-right" style="font-size:0.8rem;"></i></button>`;
    }

    return html;
}

window.goToHomeExplorePage = function(page, totalPages) {
    const HOME_EXPLORE_PAGE_SIZE = 24;
    homeDiscoverPage = page;
    const start = (page - 1) * HOME_EXPLORE_PAGE_SIZE;
    const end = start + HOME_EXPLORE_PAGE_SIZE;
    const pageBatch = homeDiscoverList.slice(start, end);

    const grid = document.getElementById('home-explore-grid');
    if (grid) {
        grid.innerHTML = pageBatch.map(p => generateProductCard(p)).join('');
    }

    // Update page label
    const label = document.getElementById('home-explore-page-label');
    if (label) label.textContent = page;

    // Rebuild pagination
    const paginationEl = document.getElementById('home-explore-pagination');
    if (paginationEl) {
        paginationEl.innerHTML = buildHomePagination(page, totalPages);
    }

    // Scroll to section top smoothly
    const section = grid ? grid.closest('section') : null;
    if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Legacy: keep old function name as alias for compatibility
window.loadMoreHomeProducts = function() {
    const totalPages = Math.ceil(homeDiscoverList.length / 24);
    goToHomeExplorePage(Math.min(homeDiscoverPage + 1, totalPages), totalPages);
}

window.requestDepositWhatsApp = function() {
    const user = JSON.parse(localStorage.getItem('csgo_user') || 'null');
    const id = user ? (user.phone || user.username || 'Unknown') : 'Unknown';
    const msg = `Hello, I want to deposit balance to my CSGO SHOP account.\nPhone/Username: ${id}\nPlease add the balance after verifying my payment.`;
    window.open(`https://wa.me/8801873827520?text=${encodeURIComponent(msg)}`, '_blank');
}

window.applySort = function(sortType, category, searchQuery) {
    let displayProducts = products;
    if (category && category !== 'null') {
        let activeSubcategory = null;
        let matchedMainCategory = Object.keys(subcategoriesMap).find(k => k.toLowerCase() === category.toLowerCase());
        
        if (!matchedMainCategory) {
            for (const [mainCat, subCats] of Object.entries(subcategoriesMap)) {
                if (subCats.some(sub => sub.toLowerCase() === category.toLowerCase())) {
                    matchedMainCategory = mainCat;
                    activeSubcategory = category;
                    break;
                }
            }
        }

        const mainCategoryMatch = products.filter(p => p.category.toLowerCase() === category.toLowerCase());
        if (mainCategoryMatch.length > 0) {
            displayProducts = mainCategoryMatch;
        } else if (activeSubcategory) {
            displayProducts = products.filter(p => p.subcategory && p.subcategory.toLowerCase() === category.toLowerCase());
            if (displayProducts.length === 0) {
                const searchTerms = category.toLowerCase().split(/[\s/&]+/);
                displayProducts = products.filter(p => {
                    const name = p.name.toLowerCase();
                    return searchTerms.some(term => term.length > 2 && name.includes(term));
                });
            }
        } else {
            displayProducts = products.filter(p => p.name.toLowerCase().includes(category.toLowerCase()));
        }
    } else if (searchQuery && searchQuery !== 'null') {
        displayProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.category.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    let sortedProducts = [...displayProducts];
    if (sortType === 'price-low') {
        sortedProducts.sort((a, b) => a.price - b.price);
    } else if (sortType === 'price-high') {
        sortedProducts.sort((a, b) => b.price - a.price);
    } else if (sortType === 'newest') {
        sortedProducts.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
    }

    currentProductList = sortedProducts;
    currentProductPage = 1;

    const container = document.getElementById('products-grid-container');
    if (container) {
        container.innerHTML = generateProductsHtml(sortedProducts.slice(0, PRODUCTS_PER_PAGE));
    }
    
    const loadMoreContainer = document.getElementById('load-more-container');
    if (loadMoreContainer) {
        if (sortedProducts.length > PRODUCTS_PER_PAGE) {
            loadMoreContainer.innerHTML = `<button id="load-more-btn" class="btn btn-outline" onclick="loadMoreProducts()">Load More</button>`;
        } else {
            loadMoreContainer.innerHTML = '';
        }
    }
}


function renderProductDetails(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return navigateTo('home');

    const relatedProducts = products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4);

    const reviews = JSON.parse(localStorage.getItem('csgo_reviews')) || {};
    const productReviews = reviews[product.id] || [];
    let avgRating = 0;
    if (productReviews.length > 0) {
        const sum = productReviews.reduce((acc, review) => acc + review.rating, 0);
        avgRating = Math.round(sum / productReviews.length);
    }

    let allImages = [product.detailImageUrl || product.thumbnailImageUrl || product.thumbnail_img || product.image];
    if (product.images && product.images.length > 0) {
        product.images.forEach(img => {
            let formattedImg = img.trim();
            if (formattedImg.startsWith('http') && !formattedImg.includes('wsrv.nl')) {
                formattedImg = 'https://wsrv.nl/?url=' + encodeURIComponent(formattedImg) + '&w=1200&q=90&fit=contain&output=webp';
            } else if (formattedImg.includes('wsrv.nl')) {
                formattedImg = formattedImg.replace(/&w=\d+/, '&w=1200').replace(/&h=\d+/, '').replace(/&fit=\w+/, '&fit=contain');
            }
            if (!allImages.includes(formattedImg) && !allImages.includes(img) && formattedImg !== '') {
                allImages.push(formattedImg);
            }
        });
    }
    
    // Centralized image fallback handles errors via global event listener

    document.getElementById('main-content').innerHTML = `
        <div class="py-8 border-b border-[var(--border-subtle)] bg-[var(--bg-card)]">
            <div class="container">
                <!-- Breadcrumbs -->
                <nav class="flex text-[var(--text-muted)] text-sm mb-6" aria-label="Breadcrumb">
                  <ol class="inline-flex items-center space-x-1 md:space-x-3">
                    <li class="inline-flex items-center">
                      <a href="#" onclick="navigateTo('home'); return false;" class="hover:text-white transition-colors">Home</a>
                    </li>
                    <li>
                      <div class="flex items-center">
                        <i class="fas fa-chevron-right text-xs mx-2"></i>
                        <a href="#" onclick="navigateTo('products', '${product.category}'); return false;" class="hover:text-white transition-colors">${product.category}</a>
                      </div>
                    </li>
                    ${product.subcategory ? `
                    <li>
                      <div class="flex items-center">
                        <i class="fas fa-chevron-right text-xs mx-2"></i>
                        <a href="#" onclick="navigateTo('products', '${product.subcategory}'); return false;" class="hover:text-white transition-colors">${product.subcategory}</a>
                      </div>
                    </li>
                    ` : ''}
                    <li aria-current="page">
                      <div class="flex items-center">
                        <i class="fas fa-chevron-right text-xs mx-2"></i>
                        <span class="text-white font-medium line-clamp-1">${product.name}</span>
                      </div>
                    </li>
                  </ol>
                </nav>

                <div class="flex flex-col lg:flex-row gap-10">
                    <!-- Gallery Section -->
                    <div class="w-full lg:w-1/2 flex flex-col gap-4">
                        <div class="relative aspect-square rounded-2xl overflow-hidden bg-[var(--bg-dark)] border border-[var(--border-color)]">
                            ${getBadgeHtml(product.badge)}
                            <img id="main-product-image" src="${allImages[0]}" data-original-src="${product.originalImageUrl}" data-fallback-stage="optimized" alt="${product.name}" class="w-full h-full object-contain p-4 transition-transform duration-500 hover:scale-110 cursor-zoom-in">
                            <button onclick="toggleWishlist('${product.id}')" class="absolute top-4 right-4 w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-[var(--accent-primary)] hover:text-black transition-all border border-white/20 shadow-xl z-20">
                                <i class="far fa-heart text-xl"></i>
                            </button>
                        </div>
                        
                        ${allImages.length > 1 ? `
                        <div class="grid grid-cols-4 sm:grid-cols-5 gap-3">
                            ${allImages.map((img, idx) => `
                                <div class="aspect-square rounded-xl overflow-hidden border-2 ${idx === 0 ? 'border-[var(--accent-primary)]' : 'border-transparent'} cursor-pointer bg-[var(--bg-dark)] hover:border-white/50 transition-colors" onclick="updateMainImage('${img}', this)">
                                    <img src="${img}" data-original-src="${product.originalImageUrl}" data-fallback-stage="optimized" class="w-full h-full object-cover">
                                </div>
                            `).join('')}
                        </div>
                        ` : ''}
                    </div>

                    <!-- Details Section -->
                    <div class="w-full lg:w-1/2 flex flex-col">
                        <div class="mb-6">
                            <h1 class="text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight">${product.name}</h1>
                            
                            <div class="flex items-center gap-4 mb-4">
                                <div class="flex text-[var(--accent-primary)] text-lg">
                                    ${'<i class="fas fa-star"></i>'.repeat(avgRating)}
                                    ${'<i class="far fa-star text-[var(--text-muted)]"></i>'.repeat(5 - avgRating)}
                                </div>
                                <span class="text-[var(--text-muted)]">(${productReviews.length} Reviews)</span>
                                <span class="text-[var(--border-medium)]">|</span>
                                ${product.badge === 'stock-out' ? 
                                    '<span class="text-[var(--danger)] bg-[var(--danger)]/10 px-3 py-1 rounded-full text-sm font-semibold"><i class="fas fa-times-circle mr-1"></i> Out of Stock</span>' : 
                                    '<span class="text-[var(--success)] bg-[var(--success)]/10 px-3 py-1 rounded-full text-sm font-semibold"><i class="fas fa-check-circle mr-1"></i> In Stock</span>'}
                            </div>

                            <div class="flex items-end gap-3 mb-6">
                                <span class="text-4xl font-black text-white">৳${product.price}</span>
                                ${product.originalPrice && product.originalPrice > product.price ? 
                                    `<span class="text-xl text-[var(--text-muted)] line-through mb-1">৳${product.originalPrice}</span>
                                    <span class="bg-[var(--danger)] text-white text-xs font-bold px-2 py-1 rounded mb-1 ml-2">${Math.round((1 - product.price/product.originalPrice)*100)}% OFF</span>` : ''}
                            </div>
                        </div>

                        ${product.variants ? `
                            <div class="space-y-4 mb-8">
                                ${Object.entries(product.variants).map(([variantName, options]) => `
                                    <div>
                                        <label class="block text-sm font-medium text-white mb-2">${variantName}</label>
                                        <div class="flex flex-wrap gap-2">
                                            ${options.map((opt, i) => `
                                                <div class="relative">
                                                    <input type="radio" name="variant-${variantName}" id="var-${variantName}-${i}" value="${opt}" class="peer sr-only" ${i===0 ? 'checked' : ''}>
                                                    <label for="var-${variantName}-${i}" class="px-4 py-2 bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-muted)] rounded-lg cursor-pointer hover:border-white/50 peer-checked:border-[var(--accent-primary)] peer-checked:text-white transition-all font-medium inline-block">
                                                        ${opt}
                                                    </label>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}

                        <!-- Action Buttons -->
                        <div class="flex flex-col sm:flex-row gap-4 mb-6">
                            <button class="flex-1 bg-[var(--accent-gradient)] text-black font-bold text-lg py-4 px-8 rounded-xl shadow-lg hover:shadow-[var(--accent-primary)]/20 transition-all flex justify-center items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group" 
                                onclick="addToCart('${product.id}', event, true)" ${product.badge === 'stock-out' ? 'disabled' : ''}>
                                <i class="fas fa-shopping-cart group-hover:scale-110 transition-transform"></i> Add to Cart
                            </button>
                            <button class="bg-[#25D366] text-white font-bold text-lg py-4 px-8 rounded-xl shadow-lg hover:shadow-[#25D366]/20 transition-all flex justify-center items-center gap-3 group" 
                                onclick="window.open('https://wa.me/8801873827520?text=I want to know more about: ${encodeURIComponent(product.name)}', '_blank')">
                                <i class="fab fa-whatsapp text-xl group-hover:scale-110 transition-transform"></i> Order via WhatsApp
                            </button>
                        </div>

                        <!-- Marketing Partner Reselling Kit -->
                        <div class="bg-[var(--bg-dark)] border border-[var(--accent-primary)]/30 rounded-xl p-4 mb-8">
                            <div class="flex items-center justify-between mb-3">
                                <div class="flex items-center gap-2">
                                    <i class="fas fa-bullhorn text-[var(--accent-primary)]"></i>
                                    <span class="text-sm font-bold text-white">Partner Reselling Tools</span>
                                </div>
                                <span class="text-xs bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] px-2.5 py-0.5 rounded-full font-bold">4% - 15% Comm.</span>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <button type="button" onclick="copyPartnerProductKit('${product.id}')" class="bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent-primary)] text-white text-xs font-semibold py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 transition-all">
                                    <i class="far fa-copy text-[var(--accent-primary)]"></i> Copy Promo Description
                                </button>
                                <button type="button" onclick="downloadProductImage('${product.id}')" class="bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent-primary)] text-white text-xs font-semibold py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 transition-all">
                                    <i class="fas fa-download text-[var(--accent-primary)]"></i> Download Image (HD)
                                </button>
                            </div>
                        </div>
                        
                        <!-- Trust Badges -->
                        <div class="grid grid-cols-2 gap-4 py-6 border-t border-b border-[var(--border-color)] mb-8">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-full bg-[var(--bg-dark)] flex items-center justify-center text-[var(--accent-primary)]"><i class="fas fa-truck"></i></div>
                                <div><div class="text-sm font-semibold text-white">Fast Delivery</div><div class="text-xs text-[var(--text-muted)]">1-4 Days BD</div></div>
                            </div>
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-full bg-[var(--bg-dark)] flex items-center justify-center text-[var(--accent-primary)]"><i class="fas fa-shield-alt"></i></div>
                                <div><div class="text-sm font-semibold text-white">Secure Checkout</div><div class="text-xs text-[var(--text-muted)]">100% Protected</div></div>
                            </div>
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-full bg-[var(--bg-dark)] flex items-center justify-center text-[var(--accent-primary)]"><i class="fas fa-undo"></i></div>
                                <div><div class="text-sm font-semibold text-white">Easy Returns</div><div class="text-xs text-[var(--text-muted)]">7 Days Policy</div></div>
                            </div>
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-full bg-[var(--bg-dark)] flex items-center justify-center text-[var(--accent-primary)]"><i class="fas fa-headset"></i></div>
                                <div><div class="text-sm font-semibold text-white">24/7 Support</div><div class="text-xs text-[var(--text-muted)]">Always Here</div></div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>

        <div class="container py-12">
            <!-- Tabs for Info -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div class="lg:col-span-2">
                    <div class="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden mb-10">
                        <div class="border-b border-[var(--border-color)] flex">
                            <button class="px-8 py-4 font-bold text-white border-b-2 border-[var(--accent-primary)] bg-white/5">Description</button>
                            <!-- could add more tabs here -->
                        </div>
                        <div class="p-8 text-[var(--text-color)] leading-relaxed prose prose-invert max-w-none">
                            ${product.desc.replace(/\n/g, '<br>')}
                        </div>
                    </div>
                    
                    <!-- Reviews Section -->
                    <div class="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-8">
                        <h2 class="text-2xl font-bold text-white mb-8 flex items-center gap-3"><i class="fas fa-star text-[var(--accent-primary)]"></i> Customer Reviews</h2>
                        
                        <div class="grid md:grid-cols-3 gap-8 mb-10 pb-10 border-b border-[var(--border-color)]">
                            <div class="text-center">
                                <div class="text-5xl font-black text-white mb-2">${avgRating.toFixed(1)}</div>
                                <div class="text-[var(--accent-primary)] text-xl mb-1">
                                    ${'<i class="fas fa-star"></i>'.repeat(avgRating)}
                                    ${'<i class="far fa-star text-[var(--text-muted)]"></i>'.repeat(5 - avgRating)}
                                </div>
                                <div class="text-[var(--text-muted)]">Based on ${productReviews.length} reviews</div>
                            </div>
                            
                            <div class="md:col-span-2 bg-[var(--bg-dark)] p-6 rounded-xl border border-[var(--border-subtle)]">
                                <h3 class="font-bold text-white mb-4">Write a Review</h3>
                                <form id="review-form" onsubmit="submitReview(event, '${product.id}')" class="space-y-4">
                                    <div class="flex items-center gap-4">
                                        <label class="text-sm font-medium text-[var(--text-muted)]">Your Rating:</label>
                                        <div class="text-[var(--accent-primary)] text-xl cursor-pointer flex gap-1 star-rating">
                                            <i class="far fa-star" onclick="setRating(1)" data-rating="1"></i>
                                            <i class="far fa-star" onclick="setRating(2)" data-rating="2"></i>
                                            <i class="far fa-star" onclick="setRating(3)" data-rating="3"></i>
                                            <i class="far fa-star" onclick="setRating(4)" data-rating="4"></i>
                                            <i class="far fa-star" onclick="setRating(5)" data-rating="5"></i>
                                        </div>
                                        <input type="hidden" id="review-rating" value="0" required>
                                    </div>
                                    <input type="text" id="review-name" placeholder="Your Name" required class="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[var(--accent-primary)]">
                                    <textarea id="review-comment" rows="3" placeholder="Share your experience with this product..." required class="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[var(--accent-primary)]"></textarea>
                                    <button type="submit" class="bg-[var(--accent-primary)] text-black font-bold px-6 py-2 rounded-lg hover:bg-[var(--accent-primary)]/90 transition-colors">Submit Review</button>
                                </form>
                            </div>
                        </div>

                        <div id="reviews-list" class="space-y-6">
                            ${renderReviewsList(product.id)}
                        </div>
                    </div>
                </div>

                <div class="lg:col-span-1 space-y-8">
                    <!-- Delivery Info Widget -->
                    <div class="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6">
                        <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2"><i class="fas fa-shipping-fast text-[var(--accent-primary)]"></i> Delivery Info</h3>
                        <div class="space-y-4">
                            <div class="flex justify-between items-center py-3 border-b border-[var(--border-subtle)]">
                                <span class="text-[var(--text-color)]">Inside Dhaka (1-2 days)</span>
                                <span class="font-bold text-[var(--accent-primary)]">৳60</span>
                            </div>
                            <div class="flex justify-between items-center py-3 border-b border-[var(--border-subtle)]">
                                <span class="text-[var(--text-color)]">Dhaka Sub Area (1-2 days)</span>
                                <span class="font-bold text-[var(--accent-primary)]">৳100</span>
                            </div>
                            <div class="flex justify-between items-center py-3">
                                <span class="text-[var(--text-color)]">Outside Dhaka (2-4 days)</span>
                                <span class="font-bold text-[var(--accent-primary)]">৳120</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            ${relatedProducts.length > 0 ? `
                <div class="mt-20">
                    <h2 class="text-2xl font-bold text-white mb-8">You May Also Like</h2>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                        ${generateProductsHtml(relatedProducts)}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

window.updateMainImage = function(src, element) {
    document.getElementById('main-product-image').src = src;
    // Update active border
    const siblings = element.parentElement.children;
    for(let el of siblings) {
        el.classList.remove('border-[var(--accent-primary)]');
        el.classList.add('border-transparent');
    }
    element.classList.remove('border-transparent');
    element.classList.add('border-[var(--accent-primary)]');
}


// Review System Logic
let currentRating = 0;

window.setRating = function(rating) {
    currentRating = rating;
    document.getElementById('review-rating').value = rating;
    const stars = document.querySelectorAll('.star-rating i');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.remove('far');
            star.classList.add('fas');
        } else {
            star.classList.remove('fas');
            star.classList.add('far');
        }
    });
};

window.submitReview = function(event, productId) {
    event.preventDefault();
    
    const rating = document.getElementById('review-rating').value;
    if (rating == 0) {
        alert('Please select a rating');
        return;
    }

    const name = document.getElementById('review-name').value;
    const comment = document.getElementById('review-comment').value;
    
    const reviews = JSON.parse(localStorage.getItem('csgo_reviews')) || {};
    if (!reviews[productId]) {
        reviews[productId] = [];
    }
    
    reviews[productId].unshift({
        name,
        rating: parseInt(rating),
        comment,
        date: new Date().toLocaleDateString()
    });
    
    localStorage.setItem('csgo_reviews', JSON.stringify(reviews));
    
    // Reset form
    event.target.reset();
    setRating(0);
    
    // Update reviews list
    const reviewsListEl = document.getElementById('reviews-list');
    if (reviewsListEl) {
        reviewsListEl.innerHTML = renderReviewsList(productId);
    }
    
    // Show success message
    alert('Thank you for your review!');
};


function renderReviewsList(productId) {
    const reviews = JSON.parse(localStorage.getItem('csgo_reviews')) || {};
    const productReviews = reviews[productId] || [];
    
    if (productReviews.length === 0) {
        return '<p class="text-[var(--text-muted)] italic">No reviews yet. Be the first to review this product!</p>';
    }
    
    return productReviews.map(review => `
        <div class="bg-[var(--bg-dark)] p-6 rounded-xl border border-[var(--border-subtle)]">
            <div class="flex justify-between items-start mb-3">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-white font-bold">
                        ${review.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <strong class="text-white block">${review.name}</strong>
                        <span class="text-[var(--text-muted)] text-xs">${review.date}</span>
                    </div>
                </div>
                <div class="flex text-[var(--accent-primary)] text-sm">
                    ${'<i class="fas fa-star"></i>'.repeat(review.rating)}
                    ${'<i class="far fa-star text-[var(--text-muted)]"></i>'.repeat(5 - review.rating)}
                </div>
            </div>
            <p class="text-[var(--text-color)] leading-relaxed mt-2">${review.comment}</p>
        </div>
    `).join('');
}


function renderAbout() {
    document.getElementById('main-content').innerHTML = `
        <div class="page-header">
            <div class="container">
                <h1>About CSGO SHOP</h1>
            </div>
        </div>
        <div class="container page-content">
            <h2>Our Story</h2>
            <p>Welcome to CSGO SHOP, your number one source for all things fashion, electronics, and lifestyle. We're dedicated to giving you the very best of products, with a focus on dependability, customer service, and uniqueness.</p>
            <p>Founded with a vision to simplify online shopping, CSGO SHOP has come a long way from its beginnings. When we first started out, our passion for providing the best equipment drove us to do intense research, and gave us the impetus to turn hard work and inspiration into to a booming online store.</p>
            <h2>Our Mission</h2>
            <p>We now serve customers all over the world, and are thrilled to be a part of the quirky, eco-friendly, fair trade wing of the ecommerce industry. We hope you enjoy our products as much as we enjoy offering them to you.</p>
            <p>If you have any questions or comments, please don't hesitate to contact us.</p>
        </div>
    `;
}

function renderContact() {
    document.getElementById('main-content').innerHTML = `
        <div class="page-header">
            <div class="container">
                <h1>Contact Us</h1>
            </div>
        </div>
        <div class="container page-content contact-grid">
            <div>
                <h2>Get in Touch</h2>
                <p>Have a question or feedback? Fill out the form below and we'll get back to you as soon as possible.</p>
                <form class="contact-form" onsubmit="event.preventDefault(); alert('Message sent successfully!'); this.reset();">
                    <div class="form-group">
                        <input type="text" placeholder="Your Name" required>
                    </div>
                    <div class="form-group">
                        <input type="email" placeholder="Your Email" required>
                    </div>
                    <div class="form-group">
                        <input type="text" placeholder="Subject" required>
                    </div>
                    <div class="form-group">
                        <textarea rows="5" placeholder="Your Message" required></textarea>
                    </div>
                    <button type="submit" class="btn">Send Message</button>
                </form>
            </div>
            <div>
                <h2>Contact Information</h2>
                <div style="margin-top: 20px;">
                    <p style="margin-bottom: 15px;"><i class="fas fa-phone" style="color: var(--accent-color); margin-right: 10px; width: 20px;"></i> +8809638773939</p>
                    <p style="margin-bottom: 15px;"><i class="fab fa-whatsapp" style="color: var(--accent-color); margin-right: 10px; width: 20px;"></i> 01873827520</p>
                    <p style="margin-bottom: 15px;"><i class="fas fa-envelope" style="color: var(--accent-color); margin-right: 10px; width: 20px;"></i> csglobal.org@gmail.com</p>
                    <p style="margin-bottom: 15px;"><i class="fab fa-facebook" style="color: var(--accent-color); margin-right: 10px; width: 20px;"></i> <a href="https://www.facebook.com/profile.php?id=61587369655547" target="_blank" style="color: var(--text-color); text-decoration: none;">CS Global Facebook Page</a></p>
                    <p style="margin-bottom: 15px;"><i class="fas fa-clock" style="color: var(--accent-color); margin-right: 10px; width: 20px;"></i> Mon - Fri: 9:00 AM - 6:00 PM</p>
                </div>
            </div>
        </div>
    `;
}

// ============================================================================
// CSGO SHOP MARKETING PARTNER REWARDS & GROWTH PROGRAM
// ============================================================================

const PARTNER_MILESTONES = [
    { target: 50, bonus: 300, boost: 0, rank: 'Bronze Partner 🥉', travel: null, title: '50 Orders' },
    { target: 100, bonus: 700, boost: 0, rank: 'Bronze Partner 🥉', travel: null, title: '100 Orders' },
    { target: 200, bonus: 2000, boost: 1, rank: 'Silver Partner 🥈', travel: "Cox's Bazar (1D/1N)", travelItinerary: 'Cox\'s Bazar • Himchari • Inani Beach • Marine Drive', title: '200 Orders' },
    { target: 500, bonus: 4500, boost: 2, rank: 'Gold Partner 🥇', travel: 'Srimangal (2D/1N)', travelItinerary: 'Tea Gardens • Lawachara • Madhabpur Lake • Sightseeing', title: '500 Orders' },
    { target: 1000, bonus: 9000, boost: 3, rank: 'Platinum Partner 💎', travel: 'Rangamati / Sajek (2D/1N)', travelItinerary: 'Sajek Valley • Helipad Sunset • Konglak Peak • Local Tour', title: '1,000 Orders' },
    { target: 2000, bonus: 20000, boost: 5, rank: 'Elite Partner 👑', travel: 'Premium Bangladesh Tour (3D/2N)', travelItinerary: 'Bandarban / Sundarbans / Saint Martin / Kuakata Premium Tour', title: '2,000 Orders' }
];

window.renderAffiliate = async function() {
    const main = document.getElementById('main-content');
    if (!main) return;

    // Fetch real registration data for the 100 slots counter
    let filledSlots = 48; // sensible default
    let availableSlots = 52;
    try {
        const SUPABASE_USER_API = 'https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/user-data';
        const res = await apiFetch(SUPABASE_USER_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_partner_public_stats', auth: { phone: 'public' } })
        });
        if (res && res.ok) {
            const data = await res.json();
            if (data.filledSlots !== undefined) {
                filledSlots = data.filledSlots;
                availableSlots = data.availableSlots;
            }
        }
    } catch (e) {
        console.warn('Could not fetch real partner slot count:', e);
    }

    const userStr = localStorage.getItem('csgo_user');
    const isLoggedIn = !!userStr;

    main.innerHTML = `
        <!-- Hero Section -->
        <div class="py-16 md:py-24 bg-gradient-to-b from-[var(--bg-elevated)] via-[var(--bg-dark)] to-transparent border-b border-[var(--border-subtle)] relative overflow-hidden">
            <div class="absolute -right-24 -top-24 w-96 h-96 bg-[var(--accent-primary)]/10 blur-[120px] rounded-full pointer-events-none"></div>
            <div class="absolute -left-24 -bottom-24 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full pointer-events-none"></div>
            
            <div class="container text-center relative z-10 max-w-4xl mx-auto px-4">
                <!-- Slot counter badge -->
                <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--bg-card)] border border-[var(--accent-primary)]/40 text-[var(--accent-primary)] text-xs md:text-sm font-bold mb-6 shadow-lg shadow-[var(--accent-primary)]/10 animate-pulse">
                    <i class="fas fa-fire"></i> Limited Recruitment — ${filledSlots} / 100 Marketing Partner Slots Filled (${availableSlots} Remaining)
                </div>

                <h1 class="text-3xl sm:text-5xl md:text-6xl font-black text-white mb-6 leading-tight tracking-tight">
                    Become a <span class="bg-clip-text text-transparent bg-gradient-to-r from-[#F5A623] via-[#FBBF24] to-[#F59E0B]">CSGO SHOP</span> Marketing Partner
                </h1>

                <p class="text-[var(--text-muted)] text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-8 leading-relaxed">
                    Promote our top-tier products, generate verified sales and earn generous commissions, cash performance bonuses and exclusive all-expenses-paid Bangladesh travel rewards.
                </p>

                <!-- Key Commission Highlight -->
                <div class="inline-block bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 sm:p-6 mb-10 shadow-2xl">
                    <div class="text-xs uppercase tracking-widest text-[var(--text-muted)] font-semibold mb-1">Base Commission Structure</div>
                    <div class="text-2xl sm:text-4xl font-black text-white flex items-center justify-center gap-2">
                        <span class="text-[var(--accent-primary)]">4% – 15%</span> Commission Per Successful Sale
                    </div>
                    <div class="text-xs text-[var(--text-muted)] mt-2">No product stocking or upfront investment required. Zero risk reselling.</div>
                </div>

                <!-- CTA Buttons -->
                <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
                    ${isLoggedIn ? `
                        <button onclick="navigateTo('account')" class="w-full sm:w-auto bg-[var(--accent-gradient)] text-black font-extrabold text-base py-4 px-8 rounded-xl shadow-xl hover:shadow-[var(--accent-primary)]/30 transition-all flex items-center justify-center gap-3">
                            <i class="fas fa-chart-line"></i> Open Partner Dashboard
                        </button>
                    ` : `
                        <button onclick="openAuthModal('register')" class="w-full sm:w-auto bg-[var(--accent-gradient)] text-black font-extrabold text-base py-4 px-8 rounded-xl shadow-xl hover:shadow-[var(--accent-primary)]/30 transition-all flex items-center justify-center gap-3">
                            <i class="fas fa-rocket"></i> Join as Marketing Partner
                        </button>
                        <button onclick="openAuthModal('login')" class="w-full sm:w-auto bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-white text-white font-bold text-base py-4 px-8 rounded-xl transition-all">
                            Partner Login
                        </button>
                    `}
                    <button onclick="document.getElementById('how-it-works-section').scrollIntoView({ behavior: 'smooth' })" class="w-full sm:w-auto text-[var(--text-muted)] hover:text-white font-medium text-sm py-4 px-6 flex items-center justify-center gap-2">
                        Learn How It Works <i class="fas fa-arrow-down"></i>
                    </button>
                </div>
            </div>
        </div>

        <div class="container py-16 px-4 max-w-6xl mx-auto space-y-20">

            <!-- 4-Step How It Works Section -->
            <div id="how-it-works-section" class="scroll-mt-24">
                <div class="text-center max-w-2xl mx-auto mb-12">
                    <h2 class="text-2xl sm:text-4xl font-extrabold text-white mb-3">How The Marketing Partner Program Works</h2>
                    <p class="text-[var(--text-muted)] text-sm sm:text-base">Start earning in 4 simple steps without buying any inventory or handling deliveries.</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div class="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 relative group hover:border-[var(--accent-primary)]/50 transition-all">
                        <div class="w-12 h-12 rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-black text-xl flex items-center justify-center mb-5 border border-[var(--accent-primary)]/30">1</div>
                        <h3 class="text-lg font-bold text-white mb-2">Create Partner Account</h3>
                        <p class="text-[var(--text-muted)] text-sm leading-relaxed">Register free on CSGO SHOP and get your instant unique Partner Referral Link & Code.</p>
                    </div>

                    <div class="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 relative group hover:border-[var(--accent-primary)]/50 transition-all">
                        <div class="w-12 h-12 rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-black text-xl flex items-center justify-center mb-5 border border-[var(--accent-primary)]/30">2</div>
                        <h3 class="text-lg font-bold text-white mb-2">Select Top Products</h3>
                        <p class="text-[var(--text-muted)] text-sm leading-relaxed">Browse thousands of trending fashion, gadgets, and lifestyle items with verified stock.</p>
                    </div>

                    <div class="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 relative group hover:border-[var(--accent-primary)]/50 transition-all">
                        <div class="w-12 h-12 rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-black text-xl flex items-center justify-center mb-5 border border-[var(--accent-primary)]/30">3</div>
                        <h3 class="text-lg font-bold text-white mb-2">1-Click Resell Kit</h3>
                        <p class="text-[var(--text-muted)] text-sm leading-relaxed">Download high-definition product photos & copy ready-made promo descriptions with your link.</p>
                    </div>

                    <div class="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 relative group hover:border-[var(--accent-primary)]/50 transition-all">
                        <div class="w-12 h-12 rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-black text-xl flex items-center justify-center mb-5 border border-[var(--accent-primary)]/30">4</div>
                        <h3 class="text-lg font-bold text-white mb-2">Promote & Earn</h3>
                        <p class="text-[var(--text-muted)] text-sm leading-relaxed">Share on Facebook, WhatsApp, TikTok, Instagram. When order delivers, commission credits automatically!</p>
                    </div>
                </div>
            </div>

            <!-- Commission & Eligibility Rules Section -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <!-- Commission System Card -->
                <div class="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 sm:p-8">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-xl"><i class="fas fa-percentage"></i></div>
                        <h3 class="text-xl font-bold text-white">Dynamic Commission System</h3>
                    </div>
                    <div class="text-3xl font-black text-[var(--accent-primary)] mb-4">4% – 15% Per Successful Sale</div>
                    <p class="text-[var(--text-muted)] text-sm leading-relaxed mb-4">
                        Commission is calculated based on the applicable product and category commission rate. Higher margin items yield higher commission rates.
                    </p>
                    <div class="bg-[var(--bg-dark)] rounded-xl p-4 border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] space-y-2">
                        <div class="flex justify-between items-center text-white font-medium">
                            <span>Example Calculation:</span>
                            <span class="text-[var(--accent-primary)]">৳2,000 Order × 10% = ৳200 Commission</span>
                        </div>
                        <div>+ Plus milestone cash bonuses and future commission boosts (+1% up to +5%).</div>
                    </div>
                </div>

                <!-- Strict Order Eligibility Card -->
                <div class="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 sm:p-8">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center text-xl"><i class="fas fa-shield-check"></i></div>
                        <h3 class="text-xl font-bold text-white">Order Eligibility Standards</h3>
                    </div>
                    <p class="text-xs text-[var(--text-muted)] mb-4">Central Financial Metric: <strong class="text-white">Successful Order = Valid + Delivered + Not Returned + Not Refunded</strong></p>
                    
                    <div class="space-y-3 text-xs">
                        <div class="flex items-start gap-2.5 text-green-400 bg-green-950/20 p-3 rounded-lg border border-green-800/30">
                            <i class="fas fa-check-circle mt-0.5"></i>
                            <span><strong>COUNT TOWARD REWARDS:</strong> Successfully Delivered and non-returned valid customer orders.</span>
                        </div>
                        <div class="flex items-start gap-2.5 text-rose-400 bg-rose-950/20 p-3 rounded-lg border border-rose-800/30">
                            <i class="fas fa-times-circle mt-0.5"></i>
                            <span><strong>DO NOT COUNT:</strong> Cancelled, Returned, Refunded, Fake/Fraudulent, Duplicate, Unpaid, or Pending/Processing orders.</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- "Grow With Us" Milestone Timeline & Travel Rewards -->
            <div>
                <div class="text-center max-w-2xl mx-auto mb-12">
                    <div class="text-xs uppercase tracking-widest text-[var(--accent-primary)] font-bold mb-2">Gamified Rank & Milestone Progression</div>
                    <h2 class="text-2xl sm:text-4xl font-extrabold text-white mb-3">Partner Growth & Travel Rewards</h2>
                    <p class="text-[var(--text-muted)] text-sm sm:text-base">Reach verified order milestones to unlock cash rewards, permanent commission boosts, and luxury tour packages.</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${PARTNER_MILESTONES.map((m, idx) => `
                        <div class="bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent-primary)]/50 rounded-2xl p-6 relative flex flex-col justify-between transition-all">
                            <div>
                                <div class="flex justify-between items-center mb-4">
                                    <span class="text-xs font-bold px-3 py-1 rounded-full bg-[var(--bg-dark)] text-white border border-[var(--border-subtle)]">Tier ${idx + 1}</span>
                                    <span class="text-xs font-bold text-[var(--accent-primary)]">${m.rank}</span>
                                </div>
                                <div class="text-3xl font-black text-white mb-2">${m.target}+ Orders</div>
                                <div class="text-xl font-bold text-green-400 mb-3">৳${m.bonus.toLocaleString()} Cash Bonus</div>
                                
                                <div class="space-y-2 py-3 border-t border-b border-[var(--border-subtle)] text-xs text-[var(--text-muted)] mb-4">
                                    <div class="flex items-center gap-2">
                                        <i class="fas fa-bolt text-amber-400"></i>
                                        <span>Commission Boost: <strong class="text-white">${m.boost > 0 ? `+${m.boost}% on future orders` : 'Base rate'}</strong></span>
                                    </div>
                                    ${m.travel ? `
                                        <div class="flex items-start gap-2 text-sky-400">
                                            <i class="fas fa-plane-departure mt-0.5"></i>
                                            <span><strong>${m.travel}</strong><br><span class="text-[11px] text-[var(--text-muted)]">${m.travelItinerary}</span></span>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                            <div class="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
                                <i class="fas fa-info-circle text-[var(--accent-primary)]"></i> Verified delivered orders only
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Terms & Transparency -->
            <div class="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 sm:p-8">
                <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <i class="fas fa-file-contract text-[var(--accent-primary)]"></i> Program Terms & Transparency
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[var(--text-muted)] leading-relaxed">
                    <div class="space-y-2">
                        <p>• All bonuses, commission boosts and travel rewards are calculated strictly based on valid, successfully delivered and non-returned orders.</p>
                        <p>• CSGO SHOP reserves the right to verify orders and review accounts for abnormal or fraudulent activity before approving payouts and rewards.</p>
                        <p>• Commission boosts apply to future eligible orders and are not retroactive.</p>
                    </div>
                    <div class="space-y-2">
                        <p>• Travel dates, transportation, accommodation, and itineraries are arranged according to company schedule, campaign policy, and availability.</p>
                        <p>• If a cash alternative is offered by CSGO SHOP for a travel reward, the partner may select either the tour or the cash alternative (not both).</p>
                        <p>• Payouts are transferred directly to verified bKash, Nagad, or Bank accounts with full transaction logs.</p>
                    </div>
                </div>
            </div>

            <!-- Final Action Banner -->
            <div class="bg-gradient-to-r from-[#F5A623]/20 via-[#FBBF24]/10 to-transparent border border-[var(--accent-primary)]/40 rounded-2xl p-8 text-center">
                <h2 class="text-2xl sm:text-3xl font-extrabold text-white mb-3">Ready to Start Your Reselling Business?</h2>
                <p class="text-[var(--text-muted)] text-sm max-w-xl mx-auto mb-6">Join hundreds of active marketing partners in Bangladesh. No setup fees, no technical experience needed.</p>
                <button onclick="${isLoggedIn ? "navigateTo('account')" : "openAuthModal('register')"}" class="bg-[var(--accent-gradient)] text-black font-extrabold py-3.5 px-8 rounded-xl shadow-lg hover:shadow-[var(--accent-primary)]/30 transition-all">
                    ${isLoggedIn ? 'Go to Partner Dashboard' : 'Apply for Partner Program Now'}
                </button>
            </div>

        </div>
    `;
};

// ============================================================================
// PARTNER DASHBOARD & ACCOUNT SCREEN
// ============================================================================

function renderAccount() {
    const userStr = localStorage.getItem('csgo_user');
    if (!userStr) {
        document.getElementById('main-content').innerHTML = `
            <div style="padding: 80px 20px; text-align: center; min-height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <div style="width: 90px; height: 90px; border-radius: 50%; background: rgba(245,158,11,0.12); border: 2px solid rgba(245,158,11,0.4); display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
                    <i class="fas fa-user-lock" style="font-size: 2.2rem; color: #F59E0B;"></i>
                </div>
                <h1 style="font-size: 2rem; font-weight: 800; color: #fff; margin-bottom: 12px;">Marketing Partner & Account Access</h1>
                <p style="color: #94a3b8; margin-bottom: 32px; max-width: 450px; line-height: 1.6;">Please log in or register to access your partner growth dashboard, track orders, copy reselling links, and withdraw earnings.</p>
                <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;">
                    <button onclick="openAuthModal('login')" style="background: linear-gradient(135deg,#F59E0B,#FBBF24); color: #020617; font-weight: 700; font-size: 1rem; padding: 13px 36px; border: none; border-radius: 12px; cursor: pointer; box-shadow: 0 8px 24px rgba(245,158,11,0.35); transition: all 0.2s;">Login</button>
                    <button onclick="openAuthModal('register')" style="background: transparent; color: #F59E0B; font-weight: 700; font-size: 1rem; padding: 13px 36px; border: 2px solid #F59E0B; border-radius: 12px; cursor: pointer; transition: all 0.2s;">Register as Partner</button>
                </div>
            </div>
        `;
        return;
    }

    const user = JSON.parse(userStr);
    const identifier = user.username || user.phone;
    const refLink = `${window.location.origin}${window.location.pathname}?ref=${encodeURIComponent(identifier)}`;

    document.getElementById('main-content').innerHTML = `
        <!-- Dashboard Header -->
        <div class="py-10 bg-gradient-to-b from-[var(--bg-elevated)] to-transparent border-b border-[var(--border-subtle)] mb-8">
            <div class="container flex flex-col md:flex-row items-center justify-between gap-6 px-4">
                <div class="flex items-center gap-5">
                    <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[var(--bg-dark)] border-2 border-[var(--accent-primary)] flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-[var(--accent-primary)]/20">
                        ${user.name ? user.name.charAt(0).toUpperCase() : '<i class="fas fa-user"></i>'}
                    </div>
                    <div>
                        <div class="flex items-center gap-2 mb-1">
                            <h1 class="text-2xl sm:text-3xl font-bold text-white">${user.name || 'Partner'}</h1>
                            <span id="partner-rank-badge" class="bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 text-xs font-bold px-2.5 py-0.5 rounded-full">
                                Starter
                            </span>
                        </div>
                        <p class="text-[var(--text-muted)] text-xs sm:text-sm flex flex-wrap items-center gap-3">
                            <span><i class="fas fa-phone mr-1"></i> ${user.phone || 'N/A'}</span>
                            <span><i class="fas fa-tag mr-1"></i> Code: <strong class="text-white">@${identifier}</strong></span>
                        </p>
                    </div>
                </div>
                <div class="flex gap-2.5 flex-wrap">
                    <button class="bg-[var(--bg-card)] border border-[var(--border-color)] text-white hover:border-white/50 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2" onclick="openEditProfileModal()">
                        <i class="fas fa-edit"></i> Edit Profile
                    </button>
                    <button class="bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/30 hover:bg-[var(--danger)] hover:text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2" onclick="logout()">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </button>
                </div>
            </div>
        </div>

        <div class="container pb-20 px-4 max-w-7xl mx-auto">
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                <!-- Left Sidebar: Customer Center & Account Wallet -->
                <div class="lg:col-span-1 space-y-6">
                    <!-- Deposit Balance Card -->
                    <div class="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 relative overflow-hidden">
                        <h3 class="text-base font-bold text-white mb-1 flex items-center gap-2">
                            <i class="fas fa-wallet text-[var(--accent-primary)]"></i> Customer Wallet Balance
                        </h3>
                        <p class="text-[var(--text-muted)] text-xs mb-4">Personal store shopping balance</p>
                        <div class="bg-[var(--bg-dark)] border border-[var(--border-subtle)] rounded-xl p-4 mb-4">
                            <div class="text-xs text-[var(--text-muted)] mb-1">Available Shopping Credit</div>
                            <div class="text-2xl font-black text-[var(--accent-primary)]">৳<span id="wallet-balance">${user.wallet_balance || user.balance || 0}</span></div>
                        </div>
                        <button onclick="requestDepositWhatsApp()" class="w-full bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/30 hover:bg-[#25D366] hover:text-white font-bold text-xs py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all">
                            <i class="fab fa-whatsapp"></i> Deposit Money via WhatsApp
                        </button>
                    </div>

                    <!-- Ecosystem Hub Navigation (Synced with Mobile App) -->
                    <div class="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6">
                        <h3 class="text-base font-bold text-white mb-3 flex items-center gap-2 pb-3 border-b border-[var(--border-subtle)]">
                            <i class="fas fa-th-large text-[var(--accent-primary)]"></i> Ecosystem & Partner Hub
                        </h3>
                        <div class="grid grid-cols-2 gap-2 text-xs">
                            <button onclick="navigateTo('rewards')" class="p-3 rounded-xl bg-[var(--bg-dark)] border border-pink-500/20 hover:border-pink-500 text-left transition-all">
                                <div class="text-pink-400 font-bold flex items-center gap-1.5 mb-1"><i class="fas fa-gift"></i> Rewards & Spin</div>
                                <div class="text-[10px] text-[var(--text-muted)]">Check-in & Wheel</div>
                            </button>
                            <button onclick="navigateTo('investor')" class="p-3 rounded-xl bg-[var(--bg-dark)] border border-emerald-500/20 hover:border-emerald-500 text-left transition-all">
                                <div class="text-emerald-400 font-bold flex items-center gap-1.5 mb-1"><i class="fas fa-chart-line"></i> Investor Center</div>
                                <div class="text-[10px] text-[var(--text-muted)]">18% - 24% ROI</div>
                            </button>
                            <button onclick="navigateTo('reseller')" class="p-3 rounded-xl bg-[var(--bg-dark)] border border-purple-500/20 hover:border-purple-500 text-left transition-all">
                                <div class="text-purple-400 font-bold flex items-center gap-1.5 mb-1"><i class="fas fa-boxes"></i> Reseller Hub</div>
                                <div class="text-[10px] text-[var(--text-muted)]">Wholesale Dispatch</div>
                            </button>
                            <button onclick="navigateTo('affiliate')" class="p-3 rounded-xl bg-[var(--bg-dark)] border border-amber-500/20 hover:border-amber-500 text-left transition-all">
                                <div class="text-amber-400 font-bold flex items-center gap-1.5 mb-1"><i class="fas fa-hand-holding-usd"></i> Partner Program</div>
                                <div class="text-[10px] text-[var(--text-muted)]">4% - 15% Comm.</div>
                            </button>
                        </div>
                    </div>

                    <!-- Delivery Address Card -->
                    <div class="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6">
                        <h3 class="text-base font-bold text-white mb-3 flex items-center gap-2 pb-3 border-b border-[var(--border-subtle)]">
                            <i class="fas fa-map-marker-alt text-[var(--accent-primary)]"></i> Delivery Address
                        </h3>
                        <p class="text-xs text-[var(--text-muted)] leading-relaxed">
                            ${user.address || '<span class="italic">No address saved. Click Edit Profile to add one.</span>'}
                        </p>
                    </div>

                    <!-- Personal Placed Orders -->
                    <div class="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6">
                        <h3 class="text-base font-bold text-white mb-3 flex items-center gap-2 pb-3 border-b border-[var(--border-subtle)]">
                            <i class="fas fa-box-open text-[var(--accent-primary)]"></i> My Shopping Orders
                        </h3>
                        <div class="overflow-x-auto">
                            <table class="w-full text-left text-xs">
                                <thead>
                                    <tr class="text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                                        <th class="pb-2">Order</th>
                                        <th class="pb-2">Amount</th>
                                        <th class="pb-2">Status</th>
                                    </tr>
                                </thead>
                                <tbody id="my-orders-list">
                                    <tr><td colspan="3" class="py-4 text-center text-[var(--text-muted)]"><i class="fas fa-circle-notch fa-spin mr-1"></i> Loading...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Right Column: MARKETING PARTNER HUB -->
                <div class="lg:col-span-2 space-y-6">

                    <!-- Partner Growth & Rank Tracker Card -->
                    <div class="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 md:p-8 relative overflow-hidden">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border-subtle)] mb-6">
                            <div>
                                <h2 class="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                                    <i class="fas fa-trophy text-[var(--accent-primary)]"></i> Marketing Partner Dashboard
                                </h2>
                                <p class="text-xs text-[var(--text-muted)] mt-1">Live server-verified earnings, milestone progress & rewards</p>
                            </div>
                            <button class="bg-[var(--bg-dark)] border border-[var(--border-color)] hover:border-white text-xs text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 self-start" onclick="refreshPartnerData('${user.phone}')">
                                <i class="fas fa-sync-alt" id="refresh-icon"></i> Refresh Data
                            </button>
                        </div>

                        <!-- Top 4 Financial Statistics -->
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                            <div class="bg-[var(--bg-dark)] p-4 rounded-xl border border-[var(--border-subtle)]">
                                <div class="text-[11px] text-[var(--text-muted)] uppercase font-semibold mb-1">Available Balance</div>
                                <div class="text-xl sm:text-2xl font-black text-green-400">৳<span id="partner-available-balance">0</span></div>
                                <div class="text-[10px] text-[var(--text-muted)] mt-0.5">Withdrawable</div>
                            </div>
                            <div class="bg-[var(--bg-dark)] p-4 rounded-xl border border-[var(--border-subtle)]">
                                <div class="text-[11px] text-[var(--text-muted)] uppercase font-semibold mb-1">Pending Comm.</div>
                                <div class="text-xl sm:text-2xl font-black text-amber-400">৳<span id="partner-pending-commission">0</span></div>
                                <div class="text-[10px] text-[var(--text-muted)] mt-0.5">In-transit/Pending</div>
                            </div>
                            <div class="bg-[var(--bg-dark)] p-4 rounded-xl border border-[var(--border-subtle)]">
                                <div class="text-[11px] text-[var(--text-muted)] uppercase font-semibold mb-1">Total Earnings</div>
                                <div class="text-xl sm:text-2xl font-black text-white">৳<span id="partner-total-earnings">0</span></div>
                                <div class="text-[10px] text-[var(--text-muted)] mt-0.5">Comm. + Bonuses</div>
                            </div>
                            <div class="bg-[var(--bg-dark)] p-4 rounded-xl border border-[var(--border-subtle)]">
                                <div class="text-[11px] text-[var(--text-muted)] uppercase font-semibold mb-1">Delivered Orders</div>
                                <div class="text-xl sm:text-2xl font-black text-[var(--accent-primary)]"><span id="partner-delivered-orders">0</span></div>
                                <div class="text-[10px] text-[var(--text-muted)] mt-0.5">Milestone Count</div>
                            </div>
                        </div>

                        <!-- Progress Bar & Next Target Card -->
                        <div class="bg-gradient-to-br from-[var(--bg-dark)] to-[var(--bg-card)] border border-[var(--accent-primary)]/30 rounded-xl p-5 mb-6">
                            <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-3">
                                <div>
                                    <span class="text-xs text-[var(--text-muted)] uppercase tracking-wide font-bold">Next Target Reward:</span>
                                    <div class="text-base font-extrabold text-white flex items-center gap-2 mt-0.5">
                                        <i class="fas fa-fire text-amber-400"></i> <span id="partner-next-reward-text">৳300 Cash Bonus</span>
                                    </div>
                                </div>
                                <div class="text-xs font-bold text-[var(--accent-primary)]" id="partner-orders-remaining-text">
                                    50 orders remaining
                                </div>
                            </div>

                            <!-- Progress Track -->
                            <div class="w-full bg-[var(--bg-dark)] border border-white/10 rounded-full h-3.5 mb-2 overflow-hidden relative">
                                <div id="partner-progress-fill" class="bg-[var(--accent-gradient)] h-full transition-all duration-500 rounded-full" style="width: 0%;"></div>
                            </div>
                            <div class="flex justify-between text-[11px] text-[var(--text-muted)] font-medium">
                                <span>Current: <strong class="text-white" id="partner-current-orders-lbl">0</strong> Delivered Orders</span>
                                <span>Target: <strong class="text-white" id="partner-target-orders-lbl">50</strong></span>
                            </div>
                        </div>

                        <!-- Partner Reselling Link & Code Share -->
                        <div class="bg-[var(--bg-dark)] p-5 rounded-xl border border-[var(--border-subtle)] mb-6">
                            <div class="text-xs text-[var(--text-muted)] font-bold mb-2">Your Unique Marketing Link</div>
                            <div class="flex flex-col sm:flex-row gap-2 mb-4">
                                <input type="text" id="ref-link-input" value="${refLink}" readonly class="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] text-xs text-white rounded-lg px-3 py-2.5 focus:outline-none">
                                <button onclick="copyRefLink()" class="bg-[var(--accent-primary)] text-black font-extrabold text-xs px-4 py-2.5 rounded-lg whitespace-nowrap hover:bg-amber-400 transition-all flex items-center justify-center gap-1.5">
                                    <i class="far fa-copy"></i> Copy Link
                                </button>
                            </div>
                            <div class="flex flex-wrap items-center gap-2 text-xs">
                                <span class="text-[var(--text-muted)]">Share Directly:</span>
                                <button onclick="shareReferralLink('whatsapp', '${refLink}')" class="bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/30 px-3 py-1.5 rounded-lg font-bold hover:bg-[#25D366] hover:text-white transition-all">
                                    <i class="fab fa-whatsapp mr-1"></i> WhatsApp
                                </button>
                                <button onclick="shareReferralLink('facebook', '${refLink}')" class="bg-[#1877F2]/10 text-[#1877F2] border border-[#1877F2]/30 px-3 py-1.5 rounded-lg font-bold hover:bg-[#1877F2] hover:text-white transition-all">
                                    <i class="fab fa-facebook-f mr-1"></i> Facebook
                                </button>
                            </div>
                        </div>

                        <!-- Withdrawal & Payout Button -->
                        <div class="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-green-950/20 border border-green-800/30">
                            <div>
                                <div class="text-sm font-bold text-white">Withdrawable Partner Earnings: <span class="text-green-400" id="withdrawable-summary-amt">৳0</span></div>
                                <div class="text-[11px] text-[var(--text-muted)]">Payouts processed directly via bKash, Nagad or Bank Transfer (Min. ৳500).</div>
                            </div>
                            <button onclick="openPartnerWithdrawDialog()" class="w-full sm:w-auto bg-green-600 hover:bg-green-500 text-white font-extrabold text-xs py-2.5 px-5 rounded-lg transition-all flex items-center justify-center gap-2">
                                <i class="fas fa-hand-holding-usd"></i> Request Payout
                            </button>
                        </div>
                    </div>

                    <!-- 6 Milestone Status Cards Grid -->
                    <div>
                        <h3 class="text-base font-bold text-white mb-3 flex items-center gap-2">
                            <i class="fas fa-award text-[var(--accent-primary)]"></i> 6 Milestone Reward Tiers
                        </h3>
                        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5" id="partner-milestones-grid">
                            <!-- Milestone cards injected dynamically by refreshPartnerData -->
                        </div>
                    </div>

                    <!-- Referred Orders Table -->
                    <div class="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6">
                        <div class="flex justify-between items-center mb-4 pb-3 border-b border-[var(--border-subtle)]">
                            <h3 class="text-base font-bold text-white flex items-center gap-2">
                                <i class="fas fa-list text-[var(--accent-primary)]"></i> Referred Customer Orders
                            </h3>
                            <span class="text-xs text-[var(--text-muted)]">Delivered orders unlock rewards</span>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-left text-xs whitespace-nowrap">
                                <thead>
                                    <tr class="text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                                        <th class="pb-2 px-2">Date</th>
                                        <th class="pb-2 px-2">Order ID</th>
                                        <th class="pb-2 px-2">Amount</th>
                                        <th class="pb-2 px-2 text-[var(--accent-primary)]">Est. Commission</th>
                                        <th class="pb-2 px-2">Eligibility Status</th>
                                    </tr>
                                </thead>
                                <tbody id="referred-orders-list">
                                    <tr><td colspan="5" class="py-6 text-center text-[var(--text-muted)]"><i class="fas fa-circle-notch fa-spin mr-1"></i> Loading referred orders...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Payout & Reward History -->
                    <div class="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6">
                        <h3 class="text-base font-bold text-white mb-4 pb-3 border-b border-[var(--border-subtle)] flex items-center gap-2">
                            <i class="fas fa-history text-[var(--accent-primary)]"></i> Payout & Transaction History
                        </h3>
                        <div class="overflow-x-auto">
                            <table class="w-full text-left text-xs whitespace-nowrap">
                                <thead>
                                    <tr class="text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                                        <th class="pb-2 px-2">Date</th>
                                        <th class="pb-2 px-2">Method / Details</th>
                                        <th class="pb-2 px-2">Amount</th>
                                        <th class="pb-2 px-2">Status</th>
                                    </tr>
                                </thead>
                                <tbody id="partner-payout-history-list">
                                    <tr><td colspan="4" class="py-4 text-center text-[var(--text-muted)]">No withdrawal requests yet.</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    `;

    // Fetch live data
    fetchMyOrders(user.phone);
    refreshPartnerData(user.phone);
}

window.refreshPartnerData = async function(phone) {
    const icon = document.getElementById('refresh-icon');
    if (icon) icon.classList.add('fa-spin');

    try {
        const SUPABASE_USER_API = 'https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/user-data';
        const res = await apiFetch(SUPABASE_USER_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_partner_stats', auth: { phone: phone } })
        });

        if (!res.ok) throw new Error('Failed to fetch partner stats');
        const data = await res.json();
        const stats = data.stats;

        if (stats) {
            // Update financial metrics
            const availEl = document.getElementById('partner-available-balance');
            const pendEl = document.getElementById('partner-pending-commission');
            const totalEl = document.getElementById('partner-total-earnings');
            const ordersEl = document.getElementById('partner-delivered-orders');
            const sumAvailEl = document.getElementById('withdrawable-summary-amt');
            const rankBadge = document.getElementById('partner-rank-badge');

            if (availEl) availEl.textContent = stats.availableBalance.toLocaleString();
            if (pendEl) pendEl.textContent = stats.pendingCommission.toLocaleString();
            if (totalEl) totalEl.textContent = stats.totalEarnings.toLocaleString();
            if (ordersEl) ordersEl.textContent = stats.successfulOrders;
            if (sumAvailEl) sumAvailEl.textContent = '৳' + stats.availableBalance.toLocaleString();
            if (rankBadge) rankBadge.textContent = stats.rank;

            // Update Progress
            const fill = document.getElementById('partner-progress-fill');
            const nextRewardText = document.getElementById('partner-next-reward-text');
            const remainingText = document.getElementById('partner-orders-remaining-text');
            const curLbl = document.getElementById('partner-current-orders-lbl');
            const tarLbl = document.getElementById('partner-target-orders-lbl');

            if (nextRewardText && stats.nextReward) nextRewardText.textContent = stats.nextReward.text;
            if (remainingText) remainingText.textContent = `${stats.ordersRemaining} orders remaining`;
            if (curLbl) curLbl.textContent = stats.successfulOrders;
            if (tarLbl) tarLbl.textContent = stats.nextMilestoneOrders;

            if (fill) {
                const percent = Math.min(100, Math.round((stats.successfulOrders / (stats.nextMilestoneOrders || 50)) * 100));
                fill.style.width = percent + '%';
            }

            // Render 6 Milestone Cards
            const grid = document.getElementById('partner-milestones-grid');
            if (grid && stats.milestones) {
                grid.innerHTML = stats.milestones.map(m => {
                    let badgeClass = 'bg-gray-800 text-gray-400 border-gray-700';
                    let badgeText = 'LOCKED 🔒';
                    if (m.status === 'UNLOCKED') {
                        badgeClass = 'bg-green-900/60 text-green-300 border-green-700';
                        badgeText = 'UNLOCKED ✅';
                    } else if (m.status === 'IN PROGRESS') {
                        badgeClass = 'bg-amber-900/60 text-amber-300 border-amber-700';
                        badgeText = 'IN PROGRESS 🔥';
                    }

                    return `
                        <div class="bg-[var(--bg-dark)] border ${m.status === 'UNLOCKED' ? 'border-green-600/40' : 'border-[var(--border-subtle)]'} p-3.5 rounded-xl flex flex-col justify-between">
                            <div class="flex justify-between items-center mb-2">
                                <span class="text-xs font-black text-white">${m.target} Orders</span>
                                <span class="text-[10px] font-bold px-2 py-0.5 rounded border ${badgeClass}">${badgeText}</span>
                            </div>
                            <div class="text-sm font-extrabold text-green-400 mb-1">৳${m.bonus.toLocaleString()} Bonus</div>
                            <div class="text-[11px] text-[var(--text-muted)] space-y-0.5">
                                ${m.boost > 0 ? `<div>+${m.boost}% Comm. Boost</div>` : ''}
                                ${m.travel ? `<div class="text-sky-300 font-medium">🏖️ ${m.travel}</div>` : ''}
                            </div>
                        </div>
                    `;
                }).join('');
            }

            // Render Referred Orders
            const tbody = document.getElementById('referred-orders-list');
            if (tbody) {
                if (stats.referredOrders && stats.referredOrders.length > 0) {
                    tbody.innerHTML = stats.referredOrders.map(o => {
                        const date = new Date(o.created_at).toLocaleDateString();
                        const s = (o.status || '').toLowerCase().trim();
                        const isDelivered = s === 'delivered' || s === 'completed' || s === 'complete' || s === 'complate';
                        const isPending = s === 'pending' || s === 'processing' || s === 'shipped';

                        let statusBadge = `<span class="bg-gray-800 text-gray-400 px-2 py-0.5 rounded text-[10px]">${o.status}</span>`;
                        if (isDelivered) {
                            statusBadge = `<span class="bg-green-950 text-green-400 border border-green-800/40 px-2 py-0.5 rounded text-[10px] font-bold">Delivered (Counted)</span>`;
                        } else if (isPending) {
                            statusBadge = `<span class="bg-amber-950 text-amber-400 border border-amber-800/40 px-2 py-0.5 rounded text-[10px] font-bold">Pending (Under Process)</span>`;
                        }

                        const amt = parseFloat(o.subtotal || o.total_amount || 0);
                        const estComm = Math.round(amt * (stats.activeCommissionRate / 100));

                        return `
                            <tr class="border-b border-[var(--border-subtle)]">
                                <td class="py-2.5 px-2 text-white">${date}</td>
                                <td class="py-2.5 px-2 text-[var(--text-muted)]">#${(o.id || '').toString().substring(0,8)}</td>
                                <td class="py-2.5 px-2 text-white">৳${amt}</td>
                                <td class="py-2.5 px-2 text-green-400 font-bold">৳${estComm}</td>
                                <td class="py-2.5 px-2">${statusBadge}</td>
                            </tr>
                        `;
                    }).join('');
                } else {
                    tbody.innerHTML = '<tr><td colspan="5" class="py-6 text-center text-[var(--text-muted)]">No referred customer orders found yet. Share your link to start earning!</td></tr>';
                }
            }

            // Render Payout History
            const payoutTbody = document.getElementById('partner-payout-history-list');
            if (payoutTbody) {
                if (stats.payoutHistory && stats.payoutHistory.length > 0) {
                    payoutTbody.innerHTML = stats.payoutHistory.map(p => {
                        const date = new Date(p.created_at).toLocaleDateString();
                        let badge = '<span class="bg-amber-950 text-amber-400 px-2 py-0.5 rounded text-[10px]">Pending</span>';
                        if (p.status === 'paid') badge = '<span class="bg-green-950 text-green-400 px-2 py-0.5 rounded text-[10px] font-bold">Paid</span>';
                        if (p.status === 'rejected') badge = '<span class="bg-rose-950 text-rose-400 px-2 py-0.5 rounded text-[10px]">Rejected</span>';

                        return `
                            <tr class="border-b border-[var(--border-subtle)]">
                                <td class="py-2.5 px-2 text-white">${date}</td>
                                <td class="py-2.5 px-2 text-[var(--text-muted)]">${p.payment_method} (${p.payment_details || 'N/A'})</td>
                                <td class="py-2.5 px-2 font-bold text-white">৳${parseFloat(p.amount || 0).toFixed(0)}</td>
                                <td class="py-2.5 px-2">${badge}</td>
                            </tr>
                        `;
                    }).join('');
                } else {
                    payoutTbody.innerHTML = '<tr><td colspan="4" class="py-4 text-center text-[var(--text-muted)]">No payout requests yet.</td></tr>';
                }
            }
        }
    } catch (e) {
        console.warn('Error refreshing partner stats:', e);
    } finally {
        if (icon) icon.classList.remove('fa-spin');
    }
};

window.openPartnerWithdrawDialog = function() {
    const userStr = localStorage.getItem('csgo_user');
    if (!userStr) return alert('Please login first');
    const user = JSON.parse(userStr);

    const amountStr = prompt(`Enter payout amount in ৳ (Min. ৳500):`, "500");
    if (!amountStr) return;

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount < 500) {
        alert('Invalid amount! Minimum withdrawal amount is ৳500.');
        return;
    }

    const method = prompt('Enter payment method (bKash / Nagad / Bank):', user.payment_method || 'bKash');
    if (!method) return;

    const details = prompt('Enter account phone/number:', user.payment_details || user.phone);
    if (!details) return;

    // Submit withdrawal to backend
    const SUPABASE_USER_API = 'https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/user-data';
    apiFetch(SUPABASE_USER_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'affiliate_withdraw',
            auth: { phone: user.phone },
            data: { amount: amount, payment_method: method, payment_details: details }
        })
    }).then(async res => {
        if (res.ok) {
            alert(`✅ Payout request of ৳${amount} submitted successfully!\n\nOur accounts team will verify and transfer funds to your ${method} account.`);
            refreshPartnerData(user.phone);
        } else {
            const err = await res.json();
            alert('Error: ' + (err.error || 'Failed to submit withdrawal request'));
        }
    }).catch(err => {
        alert('Error: ' + err.message);
    });
};

window.shareReferralLink = function(platform, link) {
    const text = "Check out these amazing products on CSGO SHOP!";
    let shareUrl = '';
    
    switch(platform) {
        case 'whatsapp':
            shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + link)}`;
            break;
        case 'facebook':
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;
            break;
        case 'twitter':
            shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`;
            break;
    }
    
    if (shareUrl) {
        window.open(shareUrl, '_blank', 'width=600,height=400');
    }
}

window.refreshAffiliateData = function(phone) {
    fetchReferredOrders(phone);
    fetchClicks(phone);
    
    // Add a little spin animation to the button icon
    const icon = event.currentTarget.querySelector('i');
    icon.style.transition = 'transform 0.5s';
    icon.style.transform = 'rotate(360deg)';
    setTimeout(() => {
        icon.style.transition = 'none';
        icon.style.transform = 'rotate(0deg)';
    }, 500);
}

async function fetchClicks(phone) {
    try {
        const SUPABASE_CLICKS_API = 'https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/get-clicks';
        
        const response = await apiFetch(SUPABASE_CLICKS_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ phone: phone })
        });
        
        if (response.ok) {
            const data = await response.json();
            const clicksElement = document.getElementById('affiliate-clicks');
            if (clicksElement) {
                clicksElement.textContent = data.clicks;
                localStorage.setItem('csgo_clicks_' + phone, data.clicks);
            }
        }
    } catch (error) {
        console.warn('Could not fetch real clicks from Supabase. Using local data.', error);
    }
}

async function fetchMyOrders(phone) {
    try {
        const SUPABASE_MY_ORDERS_API = 'https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/get-my-orders';
        
        const response = await apiFetch(SUPABASE_MY_ORDERS_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ phone: phone })
        });
        
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        renderMyOrdersTable(data.orders);
        
    } catch (error) {
        console.warn('Could not fetch real orders from Supabase. Falling back to demo data.', error);
        
        // Fallback to demo data if the API is not deployed yet
        const demoOrders = [
            {
                id: 'ORD-1234',
                created_at: new Date().toISOString(),
                total_amount: 5500,
                status: 'pending'
            }
        ];
        
        renderMyOrdersTable(demoOrders);
    }
}

function renderMyOrdersTable(orders) {
    const tbody = document.getElementById('my-orders-list');
    if (!tbody) return;
    
    if (orders && orders.length > 0) {
        tbody.innerHTML = orders.map(order => {
            const date = new Date(order.created_at).toLocaleDateString();
            
            let statusHtml = '';
            if (order.status === 'pending') {
                statusHtml = '<span style="background: rgba(255, 152, 0, 0.1); color: #ff9800; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Pending</span>';
            } else if (order.status === 'delivered' || order.status === 'completed') {
                statusHtml = '<span style="background: rgba(0, 200, 83, 0.1); color: #00c853; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Delivered</span>';
            } else {
                statusHtml = `<span style="background: rgba(255, 255, 255, 0.1); color: #ccc; padding: 4px 8px; border-radius: 4px; font-size: 12px; text-transform: capitalize;">${order.status}</span>`;
            }
            
            return `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <td style="padding: 12px 10px;">${date}</td>
                    <td style="padding: 12px 10px;">#${order.id}</td>
                    <td style="padding: 12px 10px;">৳${order.total_amount}</td>
                    <td style="padding: 12px 10px;">${statusHtml}</td>
                </tr>
            `;
        }).join('');
    } else {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: var(--text-light);">You have not placed any orders yet.</td></tr>';
    }
}

async function fetchReferredOrders(phone) {
    try {
        const SUPABASE_ORDERS_API = 'https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/get-referred-orders';
        
        const response = await apiFetch(SUPABASE_ORDERS_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ phone: phone })
        });
        
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        const commissionRate = data.commissionRate !== undefined ? data.commissionRate : 0.10;
        renderOrdersTable(data.orders, phone, commissionRate);
        
    } catch (error) {
        console.warn('Could not fetch real orders from Supabase (Function might not be deployed yet). Falling back to demo data.', error);
        
        // Fallback to demo data if the API is not deployed yet
        const demoOrders = [
            {
                id: 'ORD-7829',
                created_at: new Date().toISOString(),
                total_amount: 1250,
                status: 'delivered'
            },
            {
                id: 'ORD-7845',
                created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
                total_amount: 3400,
                status: 'pending'
            }
        ];
        
        renderOrdersTable(demoOrders, phone, 0.10);
    }
}

function renderOrdersTable(orders, phone, commissionRate = 0.10) {
    const tbody = document.getElementById('referred-orders-list');
    if (!tbody) return;
    const commissionHeader = document.getElementById('commission-header');
    
    if (commissionHeader) {
        commissionHeader.textContent = `Commission`;
    }
    
    if (orders && orders.length > 0) {
        let totalEarnings = 0;
        tbody.innerHTML = orders.map(order => {
            const date = new Date(order.created_at).toLocaleDateString();
            const commission = Math.round(order.total_amount * commissionRate);
            
            if (order.status === 'delivered' || order.status === 'completed' || order.status === 'complete' || order.status === 'Complate') {
                totalEarnings += commission;
            }
            
            let statusHtml = '';
            if (order.status === 'pending') {
                statusHtml = '<span style="background: rgba(255, 152, 0, 0.1); color: #ff9800; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Pending</span>';
            } else if (order.status === 'delivered' || order.status === 'completed' || order.status === 'complete' || order.status === 'Complate') {
                statusHtml = '<span style="background: rgba(0, 200, 83, 0.1); color: #00c853; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Delivered</span>';
            } else {
                statusHtml = `<span style="background: rgba(255, 255, 255, 0.1); color: #ccc; padding: 4px 8px; border-radius: 4px; font-size: 12px; text-transform: capitalize;">${order.status}</span>`;
            }
            
            return `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <td style="padding: 12px 10px;">${date}</td>
                    <td style="padding: 12px 10px;">#${order.id}</td>
                    <td style="padding: 12px 10px;">৳${order.total_amount}</td>
                    <td style="padding: 12px 10px; color: #00c853;">৳${commission}</td>
                    <td style="padding: 12px 10px;">${statusHtml}</td>
                </tr>
            `;
        }).join('');
        
        // Update total earnings
        const earningsElement = document.getElementById('affiliate-earnings');
        if (earningsElement) {
            earningsElement.textContent = totalEarnings;
        }
        localStorage.setItem('csgo_earnings_' + phone, totalEarnings);
        
        // Render Chart
        renderEarningsChart(orders, commissionRate);
        
    } else {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--text-light);">No referred orders found yet. Share your link to start earning!</td></tr>';
        renderEarningsChart([], commissionRate);
    }
}

function renderEarningsChart(orders, commissionRate) {
    const ctx = document.getElementById('earningsChart');
    if (!ctx) return;
    
    // Group earnings by date
    const earningsByDate = {};
    
    // Get last 7 days
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        earningsByDate[d.toLocaleDateString()] = 0;
    }
    
    orders.forEach(order => {
        if (order.status === 'delivered' || order.status === 'completed' || order.status === 'complete' || order.status === 'Complate') {
            const date = new Date(order.created_at).toLocaleDateString();
            const commission = Math.round(order.total_amount * commissionRate);
            if (earningsByDate[date] !== undefined) {
                earningsByDate[date] += commission;
            } else {
                // If order is older than 7 days, we might not show it, or we could dynamically add it.
                // For simplicity, let's just add it if it exists.
                earningsByDate[date] = (earningsByDate[date] || 0) + commission;
            }
        }
    });

    // Sort dates
    const sortedDates = Object.keys(earningsByDate).sort((a, b) => new Date(a) - new Date(b));
    const dataPoints = sortedDates.map(date => earningsByDate[date]);
    
    // Destroy existing chart instance if it exists
    if (window.affiliateChart) {
        window.affiliateChart.destroy();
    }
    
    window.affiliateChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedDates,
            datasets: [{
                label: 'Earnings (৳)',
                data: dataPoints,
                borderColor: '#00c853',
                backgroundColor: 'rgba(0, 200, 83, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#aaa'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#aaa'
                    }
                }
            }
        }
    });
}

window.switchAuthTab = function(tab) {
    const loginForm = document.getElementById('form-login');
    const regForm = document.getElementById('form-register');
    const loginTab = document.getElementById('tab-login');
    const regTab = document.getElementById('tab-register');

    if (tab === 'login') {
        loginForm.style.display = 'block';
        regForm.style.display = 'none';
        loginTab.style.color = 'var(--accent-color)';
        loginTab.style.borderBottom = '2px solid var(--accent-color)';
        regTab.style.color = 'var(--text-light)';
        regTab.style.borderBottom = '2px solid transparent';
    } else {
        loginForm.style.display = 'none';
        regForm.style.display = 'block';
        regTab.style.color = 'var(--accent-color)';
        regTab.style.borderBottom = '2px solid var(--accent-color)';
        loginTab.style.color = 'var(--text-light)';
        loginTab.style.borderBottom = '2px solid transparent';
    }
}

window.resetPasswordWhatsApp = function() {
    const identifier = document.getElementById('login-phone').value.trim();
    let text = "Hello, I want to reset my password for my account.";
    if (identifier) {
        text += ` My Phone/Username is: ${identifier}`;
    }
    const whatsappUrl = `https://wa.me/8801873827520?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
}

window.handleAuth = async function(e, type) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Please wait...';
    submitBtn.disabled = true;

    try {
        const SUPABASE_AUTH_API = 'https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/auth';
        let payload = { type };

        if (type === 'login') {
            payload.phone = document.getElementById('login-phone').value.trim();
            payload.password = document.getElementById('login-pass').value.trim();
        } else {
            payload.phone = document.getElementById('reg-phone').value.trim();
            payload.name = document.getElementById('reg-name').value.trim();
            payload.username = document.getElementById('reg-username').value.trim();
            payload.password = document.getElementById('reg-pass').value.trim();
            
            if(payload.phone.length < 11) {
                alert("Please enter a valid phone number");
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                return;
            }
        }

        console.log("Sending auth request:", payload);

        const response = await apiFetch(SUPABASE_AUTH_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        console.log("Response status:", response.status);
        
        const data = await response.json();
        console.log("Auth response:", data);

        if (!response.ok) {
            console.error("Full error data:", data);
            throw new Error(data.error || `Authentication failed with status: ${response.status}`);
        }

        if (type === 'register') {
            alert("Registration successful! You are now logged in.");
        }

        localStorage.setItem('csgo_user', JSON.stringify(data.user));
        closeAuthModal();
        renderAccount();

    } catch (error) {
        console.error("Auth error:", error);
        alert(error.message);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

window.requestPayout = function() {
    const user = JSON.parse(localStorage.getItem('csgo_user'));
    if (!user) return alert("Please login first.");
    
    const identifier = user.username || user.phone;
    const earnings = parseInt(localStorage.getItem('csgo_earnings_' + identifier) || '0');
    if (earnings < 500) {
        alert(`Minimum payout is ৳500. Your current earnings are ৳${earnings}.`);
        return;
    }
    
    const message = `I want to request a payout of my affiliate earnings.\n\nIdentifier: ${identifier}\nPhone: ${user.phone}\nName: ${user.name}\nEarnings: ৳${earnings}\nPayment Method: ${user.payment_method || 'Not set'}\nPayment Details: ${user.payment_details || 'Not set'}`;
    window.open(`https://wa.me/8801873827520?text=${encodeURIComponent(message)}`, '_blank');
}

window.logout = function() {
    localStorage.removeItem('csgo_user');
    renderAccount();
}

window.openAuthModal = function(tab) {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    // Switch to specified tab or default to login
    switchAuthTab(tab || 'login');
    // Pre-fill referral if stored
    const refInput = document.getElementById('reg-referral');
    if (refInput && localStorage.getItem('csgo_referred_by')) {
        refInput.value = localStorage.getItem('csgo_referred_by');
    }
}

window.closeAuthModal = function() {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;
    modal.style.display = 'none';
    document.body.style.overflow = '';
}

window.togglePasswordVisibility = function() {
    const passInput = document.getElementById('login-pass');
    const icon = document.getElementById('toggle-password');
    if (!passInput || !icon) return;
    if (passInput.type === 'password') {
        passInput.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        passInput.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

window.openEditProfileModal = function() {
    document.getElementById('edit-profile-modal').style.display = 'flex';
}

window.closeEditProfileModal = function() {
    document.getElementById('edit-profile-modal').style.display = 'none';
}

window.handleUpdateProfile = async function(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Saving...';
    submitBtn.disabled = true;

    try {
        const user = JSON.parse(localStorage.getItem('csgo_user'));
        if (!user || !user.phone) throw new Error("User not found");

        const name = document.getElementById('edit-profile-name').value;
        const username = document.getElementById('edit-profile-username').value;
        const email = document.getElementById('edit-profile-email').value;
        const address = document.getElementById('edit-profile-address').value;
        const payment_method = document.getElementById('edit-profile-payment-method').value;
        const payment_details = document.getElementById('edit-profile-payment-details').value;

        const SUPABASE_AUTH_API = 'https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/auth';
        
        const response = await apiFetch(SUPABASE_AUTH_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                type: 'update_profile',
                phone: user.phone,
                name: name,
                username: username,
                email: email,
                address: address,
                payment_method: payment_method,
                payment_details: payment_details
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to update profile');
        }

        // Update local storage
        localStorage.setItem('csgo_user', JSON.stringify(data.user));
        
        alert("Profile updated successfully!");
        closeEditProfileModal();
        renderAccount(); // Re-render to show updated info

    } catch (error) {
        console.error("Update profile error:", error);
        alert(error.message);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

window.copyRefLink = function() {
    const input = document.getElementById('ref-link-input');
    if (input) {
        input.select();
        navigator.clipboard.writeText(input.value).then(() => {
            alert('Marketing Partner link copied to clipboard!');
        }).catch(() => {
            document.execCommand('copy');
            alert('Marketing Partner link copied to clipboard!');
        });
    }
}

window.copyPartnerProductKit = function(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return alert('Product details not found');

    const user = JSON.parse(localStorage.getItem('csgo_user') || 'null');
    const partnerCode = user ? (user.username || user.phone) : (localStorage.getItem('csgo_referred_by') || '');
    const refParam = partnerCode ? `?ref=${encodeURIComponent(partnerCode)}` : '';
    const productLink = `${window.location.origin}${window.location.pathname}${refParam}#product-details/${productId}`;

    const text = `🔥 ${product.name}

💰 স্পেশাল ডিসকাউন্ট প্রাইস: ৳${product.price} ${product.originalPrice && product.originalPrice > product.price ? `(আগের দাম: ৳${product.originalPrice})` : ''}
🚚 সারাদেশে ক্যাশ অন ডেলিভারি সুবিধা (পণ্য হাতে পেয়ে টাকা পরিশোধ)

🛍️ সরাসরি অর্ডার করতে নিচের লিংকে ক্লিক করুন:
👉 ${productLink}

📞 হোয়াটসঅ্যাপে অর্ডার করতে: 01873827520
✅ ১০০% অথেন্টিক প্রোডাক্ট ও গ্যারান্টিড কোয়ালিটি - CSGO SHOP`;

    navigator.clipboard.writeText(text).then(() => {
        alert('✅ Product Promo text with your partner link copied!\n\nPaste it on Facebook, WhatsApp, TikTok or Instagram to start earning commission!');
    }).catch(err => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('✅ Product Promo text with your partner link copied!');
    });
}

window.downloadProductImage = async function(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return alert('Product not found');

    const imageUrl = product.detailImageUrl || product.originalImageUrl || product.image;
    if (!imageUrl) return alert('Image URL not available');

    try {
        const res = await fetch(imageUrl);
        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${product.name.replace(/[^a-zA-Z0-9]/g, '_')}_CSGO_HD.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
        // Fallback open in new tab
        window.open(imageUrl, '_blank');
    }
}

// Track referral clicks
const urlParams = new URLSearchParams(window.location.search);
const ref = urlParams.get('ref');
if (ref) {
    localStorage.setItem('csgo_referred_by', ref);
    let clicks = parseInt(localStorage.getItem('csgo_clicks_' + ref) || 0);
    localStorage.setItem('csgo_clicks_' + ref, clicks + 1);
    
    // Send click to Supabase
    apiFetch('https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/track-click', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone: ref })
    }).catch(err => console.warn('Could not track click in Supabase', err));
}

function renderPrivacy() {
    document.getElementById('main-content').innerHTML = `
        <div class="page-header">
            <div class="container">
                <h1>Privacy Policy</h1>
            </div>
        </div>
        <div class="container page-content">
            <h2>1. Information We Collect</h2>
            <p>We collect information from you when you register on our site, place an order, subscribe to our newsletter, respond to a survey or fill out a form. When ordering or registering on our site, as appropriate, you may be asked to enter your: name, e-mail address, mailing address, phone number or credit card information.</p>
            
            <h2>2. How We Use Your Information</h2>
            <p>Any of the information we collect from you may be used in one of the following ways:</p>
            <ul>
                <li>To personalize your experience</li>
                <li>To improve our website</li>
                <li>To improve customer service</li>
                <li>To process transactions</li>
            </ul>
            
            <h2>3. Data Protection</h2>
            <p>We implement a variety of security measures to maintain the safety of your personal information when you place an order or enter, submit, or access your personal information.</p>
            
            <h2>4. Cookies</h2>
            <p>We use cookies to help us remember and process the items in your shopping cart, understand and save your preferences for future visits and compile aggregate data about site traffic and site interaction so that we can offer better site experiences and tools in the future.</p>
        </div>
    `;
}

// Helpers
function getBadgeHtml(badge) {
    if (!badge) return '';
    let text = '';
    if (badge === 'sale') text = 'Sale';
    else if (badge === 'new') text = 'New';
    else if (badge === 'hot') text = 'Hot';
    else if (badge === 'stock-out') text = 'Stock Out';
    return `<div class="badge ${badge}">${text}</div>`;
}


function generateProductCard(product, layout = 'default') {
    const reviews = JSON.parse(localStorage.getItem('csgo_reviews')) || {};
    const productReviews = reviews[product.id] || [];
    let avgRating = 0;
    if (productReviews.length > 0) {
        const sum = productReviews.reduce((acc, review) => acc + review.rating, 0);
        avgRating = Math.round(sum / productReviews.length);
    }
    
    // Generate high-res image URL for srcset
    const thumbnailImg = product.thumbnailImageUrl || product.thumbnail_img || product.image;
    const highResImage = product.detailImageUrl || product.image.replace(/&w=\d+/, '&w=800').replace(/&fit=\w+/, '&fit=contain');

    // Premium styling wrapper
    let cardClass = 'product-card-premium';
    if (layout === 'trending') {
        cardClass += ' trending-card';
    } else if (layout === 'sale') {
        cardClass += ' sale-card';
    }
    
    // Image fallback is now centralized using event delegation on the document

    let reviewsHtml = '';
    if (productReviews.length > 0) {
        reviewsHtml = `
            <div class="card-rating">
                <div class="stars">
                    ${'<i class="fas fa-star"></i>'.repeat(avgRating)}
                    ${'<i class="far fa-star text-muted"></i>'.repeat(5 - avgRating)}
                </div>
                <span class="count">(${productReviews.length})</span>
            </div>
        `;
    }

    return `
    <div class="${cardClass}">
        ${getBadgeHtml(product.badge)}
        <div class="card-image-wrapper" onclick="navigateTo('product-details', '${product.id}')">
            <div class="card-gradient-overlay"></div>
            
            <img src="${thumbnailImg}" 
                 ${thumbnailImg && highResImage ? `srcset="${thumbnailImg} 1x, ${highResImage} 2x"` : ''}
                 alt="${product.name}" 
                 loading="lazy" 
                 decoding="async"
                 data-original-src="${product.originalImageUrl}"
                 data-fallback-stage="optimized"
                 class="card-img">
                 
            <!-- Quick actions overlay -->
            <div class="card-actions">
                <button class="wishlist-btn" onclick="event.stopPropagation(); toggleWishlist('${product.id}')" title="Add to Wishlist">
                    <i class="far fa-heart"></i>
                </button>
            </div>
        </div>
        
        <div class="card-info">
            <div class="card-category">${product.subcategory ? product.subcategory : product.category}</div>
            <h3 class="card-title" onclick="navigateTo('product-details', '${product.id}')">${product.name}</h3>
            
            ${reviewsHtml}
            
            <div class="card-price-row">
                <div class="price-col">
                    ${product.originalPrice && product.originalPrice > product.price ? 
                        `<span class="old-price">৳${product.originalPrice}</span>` : ''}
                    <span class="current-price">৳${product.price}</span>
                </div>
                <button class="cart-btn" onclick="addToCart('${product.id}', event)" ${product.badge === 'stock-out' ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} title="Add to Cart">
                    <i class="fas fa-shopping-cart"></i>
                </button>
            </div>
        </div>
    </div>
    `;
}

function generateProductsHtml(productsArray) {
    return productsArray.map(product => generateProductCard(product)).join('');
}


window.orderViaWhatsApp = function(productName, price) {
    const phoneNumber = "8801873827520"; // Format with country code
    const message = `Hello, I want to order:\nProduct name: ${productName}\nPrice: ৳${price}`;
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

// Cart System
window.addToCart = function(productId, event, isFromDetails = false) {
    const product = products.find(p => p.id === productId);
    
    let selectedVariants = {};
    if (isFromDetails && product.variants) {
        for (const variantName of Object.keys(product.variants)) {
            const selectElement = document.getElementById(`variant-${variantName}`);
            if (selectElement) {
                selectedVariants[variantName] = selectElement.value;
            }
        }
    } else if (product.variants) {
        // Default to first option if added from grid
        for (const [variantName, options] of Object.entries(product.variants)) {
            selectedVariants[variantName] = options[0];
        }
    }

    // Create a unique cart item ID based on product ID and variants
    const variantString = Object.keys(selectedVariants).length > 0 
        ? JSON.stringify(selectedVariants) 
        : '';
    const cartItemId = productId + (variantString ? '-' + btoa(variantString).replace(/=/g, '') : '');

    const existingItem = cart.find(item => (item.cartItemId || item.id) === cartItemId);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1, cartItemId: cartItemId, selectedVariants: selectedVariants });
    }

    saveCart();
    updateCartCount();
    renderCart();
    
    // Show feedback if event is provided
    if (event && event.target) {
        const btn = event.target.closest('.btn');
        if (btn) {
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> Added';
            btn.style.backgroundColor = '#00c853';
            btn.style.color = 'white';
            btn.style.borderColor = '#00c853';
            
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style = '';
            }, 1500);
        }
    }
}

window.removeFromCart = function(cartItemId) {
    cart = cart.filter(item => (item.cartItemId || item.id) !== cartItemId);
    saveCart();
    updateCartCount();
    renderCart();
}

window.updateQuantity = function(cartItemId, change) {
    const item = cart.find(item => (item.cartItemId || item.id) === cartItemId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            window.removeFromCart(cartItemId);
        } else {
            saveCart();
            updateCartCount();
            renderCart();
        }
    }
}

function saveCart() {
    localStorage.setItem('csgo_cart', JSON.stringify(cart));
}

function updateCartCount() {
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    cartCount.textContent = count;
}

function renderCart() {
    if (!cartItemsContainer) return;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '\
            <div class="py-10 text-center">\
                <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--bg-dark)] border border-[var(--border-color)] mb-4 text-[var(--text-muted)]">\
                    <i class="fas fa-shopping-cart text-2xl"></i>\
                </div>\
                <h3 class="text-white font-medium mb-2">Your cart is empty</h3>\
                <p class="text-[var(--text-muted)] text-sm mb-6">Looks like you haven\'t added anything yet.</p>\
                <button class="bg-[var(--accent-gradient)] text-black px-6 py-2 rounded-full font-bold text-sm" onclick="toggleCart(); navigateTo(\'products\')">Continue Shopping</button>\
            </div>\
        ';
        cartTotalPrice.textContent = '৳0';
        return;
    }

    let total = 0;
    cartItemsContainer.innerHTML = cart.map(item => {
        total += item.price * item.quantity;
        
        let variantDisplay = '';
        if (item.selectedVariants && Object.keys(item.selectedVariants).length > 0) {
            const variantStrings = Object.entries(item.selectedVariants).map(([k, v]) => k + ': ' + v);
            variantDisplay = '<div class="text-[11px] text-[var(--text-muted)] mt-1">' + variantStrings.join(', ') + '</div>';
        }
        
        const itemId = item.cartItemId || item.id;

        return '\
            <div class="flex gap-4 p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-dark)]/50 rounded-xl mb-3 relative group">\
                <div class="w-20 h-20 bg-[var(--bg-card)] rounded-lg overflow-hidden border border-[var(--border-color)] shrink-0">\
                    <img src="' + item.image + '" alt="' + item.name + '" class="w-full h-full object-cover">\
                </div>\
                <div class="flex-1 flex flex-col justify-center min-w-0">\
                    <div class="text-white font-medium text-sm line-clamp-2 pr-6">' + item.name + '</div>\
                    ' + variantDisplay + '\
                    <div class="text-[var(--accent-primary)] font-bold mt-2">৳' + item.price + '</div>\
                </div>\
                \
                <!-- Controls overlay -->\
                <div class="absolute right-4 top-4 flex flex-col items-end gap-3 h-[calc(100%-32px)] justify-between">\
                    <button class="text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors p-1" onclick="removeFromCart(\'' + itemId + '\')" title="Remove Item">\
                        <i class="fas fa-trash-alt text-sm"></i>\
                    </button>\
                    \
                    <div class="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-full px-2 py-1 h-8">\
                        <button class="w-6 h-6 flex items-center justify-center text-[var(--text-muted)] hover:text-white transition-colors" onclick="updateQuantity(\'' + itemId + '\', -1)">\
                            <i class="fas fa-minus text-[10px]"></i>\
                        </button>\
                        <span class="text-white text-xs font-medium w-4 text-center">' + item.quantity + '</span>\
                        <button class="w-6 h-6 flex items-center justify-center text-[var(--text-muted)] hover:text-white transition-colors" onclick="updateQuantity(\'' + itemId + '\', 1)">\
                            <i class="fas fa-plus text-[10px]"></i>\
                        </button>\
                    </div>\
                </div>\
            </div>\
        ';
    }).join('');

    cartTotalPrice.textContent = '৳' + total;
}

window.toggleCart = function() {
    cartSidebar.classList.toggle('open');
    cartOverlay.classList.toggle('open');
}

window.checkout = function() {
    if (cart.length === 0) {
        alert("Your cart is empty!");
        return;
    }
    window.toggleCart(); // Close the sidebar
    window.navigateTo('checkout');
}

let currentDeliveryCharge = 60; // Default to Inside Dhaka

window.updateDeliveryCharge = function() {
    const selector = document.getElementById('delivery-area');
    currentDeliveryCharge = parseInt(selector.value);
    
    // Update summary
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal + currentDeliveryCharge;
    
    document.getElementById('summary-delivery-charge').innerText = `৳${currentDeliveryCharge}`;
    document.getElementById('summary-total-amount').innerText = `৳${total}`;
    
    // Update payment instructions if visible
    const activePayment = document.querySelector('.payment-method.active');
    if (activePayment) {
        // Trigger click on active payment to refresh the amount in instructions
        activePayment.click();
    }
};

function renderCheckout() {
    if (cart.length === 0) {
        navigateTo('home');
        return;
    }

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal + currentDeliveryCharge;
    
    const userStr = localStorage.getItem('csgo_user');
    let userName = '';
    let userPhone = '';
    let userAddress = '';
    
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            userName = user.name || '';
            userPhone = user.phone || '';
            userAddress = user.address || '';
        } catch(e) {}
    }

    document.getElementById('main-content').innerHTML = '\
        <div class="py-12 bg-gradient-to-b from-[var(--bg-elevated)] to-transparent border-b border-[var(--border-subtle)] mb-8">\
            <div class="container text-center">\
                <h1 class="text-3xl md:text-4xl font-bold text-white mb-4">Secure Checkout</h1>\
                <p class="text-[var(--text-muted)]">Complete your order securely</p>\
            </div>\
        </div>\
        \
        <div class="container pb-20">\
            <div class="flex flex-col lg:flex-row gap-8">\
                <!-- Left Column: Forms -->\
                <div class="w-full lg:w-3/5 space-y-6">\
                    <div class="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 md:p-8">\
                        <div class="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--border-subtle)]">\
                            <div class="w-8 h-8 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center font-bold">1</div>\
                            <h2 class="text-xl font-bold text-white m-0">Billing & Shipping</h2>\
                        </div>\
                        \
                        <form id="checkout-form" onsubmit="processOrder(event)">\
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">\
                                <div>\
                                    <label class="block text-sm font-medium text-[var(--text-muted)] mb-2">Full Name</label>\
                                    <input type="text" id="checkout-name" placeholder="John Doe" value="' + userName + '" required class="w-full bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[var(--accent-primary)]">\
                                </div>\
                                <div>\
                                    <label class="block text-sm font-medium text-[var(--text-muted)] mb-2">Phone Number</label>\
                                    <input type="tel" id="checkout-phone" placeholder="01XXXXXXXXX" value="' + userPhone + '" required class="w-full bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[var(--accent-primary)]">\
                                </div>\
                            </div>\
                            \
                            <div class="mb-4">\
                                <label class="block text-sm font-medium text-[var(--text-muted)] mb-2">Delivery Area</label>\
                                <div class="relative">\
                                    <select id="delivery-area" onchange="updateDeliveryCharge()" required class="w-full appearance-none bg-[var(--bg-dark)] border border-[var(--border-color)] text-white py-3 px-4 rounded-lg focus:outline-none focus:border-[var(--accent-primary)] cursor-pointer">\
                                        <option value="60">Inside Dhaka (1-2 days) - 60 TK</option>\
                                        <option value="100">Dhaka Sub Area (1-2 days) - 100 TK</option>\
                                        <option value="120">Outside Dhaka (2-4 days) - 120 TK</option>\
                                    </select>\
                                    <i class="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"></i>\
                                </div>\
                            </div>\
                            \
                            <div>\
                                <label class="block text-sm font-medium text-[var(--text-muted)] mb-2">Full Delivery Address</label>\
                                <textarea id="checkout-address" rows="3" placeholder="House/Flat No, Street, Area..." required class="w-full bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[var(--accent-primary)]">' + userAddress + '</textarea>\
                            </div>\
                    </div>\
                    \
                    <div class="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 md:p-8">\
                        <div class="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--border-subtle)]">\
                            <div class="w-8 h-8 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center font-bold">2</div>\
                            <h2 class="text-xl font-bold text-white m-0">Payment Method</h2>\
                        </div>\
                        \
                        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6 payment-methods">\
                            <div class="payment-method active flex flex-col items-center justify-center p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-dark)] cursor-pointer hover:border-white/30 transition-all text-center h-24" onclick="selectPayment(\'cod\', event)">\
                                <i class="fas fa-money-bill-wave text-2xl text-[var(--accent-primary)] mb-2"></i>\
                                <span class="text-xs font-medium text-white leading-tight">Cash on Delivery</span>\
                            </div>\
                            <div class="payment-method bkash flex flex-col items-center justify-center p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-dark)] cursor-pointer hover:border-[#e2136e] transition-all text-center h-24" onclick="selectPayment(\'bkash\', event)">\
                                <img src="https://sdbgeuyzepwnxpresktm.supabase.co/storage/v1/object/public/Payment/bkash.jpg" alt="bKash" class="h-8 object-contain mb-2 rounded-md" referrerPolicy="no-referrer">\
                                <span class="text-xs font-medium text-white">bKash</span>\
                            </div>\
                            <div class="payment-method nagad flex flex-col items-center justify-center p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-dark)] cursor-pointer hover:border-[#f7941d] transition-all text-center h-24" onclick="selectPayment(\'nagad\', event)">\
                                <img src="https://sdbgeuyzepwnxpresktm.supabase.co/storage/v1/object/public/Payment/nagad.webp" alt="Nagad" class="h-8 object-contain mb-2 rounded-md" referrerPolicy="no-referrer">\
                                <span class="text-xs font-medium text-white">Nagad</span>\
                            </div>\
                            <div class="payment-method rocket flex flex-col items-center justify-center p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-dark)] cursor-pointer hover:border-[#8c1564] transition-all text-center h-24" onclick="selectPayment(\'rocket\', event)">\
                                <img src="https://sdbgeuyzepwnxpresktm.supabase.co/storage/v1/object/public/Payment/rocket.webp" alt="Rocket" class="h-8 object-contain mb-2 rounded-md" referrerPolicy="no-referrer">\
                                <span class="text-xs font-medium text-white">Rocket</span>\
                            </div>\
                            <div class="payment-method bank flex flex-col items-center justify-center p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-dark)] cursor-pointer hover:border-[#006a4e] transition-all text-center h-24" onclick="selectPayment(\'bank\', event)">\
                                <img src="https://sdbgeuyzepwnxpresktm.supabase.co/storage/v1/object/public/Payment/islamic%20bank.jpg" alt="Islami Bank" class="h-8 object-contain mb-2 rounded-md" referrerPolicy="no-referrer">\
                                <span class="text-xs font-medium text-white">Islami Bank</span>\
                            </div>\
                        </div>\
\
                        <div id="payment-instructions" class="bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 rounded-xl p-4 mb-6">\
                            <div class="font-bold text-[var(--accent-primary)] mb-1">Cash on Delivery</div>\
                            <div class="text-sm text-[var(--text-muted)]">You will pay the delivery person when you receive the product.</div>\
                        </div>\
\
                        <div id="digital-payment-inputs" style="display: none;" class="space-y-4 mb-6">\
                            <div>\
                                <label class="block text-sm font-medium text-[var(--text-muted)] mb-2">Sender Phone Number</label>\
                                <input type="text" id="checkout-sender-phone" placeholder="e.g. 017XXXXXXXX" class="w-full bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[var(--accent-primary)]">\
                            </div>\
                            <div>\
                                <label class="block text-sm font-medium text-[var(--text-muted)] mb-2">Transaction ID (TrxID)</label>\
                                <input type="text" id="checkout-trxid" placeholder="8X2HD9K2" class="w-full bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[var(--accent-primary)]">\
                            </div>\
                        </div>\
\
                        <button type="submit" id="place-order-btn" class="w-full bg-[var(--accent-gradient)] text-black font-bold text-lg py-4 px-8 rounded-xl shadow-lg hover:shadow-[var(--accent-primary)]/20 transition-all flex justify-center items-center gap-2 group">\
                            Place Order <i class="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>\
                        </button>\
                        </form>\
                    </div>\
                </div>\
                \
                <!-- Right Column: Order Summary -->\
                <div class="w-full lg:w-2/5">\
                    <div class="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 md:p-8 sticky top-24">\
                        <h2 class="text-xl font-bold text-white mb-6 pb-4 border-b border-[var(--border-subtle)]">Order Summary</h2>\
                        \
                        <div class="max-h-[300px] overflow-y-auto pr-2 space-y-4 mb-6 scrollbar-hide">\
                            ' + cart.map(item => {
                                let variantDisplay = '';
                                if (item.selectedVariants && Object.keys(item.selectedVariants).length > 0) {
                                    const variantStrings = Object.entries(item.selectedVariants).map(([k, v]) => k + ': ' + v);
                                    variantDisplay = '<div class="text-[11px] text-[var(--text-muted)] mt-0.5">' + variantStrings.join(', ') + '</div>';
                                }
                                return '\
                                <div class="flex items-center gap-4">\
                                    <div class="relative w-16 h-16 rounded-lg bg-[var(--bg-dark)] border border-[var(--border-color)] overflow-hidden shrink-0">\
                                        <img src="' + item.image + '" alt="' + item.name + '" class="w-full h-full object-cover">\
                                        <span class="absolute -top-2 -right-2 bg-[var(--text-muted)] text-black text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-[var(--bg-dark)]">' + item.quantity + '</span>\
                                    </div>\
                                    <div class="flex-1 min-w-0">\
                                        <div class="text-sm font-medium text-white line-clamp-2">' + item.name + '</div>\
                                        ' + variantDisplay + '\
                                        <div class="text-xs text-[var(--text-muted)] mt-1">Qty: ' + item.quantity + '</div>\
                                    </div>\
                                    <div class="text-sm font-bold text-white shrink-0">\
                                        ৳' + (item.price * item.quantity) + '\
                                    </div>\
                                </div>\
                                ';
                            }).join('') + '\
                        </div>\
                        \
                        <div class="space-y-3 pt-6 border-t border-[var(--border-subtle)] text-sm">\
                            <div class="flex justify-between items-center text-[var(--text-muted)]">\
                                <span>Subtotal</span>\
                                <span>৳' + subtotal + '</span>\
                            </div>\
                            <div class="flex justify-between items-center text-[var(--text-muted)]">\
                                <span>Delivery Charge</span>\
                                <span id="summary-delivery-charge">৳' + currentDeliveryCharge + '</span>\
                            </div>\
                            \
                            <div class="flex justify-between items-center pt-4 border-t border-[var(--border-subtle)]">\
                                <span class="text-base font-bold text-white">Total Amount</span>\
                                <span class="text-2xl font-black text-[var(--accent-primary)]" id="summary-total-amount">৳' + total + '</span>\
                            </div>\
                        </div>\
                    </div>\
                </div>\
            </div>\
        </div>\
    ';
}

window.selectPayment = function(method, event) {
    // Update active class
    document.querySelectorAll('.payment-method').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');

    const inst = document.getElementById('payment-instructions');
    if (!inst) return;
    const digitalInputs = document.getElementById('digital-payment-inputs');
    const senderPhone = document.getElementById('checkout-sender-phone');
    const trxId = document.getElementById('checkout-trxid');
    
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal + currentDeliveryCharge;
    
    // Store selected method globally or as a data attribute
    document.getElementById('checkout-form').dataset.paymentMethod = method;

    if(method === 'cod') {
        inst.innerHTML = `
            <div style="margin-bottom: 10px;"><strong>Cash on Delivery</strong></div>
            <div style="font-size: 0.9rem; color: var(--text-light);">You will pay the delivery person when you receive the product.</div>
        `;
        inst.style.borderLeftColor = 'var(--accent-color)';
        inst.style.background = 'rgba(249, 158, 26, 0.1)';
        
        digitalInputs.style.display = 'none';
        senderPhone.removeAttribute('required');
        trxId.removeAttribute('required');
    } else {
        digitalInputs.style.display = 'block';
        senderPhone.setAttribute('required', 'true');
        trxId.setAttribute('required', 'true');
        inst.style.background = 'var(--bg-light)';
        
        if(method === 'bkash') {
            inst.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                    <img src="https://sdbgeuyzepwnxpresktm.supabase.co/storage/v1/object/public/Payment/bkash.jpg" alt="bKash" style="height: 30px; border-radius: 4px;" referrerPolicy="no-referrer">
                    <strong>bKash Send Money</strong>
                </div>
                <div style="margin-bottom: 10px;">Please send exactly <strong>৳${total}</strong> to:</div>
                <div style="font-size: 1.5rem; font-weight: bold; color: #e2136e; letter-spacing: 2px; margin-bottom: 10px;">01873827520</div>
                <div style="font-size: 0.9rem; color: var(--text-light);">Type: Personal (Send Money Only)</div>
            `;
            inst.style.borderLeftColor = '#e2136e';
        } else if(method === 'nagad') {
            inst.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                    <img src="https://sdbgeuyzepwnxpresktm.supabase.co/storage/v1/object/public/Payment/nagad.webp" alt="Nagad" style="height: 30px; border-radius: 4px;" referrerPolicy="no-referrer">
                    <strong>Nagad Send Money</strong>
                </div>
                <div style="margin-bottom: 10px;">Please send exactly <strong>৳${total}</strong> to:</div>
                <div style="font-size: 1.5rem; font-weight: bold; color: #f7931e; letter-spacing: 2px; margin-bottom: 10px;">01873827520</div>
                <div style="font-size: 0.9rem; color: var(--text-light);">Type: Personal (Send Money Only)</div>
            `;
            inst.style.borderLeftColor = '#f7931e';
        } else if(method === 'rocket') {
            inst.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                    <img src="https://sdbgeuyzepwnxpresktm.supabase.co/storage/v1/object/public/Payment/rocket.webp" alt="Rocket" style="height: 30px; border-radius: 4px;" referrerPolicy="no-referrer">
                    <strong>Rocket Send Money</strong>
                </div>
                <div style="margin-bottom: 10px;">Please send exactly <strong>৳${total}</strong> to:</div>
                <div style="font-size: 1.5rem; font-weight: bold; color: #d633ff; letter-spacing: 2px; margin-bottom: 10px;">01873827520</div>
                <div style="font-size: 0.9rem; color: var(--text-light);">Type: Personal (Send Money Only)</div>
            `;
            inst.style.borderLeftColor = '#d633ff';
        } else if(method === 'bank') {
            inst.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                    <img src="https://sdbgeuyzepwnxpresktm.supabase.co/storage/v1/object/public/Payment/islamic%20bank.jpg" alt="Islami Bank" style="height: 30px; border-radius: 4px;" referrerPolicy="no-referrer">
                    <strong>Bank Transfer</strong>
                </div>
                <div style="margin-bottom: 10px;">Please transfer exactly <strong>৳${total}</strong> to:</div>
                <div style="margin-bottom: 5px;">Bank Name: <strong>Islami Bank Bangladesh Ltd.</strong></div>
                <div style="margin-bottom: 5px;">Account Name: <strong>CSGO SHOP</strong></div>
                <div style="margin-bottom: 10px;">Account No: <strong>20501166700228303</strong></div>
                <div style="font-size: 0.9rem; color: var(--text-light);">Please use your Phone Number as the reference.</div>
            `;
            inst.style.borderLeftColor = '#3399ff';
        }
    }
}

window.processOrder = async function(event) {
    event.preventDefault();
    
    const btn = document.getElementById('place-order-btn');
    const originalBtnText = btn.innerText;
    btn.innerText = 'Processing...';
    btn.disabled = true;
    
    const name = document.getElementById('checkout-name').value;
    const phone = document.getElementById('checkout-phone').value;
    const address = document.getElementById('checkout-address').value;
    const deliveryArea = document.getElementById('delivery-area').options[document.getElementById('delivery-area').selectedIndex].text;
    
    // Get payment details
    const paymentMethod = document.getElementById('checkout-form').dataset.paymentMethod || 'cod';
    const senderPhone = document.getElementById('checkout-sender-phone') ? document.getElementById('checkout-sender-phone').value : '';
    const trxId = document.getElementById('checkout-trxid') ? document.getElementById('checkout-trxid').value : '';
    
    let subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let deliveryCharge = parseInt(document.getElementById('delivery-area').value);
    let total = subtotal + deliveryCharge;

    const referredBy = localStorage.getItem('csgo_referred_by');

    const orderData = {
        name: name,
        phone: phone,
        address: address,
        deliveryArea: deliveryArea,
        subtotal: subtotal,
        deliveryCharge: deliveryCharge,
        total: total,
        paymentMethod: paymentMethod,
        senderPhone: senderPhone,
        trxId: trxId,
        referredBy: referredBy || null,
        products: cart.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            variants: item.selectedVariants || {}
        }))
    };

    try {
        // Replace this with your actual submit-order Edge Function URL
        const SUBMIT_ORDER_URL = 'https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/submit-order';
        
        console.log("Submitting order to:", SUBMIT_ORDER_URL);
        console.log("Order data:", orderData);

        const response = await apiFetch(SUBMIT_ORDER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(orderData)
        });

        console.log("Submit order response status:", response.status);

        if (!response.ok) {
            let errorText = '';
            try {
                const errorData = await response.json();
                errorText = errorData.error || JSON.stringify(errorData);
            } catch(e) {
                errorText = await response.text();
            }
            throw new Error(`Failed to submit order: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const responseData = await response.json();
        console.log("Submit order success:", responseData);

        alert("Order Placed Successfully!\n\nWe have received your order. We will process it shortly.");
        
        cart = [];
        saveCart();
        updateCartCount();
        renderCart();
        navigateTo('home');
    } catch (error) {
        console.error('Error submitting order:', error);
        alert("There was an error placing your order:\n\n" + error.message + "\n\nPlease try again or contact us directly on WhatsApp.");
    } finally {
        btn.innerText = originalBtnText;
        btn.disabled = false;
    }
}

window.toggleMobileSearch = function() {
    openSearchOverlay();
}

// Mobile Menu
window.toggleMobileMenu = function() {
    document.querySelector('.nav-menu').classList.toggle('active');
}

window.closeMobileMenu = function() {
    const nav = document.querySelector('.nav-menu');
    if (nav) nav.classList.remove('active');
}

function renderAdminDashboard() {
    const user = JSON.parse(localStorage.getItem('csgo_user'));
    if (!user || user.phone !== '01873827520') {
        navigateTo('home');
        return;
    }
    
    // Prompt for password
    const adminPass = prompt("Enter Admin Password:");
    if (!adminPass) {
        navigateTo('account');
        return;
    }

    document.getElementById('main-content').innerHTML = `
        <div class="page-header">
            <div class="container">
                <h1><i class="fas fa-crown" style="color: var(--accent-color);"></i> Admin Dashboard</h1>
            </div>
        </div>
        <div class="container page-content" style="max-width: 1200px;">
            <div id="admin-stats-container" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 40px;">
                <p>Loading stats...</p>
            </div>

            <div style="display: flex; gap: 20px; margin-bottom: 30px;">
                <button class="btn" style="flex: 1;" onclick="adminShowUsers()">Manage Users</button>
                <button class="btn" style="flex: 1;" onclick="adminShowProducts()">Manage Products</button>
                <button class="btn" style="flex: 1;" onclick="adminShowOrders()">Manage Orders</button>
            </div>
            
            <div id="admin-workspace" style="background: var(--bg-light); padding: 30px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); overflow-x: auto;">
                <p style="text-align:center; color: var(--text-light);">Select an option above to manage.</p>
            </div>
        </div>
    `;

    // Store auth temp
    window.adminAuth = { phone: user.phone, password: adminPass };
    fetchAdminStats();
}

async function adminApiCall(action, payload = {}) {
    const SUPABASE_ADMIN_API = 'https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/admin';
    try {
        const response = await apiFetch(SUPABASE_ADMIN_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, auth: window.adminAuth, ...payload })
        });
        
        let data;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            data = await response.json();
        } else {
            const text = await response.text();
            throw new Error(text || `HTTP Error ${response.status}`);
        }

        if(!response.ok) throw new Error(data.error || 'Server error');
        return data;
    } catch(err) {
        console.error("Admin API Error:", err);
        alert("Admin Error: " + err.message);
        return null;
    }
}

async function fetchAdminStats() {
    const data = await adminApiCall('get_dashboard_data');
    if (!data) return;
    document.getElementById('admin-stats-container').innerHTML = `
        <div style="background: var(--bg-light); padding: 20px; border-radius: 12px; text-align: center; border: 1px solid rgba(255,255,255,0.05);">
            <i class="fas fa-users" style="font-size: 2rem; color: var(--accent-color); margin-bottom: 10px;"></i>
            <h3>Total Users</h3>
            <p style="font-size: 1.5rem; font-weight: bold; color: var(--accent-color);">${data.stats.totalUsers}</p>
        </div>
        <div style="background: var(--bg-light); padding: 20px; border-radius: 12px; text-align: center; border: 1px solid rgba(255,255,255,0.05);">
            <i class="fas fa-shopping-cart" style="font-size: 2rem; color: var(--accent-color); margin-bottom: 10px;"></i>
            <h3>Total Orders</h3>
            <p style="font-size: 1.5rem; font-weight: bold; color: var(--accent-color);">${data.stats.totalOrders}</p>
        </div>
        <div style="background: var(--bg-light); padding: 20px; border-radius: 12px; text-align: center; border: 1px solid rgba(255,255,255,0.05);">
            <i class="fas fa-box" style="font-size: 2rem; color: var(--accent-color); margin-bottom: 10px;"></i>
            <h3>Custom Products</h3>
            <p style="font-size: 1.5rem; font-weight: bold; color: var(--accent-color);">${data.stats.customProducts}</p>
        </div>
    `;
}

window.adminShowUsers = async function() {
    const ws = document.getElementById('admin-workspace');
    ws.innerHTML = '<p>Loading users...</p>';
    const data = await adminApiCall('get_users');
    if (!data) return;
    
    ws.innerHTML = `
        <h3 style="margin-bottom: 20px;">All Users</h3>
        <table style="width: 100%; text-align: left; border-collapse: collapse; min-width: 600px;">
            <thead>
                <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-light);">
                    <th style="padding: 10px;">Name/Username</th>
                    <th style="padding: 10px;">Phone</th>
                    <th style="padding: 10px;">Joined</th>
                    <th style="padding: 10px;">Payment Method</th>
                </tr>
            </thead>
            <tbody>
                ${data.users.map(u => `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <td style="padding: 10px;">${u.name || ''}<br><small style="color:var(--text-light);">@${u.username || 'N/A'}</small></td>
                        <td style="padding: 10px;">${u.phone}</td>
                        <td style="padding: 10px;">${new Date(u.created_at).toLocaleDateString()}</td>
                        <td style="padding: 10px; text-transform: capitalize;">${u.payment_method || 'None'}<br><small style="color:var(--text-light);">${u.payment_details || ''}</small></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

window.adminShowOrders = async function() {
    const ws = document.getElementById('admin-workspace');
    ws.innerHTML = '<p>Loading orders...</p>';
    const data = await adminApiCall('get_orders');
    if (!data) return;
    
    ws.innerHTML = `
        <h3 style="margin-bottom: 20px;">All Orders</h3>
        <table style="width: 100%; text-align: left; border-collapse: collapse; min-width: 800px;">
            <thead>
                <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-light);">
                    <th style="padding: 10px;">Order ID</th>
                    <th style="padding: 10px;">Customer</th>
                    <th style="padding: 10px;">Amount</th>
                    <th style="padding: 10px;">Status</th>
                    <th style="padding: 10px;">Actions</th>
                </tr>
            </thead>
            <tbody>
                ${data.orders.map(o => `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <td style="padding: 10px;">#${o.id}<br><small style="color:var(--text-light);">${new Date(o.created_at).toLocaleDateString()}</small></td>
                        <td style="padding: 10px;">${o.customer_name}<br>${o.customer_phone}</td>
                        <td style="padding: 10px;">৳${o.total_amount}</td>
                        <td style="padding: 10px;">
                            <select onchange="adminUpdateOrderStatus('${o.id}', this.value)" style="padding: 5px; background: var(--secondary-color); color: white; border: 1px solid var(--border-color); border-radius: 4px;">
                                <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>Pending</option>
                                <option value="processing" ${o.status === 'processing' ? 'selected' : ''}>Processing</option>
                                <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                                <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                            </select>
                        </td>
                        <td style="padding: 10px;">
                            <button class="btn btn-outline" style="padding: 4px 8px; font-size: 12px;" onclick="alert('Items: ' + decodeURIComponent('${encodeURIComponent(JSON.stringify(o.cart_items))}'))">View Items</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

window.adminUpdateOrderStatus = async function(orderId, status) {
    const data = await adminApiCall('update_order_status', { orderId, status });
    if(data) alert("Order updated!");
}

window.adminShowProducts = async function() {
    const ws = document.getElementById('admin-workspace');
    ws.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3>Manage Custom Products</h3>
            <div style="display: flex; gap: 10px;">
                <button class="btn btn-outline" onclick="document.getElementById('csv-file').click()"><i class="fas fa-file-csv"></i> Bulk Upload CSV</button>
                <input type="file" id="csv-file" accept=".csv" style="display: none;" onchange="adminHandleCSVUpload(event)">
                <button class="btn" onclick="document.getElementById('add-product-form').style.display='block'">+ Add Custom Product</button>
            </div>
        </div>
        
        <div id="csv-upload-progress" style="display: none; background: rgba(255,193,7,0.1); border: 1px solid var(--accent-color); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p id="csv-progress-text" style="margin: 0; color: var(--accent-color); font-weight: bold;"></p>
        </div>
        
        <form id="add-product-form" style="display: none; background: var(--secondary-color); padding: 20px; border-radius: 8px; margin-bottom: 20px;" onsubmit="adminSubmitProduct(event)">
            <h4>New Product Details</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
                <input type="text" id="ap-name" placeholder="Product Name" required style="width:100%; padding: 10px; border-radius: 4px; background: var(--bg-light); color: white; border: 1px solid var(--border-color);">
                <input type="number" id="ap-price" placeholder="Price (৳)" required style="width:100%; padding: 10px; border-radius: 4px; background: var(--bg-light); color: white; border: 1px solid var(--border-color);">
                <input type="text" id="ap-category" placeholder="Category" required style="width:100%; padding: 10px; border-radius: 4px; background: var(--bg-light); color: white; border: 1px solid var(--border-color);">
                <input type="text" id="ap-image" placeholder="Image URL (Thumbnail)" required style="width:100%; padding: 10px; border-radius: 4px; background: var(--bg-light); color: white; border: 1px solid var(--border-color);">
            </div>
            <textarea id="ap-desc" placeholder="Product Details..." style="width:100%; padding: 10px; border-radius: 4px; background: var(--bg-light); color: white; border: 1px solid var(--border-color); margin-top: 15px; height: 80px;"></textarea>
            <div style="margin-top: 15px; text-align: right;">
                <button type="button" class="btn btn-outline" onclick="document.getElementById('add-product-form').style.display='none'">Cancel</button>
                <button type="submit" class="btn">Save Product</button>
            </div>
        </form>

        <div id="custom-products-list">
            <p>Loading...</p>
        </div>
    `;

    const customProds = products.filter(p => p.custom);
    renderCustomProductsList(customProds);
}

function renderCustomProductsList(list) {
    const cpl = document.getElementById('custom-products-list');
    if (!cpl) return;
    if(list.length === 0) {
        cpl.innerHTML = '<p style="color:var(--text-light);">No custom products found in database.</p>';
        return;
    }
    
    cpl.innerHTML = `
        <table style="width: 100%; text-align: left; border-collapse: collapse;">
            <thead>
                <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-light);">
                    <th style="padding: 10px;">Product</th>
                    <th style="padding: 10px;">Category</th>
                    <th style="padding: 10px;">Price</th>
                    <th style="padding: 10px;">Action</th>
                </tr>
            </thead>
            <tbody>
                ${list.map(p => `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <td style="padding: 10px; display: flex; align-items: center; gap: 10px;">
                            <img src="${p.thumbnail_img}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">
                            ${p.name}
                        </td>
                        <td style="padding: 10px;">${p.category}</td>
                        <td style="padding: 10px;">৳${p.price}</td>
                        <td style="padding: 10px;">
                            <button class="btn btn-outline" style="padding: 4px 8px; color: #f44336; border-color: #f44336;" onclick="adminDeleteProduct('${p.id}')"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

window.adminSubmitProduct = async function(e) {
    e.preventDefault();
    const newProduct = {
        name: document.getElementById('ap-name').value,
        price: parseInt(document.getElementById('ap-price').value),
        sale_price: parseInt(document.getElementById('ap-price').value),
        category: document.getElementById('ap-category').value,
        thumbnail_img: document.getElementById('ap-image').value,
        details: document.getElementById('ap-desc').value,
        product_variants: [],
        product_images: [],
        status: 1
    };

    const res = await adminApiCall('add_product', { product: newProduct });
    if(res) {
        alert("Product Added!");
        // Update local array and refresh view
        products.unshift({...res.product, custom: true});
        adminShowProducts();
    }
}

window.adminDeleteProduct = async function(id) {
    if(!confirm("Are you sure you want to delete this product?")) return;
    const res = await adminApiCall('delete_product', { productId: id });
    if(res) {
        alert("Product Deleted!");
        products = products.filter(p => p.id !== id);
        adminShowProducts();
    }
}

window.adminHandleCSVUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        const text = e.target.result;
        const productsArray = parseCSV(text);
        
        if (productsArray.length === 0) {
            alert("No valid products found in CSV.");
            return;
        }

        if (!confirm(`Are you sure you want to upload ${productsArray.length} products?`)) return;

        const progressDiv = document.getElementById('csv-upload-progress');
        const progressText = document.getElementById('csv-progress-text');
        progressDiv.style.display = 'block';
        progressText.innerText = `Uploading ${productsArray.length} products...`;

        const res = await adminApiCall('bulk_add_products', { products: productsArray });
        
        if (res && res.products) {
            alert(`Success! Added ${res.products.length} products.`);
            // Add new products to the local list
            const newProds = res.products.map(p => ({...p, custom: true}));
            products = [...newProds, ...products];
            adminShowProducts();
        } else {
            progressDiv.style.display = 'none';
        }
    };
    reader.readAsText(file);
    // Reset input so the same file can be uploaded again if needed
    event.target.value = '';
}
function parseCSV(csv) {
    const lines = csv.split(/\r?\n/);
    if (lines.length < 2) return [];

    const products = [];
    // Skip the header row
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        // Simple CSV parser handling quotes
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let char of lines[i]) {
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());

        if (values.length < 2) continue;

        const p = {};
        const getValue = (idx, fallback = '') => values[idx] !== undefined ? values[idx] : fallback;

        p.name = getValue(0);
        p.price = parseInt(getValue(1)) || 0;
        p.sale_price = p.price;
        p.category = getValue(2);
        p.thumbnail_img = getValue(3);
        p.details = getValue(4);
        p.status = 1;
        p.product_variants = [];
        p.product_images = [];

        if (p.name) products.push(p);
    }
    return products;
}

// ==========================================
// SEARCH OVERLAY & LIVE SEARCH LOGIC
// ==========================================
let searchDebounceTimer;

function openSearchOverlay() {
    const overlay = document.getElementById('search-overlay');
    const desktopInput = document.getElementById('desktop-search-input');
    const overlayInput = document.getElementById('overlay-search-input');
    if (overlay) overlay.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevent scrolling background
    
    // Sync value from desktop input to overlay input
    if (overlayInput && desktopInput && desktopInput.value) {
        overlayInput.value = desktopInput.value;
    }
    
    // Focus overlay input on mobile, desktop input on desktop
    const isMobile = window.innerWidth < 1024;
    if (isMobile && overlayInput) {
        setTimeout(() => overlayInput.focus(), 100);
    } else if (desktopInput) {
        setTimeout(() => desktopInput.focus(), 100);
    }
    
    const currentQuery = overlayInput?.value || desktopInput?.value || '';
    if (currentQuery.length > 0) {
        handleLiveSearch(currentQuery);
    } else {
        const container = document.getElementById('search-results-container');
        const emptyState = document.getElementById('search-empty-state');
        if (container) container.innerHTML = '';
        if (emptyState) emptyState.style.display = 'none';
    }
}

function closeSearchOverlay() {
    const overlay = document.getElementById('search-overlay');
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function clearSearch() {
    const input = document.getElementById('desktop-search-input');
    if (input) {
        input.value = '';
        input.focus();
    }
    document.querySelector('.clear-search').style.display = 'none';
    document.getElementById('search-results-container').innerHTML = '';
    document.getElementById('search-empty-state').style.display = 'none';
}

function handleLiveSearch(query) {
    const clearBtn = document.querySelector('.clear-search');
    if (clearBtn) {
        clearBtn.style.display = query.length > 0 ? 'block' : 'none';
    }
    
    if (query.length < 2) {
        document.getElementById('search-results-container').innerHTML = '';
        document.getElementById('search-empty-state').style.display = 'none';
        return;
    }

    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        const terms = query.toLowerCase().split(' ').filter(t => t.length > 0);
        const results = products.filter(p => {
            const searchStr = (p.name + ' ' + p.category + ' ' + (p.subcategory||'')).toLowerCase();
            return terms.every(term => searchStr.includes(term));
        }).slice(0, 12); // Max 12 results for live search
        
        const container = document.getElementById('search-results-container');
        const emptyState = document.getElementById('search-empty-state');
        
        if (results.length > 0) {
            container.innerHTML = results.map(p => generateProductCard(p)).join('');
            emptyState.style.display = 'none';
        } else {
            container.innerHTML = '';
            emptyState.style.display = 'block';
        }
    }, 300); // 300ms debounce
}

// Close search overlay on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSearchOverlay();
});

// ==========================================
// MOBILE MENU LOGIC
// ==========================================
function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    const overlay = document.getElementById('mobile-menu-overlay');
    if (menu.style.left === '0px') {
        closeMobileMenu();
    } else {
        menu.style.left = '0px';
        if (overlay) overlay.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function closeMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    const overlay = document.getElementById('mobile-menu-overlay');
    if (menu) menu.style.left = '-100%';
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function toggleMobileSearch() {
    // Open desktop search overlay, it acts full screen on mobile anyway
    openSearchOverlay();
}

// ==========================================
// CENTRALIZED IMAGE FALLBACK HANDLER
// ==========================================
document.addEventListener('error', function(e) {
    const target = e.target;
    if (target && target.tagName && target.tagName.toLowerCase() === 'img') {
        const stage = target.getAttribute('data-fallback-stage');
        
        if (stage === 'optimized') {
            const originalSrc = target.getAttribute('data-original-src');
            if (originalSrc && target.src !== originalSrc) {
                target.setAttribute('data-fallback-stage', 'original');
                target.src = originalSrc;
                target.srcset = ''; // Clear srcset to prevent upscaling proxy
                return;
            }
        }
        
        if (stage === 'optimized' || stage === 'original') {
            target.removeAttribute('data-fallback-stage'); // Prevent infinite loops
            target.src = 'https://placehold.co/600x600/1e293b/f59e0b?text=CSGO+SHOP';
            target.srcset = '';
        }
    }
}, true);


window.addEventListener('hashchange', handleRoute);

function handleRoute() {
    const hash = window.location.hash.replace('#', '') || 'home';
    const [page, param] = hash.split('?');
    
    let decodedParam = null;
    if (param) {
        const urlParams = new URLSearchParams(param);
        decodedParam = urlParams.get('q') || urlParams.get('cat') || urlParams.get('id');
    }

    window.scrollTo(0, 0);
    if (typeof closeMobileMenu === 'function') closeMobileMenu();
    if (typeof closeMobileSearch === 'function') closeMobileSearch(); 
    if (typeof hideStickyBar === 'function') hideStickyBar();
    
    if (typeof document.getElementById('main-content') !== 'undefined' && document.getElementById('main-content')) {
        document.getElementById('main-content').classList.remove('reveal');
        void document.getElementById('main-content').offsetWidth;
        document.getElementById('main-content').classList.add('reveal');
    }
    
    const globalBottom = document.getElementById('global-bottom-sections');
    if (globalBottom) {
        if (page === 'home' || page === '' || !page) {
            globalBottom.style.display = 'block';
        } else {
            globalBottom.style.display = 'none';
        }
    }
    
    if (typeof refreshIcons === 'function') setTimeout(refreshIcons, 100);
    
    switch(page) {
        case 'categories':
            if (typeof renderCategories === 'function') renderCategories();
            else if (typeof document.getElementById('main-content') !== 'undefined') document.getElementById('main-content').innerHTML = '<h2 class="text-white text-center mt-10">Categories Coming Soon</h2>';
            break;
        case 'affiliate':
            if (typeof renderAffiliate === 'function') renderAffiliate();
            else if (typeof document.getElementById('main-content') !== 'undefined') document.getElementById('main-content').innerHTML = '<h2 class="text-white text-center mt-10">Affiliate Portal Coming Soon</h2>';
            break;
        case 'rewards':
            if (typeof renderRewards === 'function') renderRewards();
            break;
        case 'investor':
            if (typeof renderInvestor === 'function') renderInvestor();
            break;
        case 'reseller':
            if (typeof renderReseller === 'function') renderReseller();
            break;
        case 'wishlist':
            if (typeof renderWishlistPage === 'function') renderWishlistPage();
            break;
        case 'notifications':
            if (typeof renderNotifications === 'function') renderNotifications();
            break;
        case 'home':
            if (typeof renderHome === 'function') renderHome();
            break;
        case 'products':
            if (typeof renderProductList === 'function') renderProductList(decodedParam);
            break;
        case 'search':
            if (typeof renderProductList === 'function') renderProductList(null, decodedParam);
            break;
        case 'product-details':
            if (typeof renderProductDetails === 'function') renderProductDetails(decodedParam);
            break;
        case 'about':
            if (typeof renderAbout === 'function') renderAbout();
            break;
        case 'checkout':
            if (typeof renderCheckout === 'function') renderCheckout();
            break;
        case 'cart':
            if (typeof renderCart === 'function') renderCart();
            break;
        case 'account':
            if (typeof renderAccount === 'function') renderAccount();
            break;
        default:
            if (typeof renderHome === 'function') renderHome();
    }
}

// ============================================================================
// ECOSYSTEM: REWARDS, LUCKY SPIN & COIN CONVERSION
// ============================================================================

window.renderRewards = function() {
    const main = document.getElementById('main-content');
    if (!main) return;

    const userStr = localStorage.getItem('csgo_user');
    const user = userStr ? JSON.parse(userStr) : null;
    const phone = user ? user.phone : 'guest';

    // Local persistent state
    const today = new Date().toISOString().substring(0, 10);
    const lastDate = localStorage.getItem('csgo_last_spin_date_' + phone) || '';
    let dailyFreeSpins = parseInt(localStorage.getItem('csgo_free_spins_' + phone) || '5');
    let orderBonusSpins = parseInt(localStorage.getItem('csgo_order_spins_' + phone) || '0');

    if (lastDate !== today) {
        dailyFreeSpins = 5;
        localStorage.setItem('csgo_free_spins_' + phone, '5');
        localStorage.setItem('csgo_last_spin_date_' + phone, today);
    }

    const totalSpins = dailyFreeSpins + orderBonusSpins;
    const coins = user ? (user.csgo_coins || 0) : 0;
    const streak = user ? (user.checkin_streak || 0) : 0;
    const lastCheckin = user ? (user.last_checkin_date || '') : '';
    const claimedToday = lastCheckin === today;

    main.innerHTML = `
        <div class="py-12 bg-gradient-to-b from-purple-950/40 via-[var(--bg-dark)] to-transparent border-b border-[var(--border-subtle)]">
            <div class="container text-center max-w-4xl mx-auto px-4">
                <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-950/40 border border-pink-700/50 text-pink-400 text-xs font-bold mb-4 animate-pulse">
                    <i class="fas fa-gift"></i> CSGO SHOP Rewards & Gaming Club
                </div>
                <h1 class="text-3xl sm:text-5xl font-black text-white mb-3">Daily Spin & Coin Rewards</h1>
                <p class="text-[var(--text-muted)] text-sm sm:text-base max-w-xl mx-auto">
                    Claim daily streak check-ins, spin the lucky wheel, and convert your coins to real wallet cash (100 Coins = ৳1.00)!
                </p>
            </div>
        </div>

        <div class="container py-12 px-4 max-w-6xl mx-auto space-y-12">
            
            <!-- Top Stats & Wallet Conversion Bar -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <!-- Coin Balance Card -->
                <div class="bg-[var(--bg-card)] border border-purple-500/30 rounded-2xl p-6 relative overflow-hidden">
                    <div class="text-xs text-[var(--text-muted)] uppercase font-bold mb-1">Your CSGO Coins</div>
                    <div class="text-3xl sm:text-4xl font-black text-pink-400 flex items-center gap-2">
                        <i class="fas fa-coins text-amber-400"></i> <span id="rewards-coin-balance">${coins}</span>
                    </div>
                    <div class="text-xs text-[var(--text-muted)] mt-2">Value: ৳${(coins / 100).toFixed(2)} Wallet Cash</div>
                </div>

                <!-- Convert Coins to Cash -->
                <div class="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 flex flex-col justify-between">
                    <div>
                        <div class="text-xs text-[var(--text-muted)] uppercase font-bold mb-1">Coin Exchange (100 Coins = ৳1)</div>
                        <p class="text-xs text-[var(--text-muted)] mb-3">Instantly convert your accumulated reward coins into shopping balance.</p>
                    </div>
                    <button onclick="convertCoinsToCash()" class="bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-extrabold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-all shadow-lg shadow-amber-500/20">
                        <i class="fas fa-exchange-alt"></i> Convert 100 Coins ➔ ৳1 Wallet Cash
                    </button>
                </div>

                <!-- Daily Streak Card -->
                <div class="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 flex flex-col justify-between">
                    <div>
                        <div class="flex justify-between items-center mb-1">
                            <span class="text-xs text-[var(--text-muted)] uppercase font-bold">Daily Check-in Streak</span>
                            <span class="text-xs font-bold text-amber-400">🔥 Day ${streak}</span>
                        </div>
                        <p class="text-xs text-[var(--text-muted)] mb-3">Consecutive check-ins grant exponentially higher coin rewards!</p>
                    </div>
                    <button onclick="claimDailyCheckin()" ${claimedToday ? 'disabled' : ''} class="${claimedToday ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 text-white'} font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all">
                        <i class="fas fa-calendar-check"></i> ${claimedToday ? 'Claimed Today (Come back tomorrow)' : 'Claim Daily Reward (+20 Coins)'}
                    </button>
                </div>
            </div>

            <!-- Lucky Wheel Spin Arena -->
            <div class="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 sm:p-10 text-center relative overflow-hidden">
                <div class="max-w-md mx-auto">
                    <h2 class="text-2xl font-black text-white mb-2">Lucky Fortune Wheel</h2>
                    <p class="text-xs text-[var(--text-muted)] mb-6">Spin the wheel to win up to 100 CSGO Coins! No coin cost to spin.</p>

                    <!-- Remaining Spins Badge -->
                    <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--bg-dark)] border border-white/10 text-white text-xs font-bold mb-8">
                        <span>Daily Free: <strong class="text-green-400" id="spin-free-count">${dailyFreeSpins}</strong></span>
                        <span class="text-gray-600">•</span>
                        <span>Order Bonus: <strong class="text-amber-400" id="spin-order-count">${orderBonusSpins}</strong></span>
                    </div>

                    <!-- Wheel Display -->
                    <div class="relative w-64 h-64 mx-auto mb-8">
                        <div id="lucky-wheel-disc" class="w-full h-full rounded-full border-8 border-amber-500 shadow-2xl flex items-center justify-center text-3xl font-black text-white relative transition-all duration-[4000ms] ease-out" style="background: conic-gradient(#F59E0B 0deg 60deg, #EC4899 60deg 120deg, #8B5CF6 120deg 180deg, #10B981 180deg 240deg, #3B82F6 240deg 300deg, #EF4444 300deg 360deg);">
                            <div class="w-20 h-20 rounded-full bg-[var(--bg-dark)] border-4 border-white flex items-center justify-center text-amber-400 text-xl font-bold">
                                🎁
                            </div>
                        </div>
                        <!-- Pointer -->
                        <div class="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl text-white drop-shadow">
                            ▼
                        </div>
                    </div>

                    <!-- Spin Button (Strict Guarded) -->
                    <button id="spin-action-btn" onclick="executeLuckySpin()" ${totalSpins <= 0 ? 'disabled' : ''} class="w-full sm:w-64 mx-auto ${totalSpins > 0 ? 'bg-[var(--accent-gradient)] text-black hover:scale-105' : 'bg-gray-800 text-gray-500 cursor-not-allowed'} font-black text-base py-4 rounded-xl shadow-xl transition-all flex items-center justify-center gap-2">
                        <i class="fas fa-play"></i> ${totalSpins > 0 ? `SPIN WHEEL (${totalSpins} LEFT)` : 'NO SPINS LEFT'}
                    </button>
                    <div class="text-[11px] text-[var(--text-muted)] mt-3">Free spins reset every midnight. Bonus spins awarded per completed order.</div>
                </div>
            </div>

        </div>
    `;
};

window.executeLuckySpin = async function() {
    const userStr = localStorage.getItem('csgo_user');
    if (!userStr) return openAuthModal('login');
    const user = JSON.parse(userStr);
    const phone = user.phone;

    let dailyFree = parseInt(localStorage.getItem('csgo_free_spins_' + phone) || '5');
    let orderBonus = parseInt(localStorage.getItem('csgo_order_spins_' + phone) || '0');

    if (dailyFree <= 0 && orderBonus <= 0) {
        return alert('No spins left! Daily free spins reload every midnight, or place an order to get bonus spins.');
    }

    if (dailyFree > 0) {
        dailyFree--;
        localStorage.setItem('csgo_free_spins_' + phone, dailyFree.toString());
    } else if (orderBonus > 0) {
        orderBonus--;
        localStorage.setItem('csgo_order_spins_' + phone, orderBonus.toString());
    }

    const btn = document.getElementById('spin-action-btn');
    const wheel = document.getElementById('lucky-wheel-disc');
    if (btn) btn.disabled = true;

    // Random rewards: 5, 10, 20, 30, 50, 100
    const rewards = [5, 10, 15, 20, 30, 50, 100];
    const prize = rewards[Math.floor(Math.random() * rewards.length)];
    const deg = 1800 + Math.floor(Math.random() * 360);

    if (wheel) {
        wheel.style.transform = `rotate(${deg}deg)`;
    }

    setTimeout(async () => {
        const curCoins = (user.csgo_coins || 0) + prize;
        user.csgo_coins = curCoins;
        localStorage.setItem('csgo_user', JSON.stringify(user));

        // Sync with backend
        try {
            const SUPABASE_USER_API = 'https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/user-data';
            await apiFetch(SUPABASE_USER_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update_profile',
                    auth: { phone: phone },
                    data: { csgo_coins: curCoins }
                })
            });
        } catch (e) {
            console.warn('Coins saved locally:', e);
        }

        alert(`🎉 Congratulations! You won ${prize} CSGO Coins!`);
        renderRewards();
    }, 4200);
};

window.claimDailyCheckin = async function() {
    const userStr = localStorage.getItem('csgo_user');
    if (!userStr) return openAuthModal('login');
    const user = JSON.parse(userStr);
    const phone = user.phone;

    const today = new Date().toISOString().substring(0, 10);
    const streak = (user.checkin_streak || 0) + 1;
    const bonus = 20 + Math.min(30, streak * 5);
    const newCoins = (user.csgo_coins || 0) + bonus;

    user.csgo_coins = newCoins;
    user.checkin_streak = streak;
    user.last_checkin_date = today;
    localStorage.setItem('csgo_user', JSON.stringify(user));

    try {
        const SUPABASE_USER_API = 'https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/user-data';
        await apiFetch(SUPABASE_USER_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'update_profile',
                auth: { phone: phone },
                data: { csgo_coins: newCoins, checkin_streak: streak, last_checkin_date: today }
            })
        });
    } catch (e) {}

    alert(`🎉 Day ${streak} Check-in Claimed! +${bonus} CSGO Coins added to your account!`);
    renderRewards();
};

window.convertCoinsToCash = async function() {
    const userStr = localStorage.getItem('csgo_user');
    if (!userStr) return openAuthModal('login');
    const user = JSON.parse(userStr);
    const coins = user.csgo_coins || 0;

    if (coins < 100) {
        return alert(`You need at least 100 coins to convert into wallet cash. Current coins: ${coins}`);
    }

    const units = Math.floor(coins / 100);
    const convertCoins = units * 100;
    const cashAmount = units * 1.0;

    const remainingCoins = coins - convertCoins;
    const newBalance = (parseFloat(user.wallet_balance || user.balance || 0)) + cashAmount;

    user.csgo_coins = remainingCoins;
    user.wallet_balance = newBalance;
    user.balance = newBalance;
    localStorage.setItem('csgo_user', JSON.stringify(user));

    try {
        const SUPABASE_USER_API = 'https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/user-data';
        await apiFetch(SUPABASE_USER_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'update_profile',
                auth: { phone: user.phone },
                data: { csgo_coins: remainingCoins, wallet_balance: newBalance }
            })
        });
    } catch (e) {}

    alert(`✅ Converted ${convertCoins} Coins into ৳${cashAmount.toFixed(2)} Wallet Cash successfully!`);
    renderRewards();
};

// ============================================================================
// ECOSYSTEM: INVESTOR CENTER (18%-24% ROI)
// ============================================================================

window.renderInvestor = function() {
    const main = document.getElementById('main-content');
    if (!main) return;

    const userStr = localStorage.getItem('csgo_user');
    const user = userStr ? JSON.parse(userStr) : null;
    const isApproved = user && user.investor_status === 'approved';

    main.innerHTML = `
        <div class="py-12 bg-gradient-to-b from-emerald-950/40 via-[var(--bg-dark)] to-transparent border-b border-[var(--border-subtle)]">
            <div class="container text-center max-w-4xl mx-auto px-4">
                <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/50 border border-emerald-700/50 text-emerald-400 text-xs font-bold mb-4">
                    <i class="fas fa-chart-line"></i> Institutional & Retail Partnership
                </div>
                <h1 class="text-3xl sm:text-5xl font-black text-white mb-3">CSGO SHOP Investor Center</h1>
                <p class="text-[var(--text-muted)] text-sm sm:text-base max-w-xl mx-auto">
                    Partner with the fastest-growing e-commerce marketplace in Bangladesh. Guaranteed quarterly ROI dividend returns with legal MOU agreements.
                </p>
            </div>
        </div>

        <div class="container py-12 px-4 max-w-6xl mx-auto space-y-12">
            ${isApproved ? `
                <!-- Investor Portfolio -->
                <div class="bg-gradient-to-br from-emerald-900/60 to-[var(--bg-card)] border border-emerald-500/30 rounded-3xl p-6 sm:p-8">
                    <div class="flex justify-between items-center mb-6">
                        <div>
                            <span class="text-xs uppercase font-bold text-emerald-400">Verified Investor Portfolio</span>
                            <h2 class="text-2xl font-black text-white">Investment Overview</h2>
                        </div>
                        <span class="text-xs bg-emerald-500 text-black font-extrabold px-3 py-1 rounded-full">Active Partner</span>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div class="bg-[var(--bg-dark)]/80 p-4 rounded-xl border border-white/5">
                            <div class="text-xs text-[var(--text-muted)]">Total Invested Capital</div>
                            <div class="text-2xl font-black text-white mt-1">৳50,000</div>
                        </div>
                        <div class="bg-[var(--bg-dark)]/80 p-4 rounded-xl border border-white/5">
                            <div class="text-xs text-[var(--text-muted)]">Expected Annual ROI</div>
                            <div class="text-2xl font-black text-emerald-400 mt-1">18% – 24%</div>
                        </div>
                        <div class="bg-[var(--bg-dark)]/80 p-4 rounded-xl border border-white/5">
                            <div class="text-xs text-[var(--text-muted)]">Disbursed Dividends</div>
                            <div class="text-2xl font-black text-white mt-1">৳4,500</div>
                        </div>
                    </div>
                </div>
            ` : `
                <!-- Investment Plans Grid -->
                <div>
                    <h2 class="text-2xl font-black text-white text-center mb-8">Strategic Investment Opportunities</h2>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        <!-- Plan 1 -->
                        <div class="bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-emerald-500/50 rounded-2xl p-6 flex flex-col justify-between transition-all">
                            <div>
                                <div class="text-xs font-bold text-emerald-400 mb-1">Growth Tier</div>
                                <h3 class="text-xl font-bold text-white mb-2">Seed Growth Pool</h3>
                                <div class="text-3xl font-black text-white mb-4">৳20,000 <span class="text-xs text-[var(--text-muted)] font-normal">Min.</span></div>
                                <ul class="text-xs text-[var(--text-muted)] space-y-2.5 mb-6">
                                    <li><i class="fas fa-check text-emerald-400 mr-2"></i> 16% - 18% Annual Return</li>
                                    <li><i class="fas fa-check text-emerald-400 mr-2"></i> Quarterly Dividend Payouts</li>
                                    <li><i class="fas fa-check text-emerald-400 mr-2"></i> 6 Months Capital Lock-in</li>
                                </ul>
                            </div>
                            <button onclick="applyInvestorPlan('Seed Growth Pool', 20000)" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3 rounded-xl transition-all">
                                Apply for Seed Pool
                            </button>
                        </div>

                        <!-- Plan 2 (Popular) -->
                        <div class="bg-[var(--bg-card)] border-2 border-emerald-500 rounded-2xl p-6 flex flex-col justify-between relative shadow-xl shadow-emerald-500/10">
                            <div class="absolute -top-3 right-6 bg-emerald-500 text-black text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">Most Popular</div>
                            <div>
                                <div class="text-xs font-bold text-emerald-400 mb-1">Expansion Tier</div>
                                <h3 class="text-xl font-bold text-white mb-2">Inventory Scaling</h3>
                                <div class="text-3xl font-black text-white mb-4">৳50,000 <span class="text-xs text-[var(--text-muted)] font-normal">Min.</span></div>
                                <ul class="text-xs text-[var(--text-muted)] space-y-2.5 mb-6">
                                    <li><i class="fas fa-check text-emerald-400 mr-2"></i> 18% - 22% Annual Return</li>
                                    <li><i class="fas fa-check text-emerald-400 mr-2"></i> Bi-monthly Dividend Payouts</li>
                                    <li><i class="fas fa-check text-emerald-400 mr-2"></i> Legal MOU & Cheque Security</li>
                                </ul>
                            </div>
                            <button onclick="applyInvestorPlan('Inventory Scaling', 50000)" class="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs py-3 rounded-xl transition-all">
                                Apply for Scaling Pool
                            </button>
                        </div>

                        <!-- Plan 3 -->
                        <div class="bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-emerald-500/50 rounded-2xl p-6 flex flex-col justify-between transition-all">
                            <div>
                                <div class="text-xs font-bold text-emerald-400 mb-1">Enterprise Tier</div>
                                <h3 class="text-xl font-bold text-white mb-2">Ecosystem Partner</h3>
                                <div class="text-3xl font-black text-white mb-4">৳100,000+</div>
                                <ul class="text-xs text-[var(--text-muted)] space-y-2.5 mb-6">
                                    <li><i class="fas fa-check text-emerald-400 mr-2"></i> Up to 24% Annual Return</li>
                                    <li><i class="fas fa-check text-emerald-400 mr-2"></i> Monthly Direct Profit Distribution</li>
                                    <li><i class="fas fa-check text-emerald-400 mr-2"></i> Direct Director Stake Meeting</li>
                                </ul>
                            </div>
                            <button onclick="applyInvestorPlan('Ecosystem Partner', 100000)" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3 rounded-xl transition-all">
                                Contact Investor Relations
                            </button>
                        </div>

                    </div>
                </div>
            `}
        </div>
    `;
};

window.applyInvestorPlan = function(plan, amount) {
    const userStr = localStorage.getItem('csgo_user');
    if (!userStr) return openAuthModal('login');
    const user = JSON.parse(userStr);

    const message = `Hello CSGO SHOP Director, I want to apply for the Investor Program:\n\nPlan: ${plan}\nInvestment Amount: ৳${amount}\nName: ${user.name || 'User'}\nPhone: ${user.phone}`;
    window.open(`https://wa.me/8801873827520?text=${encodeURIComponent(message)}`, '_blank');
};

// ============================================================================
// ECOSYSTEM: RESELLER HUB (WHOLESALE PRICING & DISPATCH)
// ============================================================================

window.renderReseller = function() {
    const main = document.getElementById('main-content');
    if (!main) return;

    const userStr = localStorage.getItem('csgo_user');
    const user = userStr ? JSON.parse(userStr) : null;
    const isApproved = user && user.reseller_status === 'approved';

    main.innerHTML = `
        <div class="py-12 bg-gradient-to-b from-purple-950/40 via-[var(--bg-dark)] to-transparent border-b border-[var(--border-subtle)]">
            <div class="container text-center max-w-4xl mx-auto px-4">
                <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-950/50 border border-purple-700/50 text-purple-400 text-xs font-bold mb-4">
                    <i class="fas fa-boxes"></i> Wholesale Network & Drop-Shipping
                </div>
                <h1 class="text-3xl sm:text-5xl font-black text-white mb-3">CSGO Wholesale Reseller Hub</h1>
                <p class="text-[var(--text-muted)] text-sm sm:text-base max-w-xl mx-auto">
                    Buy at factory wholesale prices with zero minimum order quantities. We pack and dispatch directly to your end customers under your business name.
                </p>
            </div>
        </div>

        <div class="container py-12 px-4 max-w-6xl mx-auto space-y-10">
            ${isApproved ? `
                <div class="bg-[var(--bg-card)] border border-purple-500/30 rounded-3xl p-6 sm:p-8">
                    <div class="flex justify-between items-center mb-6">
                        <div>
                            <span class="text-xs uppercase font-bold text-purple-400">Verified Wholesale Reseller</span>
                            <h2 class="text-2xl font-black text-white">Wholesale Catalog & Margin: 12% - 25% OFF</h2>
                        </div>
                        <span class="text-xs bg-purple-600 text-white font-bold px-3 py-1 rounded-full">Active Wholesale Tier</span>
                    </div>
                    <button onclick="navigateTo('products')" class="bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm py-3 px-6 rounded-xl transition-all">
                        Browse Wholesale Catalog
                    </button>
                </div>
            ` : `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div class="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 sm:p-8 space-y-4">
                        <h2 class="text-xl font-bold text-white">Why Join CSGO Reseller Program?</h2>
                        <ul class="text-xs text-[var(--text-muted)] space-y-3">
                            <li class="flex items-start gap-2.5"><i class="fas fa-check-circle text-purple-400 mt-0.5"></i> Up to 25% flat wholesale discount on all catalog products.</li>
                            <li class="flex items-start gap-2.5"><i class="fas fa-check-circle text-purple-400 mt-0.5"></i> Custom dispatch: We deliver with YOUR brand invoice to your customer.</li>
                            <li class="flex items-start gap-2.5"><i class="fas fa-check-circle text-purple-400 mt-0.5"></i> Automated cash-on-delivery collection & weekly payout.</li>
                        </ul>
                    </div>

                    <div class="bg-gradient-to-br from-[var(--bg-dark)] to-[var(--bg-card)] border border-purple-500/40 rounded-2xl p-6 sm:p-8 text-center">
                        <h3 class="text-lg font-bold text-white mb-2">Apply for Wholesale Account</h3>
                        <p class="text-xs text-[var(--text-muted)] mb-6">Free verification for online store owners, Facebook page admins and merchants.</p>
                        <button onclick="applyResellerAccount()" class="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-extrabold text-sm py-3.5 rounded-xl shadow-lg transition-all">
                            Submit Reseller Application
                        </button>
                    </div>
                </div>
            `}
        </div>
    `;
};

window.applyResellerAccount = async function() {
    const userStr = localStorage.getItem('csgo_user');
    if (!userStr) return openAuthModal('login');
    const user = JSON.parse(userStr);

    try {
        const SUPABASE_USER_API = 'https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/user-data';
        await apiFetch(SUPABASE_USER_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'update_profile',
                auth: { phone: user.phone },
                data: { reseller_status: 'pending' }
            })
        });
        user.reseller_status = 'pending';
        localStorage.setItem('csgo_user', JSON.stringify(user));
        alert('✅ Reseller application submitted! Our merchant manager will verify and activate your wholesale rates within 2 hours.');
        renderReseller();
    } catch (e) {
        alert('Error: ' + e.message);
    }
};

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

window.toggleWishlist = function(productId) {
    let wishlist = JSON.parse(localStorage.getItem('csgo_wishlist')) || [];
    if (wishlist.includes(productId)) {
        wishlist = wishlist.filter(id => id !== productId);
        alert('Removed from wishlist');
    } else {
        wishlist.push(productId);
        alert('Added to wishlist');
    }
    localStorage.setItem('csgo_wishlist', JSON.stringify(wishlist));
};

// Global Routing Functions
window.navigateTo = function(page, param = null, query = null) {
    let hash = `#${page}`;
    if (page === 'product-details' && param) {
        hash += `?id=${encodeURIComponent(param)}`;
    } else if (page === 'products') {
        if (param) hash += `?cat=${encodeURIComponent(param)}`;
        else if (query) hash += `?q=${encodeURIComponent(query)}`;
    } else if (param) {
        hash += `?q=${encodeURIComponent(param)}`;
    }
    window.location.hash = hash;
};

window.filterCategory = function(cat) {
    window.navigateTo('products', cat);
};

window.renderCategories = function() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    // Get unique categories and one product image for each
    const categoryMap = {};
    products.forEach(p => {
        if (p.category && !categoryMap[p.category]) {
            categoryMap[p.category] = p.image || p.thumbnailImageUrl || p.thumbnail_img || p.detailImageUrl || 'https://placehold.co/300x300/1e293b/f59e0b?text=Category';
        }
    });

    const categories = Object.keys(categoryMap).map(cat => ({
        name: cat,
        image: categoryMap[cat]
    }));

    if (categories.length === 0) {
        mainContent.innerHTML = '<h2 class="text-white text-center mt-10">No categories found</h2>';
        return;
    }

    const categoriesHtml = categories.map(cat => `
        <div class="premium-category-card relative group rounded-2xl overflow-hidden cursor-pointer" onclick="filterCategory('${cat.name.replace(/'/g, "\\'")}')">
            <div class="aspect-square w-full">
                <img src="${cat.image}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="${cat.name}" onerror="this.src='https://placehold.co/300x300/1e293b/f59e0b?text=Error'">
            </div>
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6">
                <h3 class="text-xl font-bold text-white mb-1 transform translate-y-2 group-hover:translate-y-0 transition-transform">${cat.name}</h3>
                <span class="text-amber-500 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                    Shop Now <i class="fas fa-arrow-right text-xs"></i>
                </span>
            </div>
        </div>
    `).join('');

    mainContent.innerHTML = `
        <div class="py-12 min-h-screen bg-[var(--bg-dark)]">
            <div class="container mx-auto px-4 max-w-7xl">
                <div class="text-center mb-12">
                    <h1 class="text-3xl md:text-4xl font-bold text-white mb-4">All Categories</h1>
                    <p class="text-[var(--text-muted)] max-w-2xl mx-auto">Browse our complete collection of products by category</p>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    ${categoriesHtml}
                </div>
            </div>
        </div>
    `;
};

window.renderAffiliate = function() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    mainContent.innerHTML = `
        <div class="py-20 min-h-screen bg-[var(--bg-dark)] flex items-center justify-center text-center">
            <div class="container mx-auto px-4 max-w-3xl">
                <div class="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-amber-500/20">
                    <i class="fas fa-handshake text-4xl text-amber-500"></i>
                </div>
                <h1 class="text-4xl md:text-5xl font-bold text-white mb-6">Affiliate Program</h1>
                <p class="text-xl text-[var(--text-muted)] mb-10 leading-relaxed">Join the CSGO SHOP affiliate program and earn commissions by referring customers to our premium products.</p>
                <div class="bg-gray-800 p-6 rounded-2xl border border-gray-700 max-w-md mx-auto mb-8 text-left">
                    <p class="text-xs text-gray-400 mb-2">Your Referral Link:</p>
                    <div class="flex items-center gap-2 bg-gray-900 p-3 rounded-lg border border-gray-600">
                        <input type="text" readonly value="https://csgoshop.zya.me/?ref=username" id="webRefLink" class="bg-transparent text-amber-400 font-mono text-sm w-full outline-none">
                        <button onclick="navigator.clipboard.writeText(document.getElementById('webRefLink').value); alert('Referral link copied!');" class="bg-amber-500 text-black px-3 py-1.5 rounded font-bold text-xs">Copy</button>
                    </div>
                </div>
                <button onclick="navigateTo('home')" class="bg-amber-500 hover:bg-amber-600 text-black font-bold py-3 px-8 rounded-full transition-colors shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                    <i class="fas fa-arrow-left mr-2"></i> Back to Home
                </button>
            </div>
        </div>
    `;
};

// ═════════════════════════════════════════════════════════════════════════════
// WEBSITE ECOSYSTEM HUB, INVESTOR, RESELLER & LUCKY SPIN REWARDS
// ═════════════════════════════════════════════════════════════════════════════
let webCoins = 150;
let webDailyFreeSpins = 5;
let webOrderSpins = 2;
let webSpinning = false;

window.openEcosystemHub = function() {
    let hubModal = document.getElementById('ecosystemHubModal');
    if (!hubModal) {
        createEcosystemModals();
        hubModal = document.getElementById('ecosystemHubModal');
    }
    hubModal.classList.remove('hidden');
    hubModal.classList.add('flex');
};

window.closeEcosystemHub = function() {
    const hubModal = document.getElementById('ecosystemHubModal');
    if (hubModal) {
        hubModal.classList.add('hidden');
        hubModal.classList.remove('flex');
    }
};

window.openRewardsModal = function() {
    closeEcosystemHub();
    let rewardsModal = document.getElementById('rewardsModal');
    if (!rewardsModal) {
        createEcosystemModals();
        rewardsModal = document.getElementById('rewardsModal');
    }
    rewardsModal.classList.remove('hidden');
    rewardsModal.classList.add('flex');
    updateRewardsUI();
};

window.closeRewardsModal = function() {
    const modal = document.getElementById('rewardsModal');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
};

window.openInvestorModal = function() {
    closeEcosystemHub();
    let modal = document.getElementById('investorModal');
    if (!modal) {
        createEcosystemModals();
        modal = document.getElementById('investorModal');
    }
    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

window.closeInvestorModal = function() {
    const modal = document.getElementById('investorModal');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
};

window.openResellerModal = function() {
    closeEcosystemHub();
    let modal = document.getElementById('resellerModal');
    if (!modal) {
        createEcosystemModals();
        modal = document.getElementById('resellerModal');
    }
    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

window.closeResellerModal = function() {
    const modal = document.getElementById('resellerModal');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
};

function updateRewardsUI() {
    const coinsDisplay = document.getElementById('webCoinsDisplay');
    const freeSpinsDisplay = document.getElementById('webFreeSpinsDisplay');
    const orderSpinsDisplay = document.getElementById('webOrderSpinsDisplay');
    if (coinsDisplay) coinsDisplay.textContent = webCoins;
    if (freeSpinsDisplay) freeSpinsDisplay.textContent = webDailyFreeSpins;
    if (orderSpinsDisplay) orderSpinsDisplay.textContent = webOrderSpins;
}

window.spinLuckyWheel = function() {
    if (webSpinning) return;

    let isFree = false;
    let isOrder = false;

    if (webDailyFreeSpins > 0) {
        isFree = true;
    } else if (webOrderSpins > 0) {
        isOrder = true;
    } else if (webCoins < 10) {
        alert('No spins left! Place a ৳1,000 order to get +2 spins or use 10 Coins per spin.');
        return;
    }

    webSpinning = true;
    if (isFree) webDailyFreeSpins--;
    else if (isOrder) webOrderSpins--;
    else webCoins -= 10;

    updateRewardsUI();

    const wheelIcon = document.getElementById('webWheelIcon');
    if (wheelIcon) wheelIcon.classList.add('animate-spin');

    setTimeout(() => {
        const reward = (Math.floor(Math.random() * 5) + 1) * 10;
        webCoins += reward;
        webSpinning = false;
        if (wheelIcon) wheelIcon.classList.remove('animate-spin');
        updateRewardsUI();
        alert(`🎉 Congratulations! You won ${reward} CSGO Coins in the Lucky Spin!`);
    }, 2000);
};

window.convertWebCoins = function() {
    if (webCoins < 100) {
        alert('Minimum 100 Coins required to convert (100 Coins = ৳1 Wallet Balance)');
        return;
    }
    const convertAmount = Math.floor(webCoins / 100) * 1;
    const usedCoins = Math.floor(webCoins / 100) * 100;
    webCoins -= usedCoins;
    updateRewardsUI();
    alert(`🎉 Converted ${usedCoins} Coins to ৳${convertAmount} Wallet Balance!`);
};

function createEcosystemModals() {
    if (document.getElementById('ecosystemHubModal')) return;

    const container = document.createElement('div');
    container.innerHTML = `
        <!-- Ecosystem Hub Modal -->
        <div id="ecosystemHubModal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md hidden items-center justify-center p-4">
            <div class="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative">
                <button onclick="closeEcosystemHub()" class="absolute top-5 right-5 text-gray-400 hover:text-white text-xl"><i class="fas fa-times"></i></button>
                
                <div class="flex items-center gap-3 mb-6">
                    <div class="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500 text-xl font-bold border border-amber-500/30">
                        <i class="fas fa-sparkles"></i>
                    </div>
                    <div>
                        <h2 class="text-xl font-bold text-white">CSGO Ecosystem Hub</h2>
                        <p class="text-xs text-gray-400">All-in-One Commerce Launcher</p>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-3 mb-6">
                    <button onclick="openInvestorModal()" class="bg-gray-800/80 hover:bg-gray-800 p-4 rounded-2xl border border-gray-700/60 text-left transition group">
                        <div class="w-10 h-10 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center mb-3 text-lg font-bold group-hover:scale-110 transition-transform">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <h3 class="font-bold text-white text-sm mb-1">Investor Center</h3>
                        <p class="text-xs text-blue-400 font-semibold">18% - 24% Annual ROI</p>
                    </button>

                    <button onclick="openResellerModal()" class="bg-gray-800/80 hover:bg-gray-800 p-4 rounded-2xl border border-gray-700/60 text-left transition group">
                        <div class="w-10 h-10 bg-purple-500/20 text-purple-400 rounded-xl flex items-center justify-center mb-3 text-lg font-bold group-hover:scale-110 transition-transform">
                            <i class="fas fa-store"></i>
                        </div>
                        <h3 class="font-bold text-white text-sm mb-1">Reseller Hub</h3>
                        <p class="text-xs text-purple-400 font-semibold">5% - 20% Wholesale OFF</p>
                    </button>

                    <button onclick="openRewardsModal()" class="bg-gray-800/80 hover:bg-gray-800 p-4 rounded-2xl border border-gray-700/60 text-left transition group">
                        <div class="w-10 h-10 bg-pink-500/20 text-pink-400 rounded-xl flex items-center justify-center mb-3 text-lg font-bold group-hover:scale-110 transition-transform">
                            <i class="fas fa-dice"></i>
                        </div>
                        <h3 class="font-bold text-white text-sm mb-1">Rewards & Spin</h3>
                        <p class="text-xs text-pink-400 font-semibold">5 Free Spins Daily</p>
                    </button>

                    <button onclick="closeEcosystemHub(); navigateTo('affiliate');" class="bg-gray-800/80 hover:bg-gray-800 p-4 rounded-2xl border border-gray-700/60 text-left transition group">
                        <div class="w-10 h-10 bg-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center mb-3 text-lg font-bold group-hover:scale-110 transition-transform">
                            <i class="fas fa-handshake"></i>
                        </div>
                        <h3 class="font-bold text-white text-sm mb-1">Affiliate Program</h3>
                        <p class="text-xs text-amber-400 font-semibold">Refer & Earn Commission</p>
                    </button>
                </div>

                <div class="bg-gray-800/50 p-4 rounded-2xl border border-gray-700/50 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <i class="fab fa-whatsapp text-2xl text-green-400"></i>
                        <div>
                            <p class="text-xs text-gray-400">24/7 Helpline Support</p>
                            <p class="text-sm font-bold text-white">01873827520</p>
                        </div>
                    </div>
                    <a href="https://wa.me/8801873827520" target="_blank" class="bg-green-500 text-black px-4 py-2 rounded-xl text-xs font-bold hover:bg-green-400 transition">Chat Now</a>
                </div>
            </div>
        </div>

        <!-- Rewards Modal -->
        <div id="rewardsModal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md hidden items-center justify-center p-4">
            <div class="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative text-center">
                <button onclick="closeRewardsModal()" class="absolute top-5 right-5 text-gray-400 hover:text-white text-xl"><i class="fas fa-times"></i></button>

                <div class="bg-gradient-to-r from-pink-500 to-purple-600 p-6 rounded-2xl mb-6 text-white text-left shadow-lg">
                    <p class="text-xs font-medium text-pink-200">Available CSGO Coins</p>
                    <p class="text-3xl font-bold my-1" id="webCoinsDisplay">150</p>
                    <p class="text-xs font-semibold text-white/90">100 Coins = ৳1 Wallet Balance</p>
                    <button onclick="convertWebCoins()" class="mt-4 bg-white text-black font-bold px-4 py-2 rounded-xl text-xs hover:bg-gray-100 transition shadow">Convert to Wallet</button>
                </div>

                <div class="bg-gray-800/80 p-6 rounded-2xl border border-gray-700 mb-4">
                    <div class="flex justify-center gap-2 mb-4">
                        <span class="bg-purple-500/20 text-purple-300 text-xs px-3 py-1 rounded-full font-bold border border-purple-500/30">🎁 Daily Free: <span id="webFreeSpinsDisplay">5</span>/5</span>
                        <span class="bg-amber-500/20 text-amber-300 text-xs px-3 py-1 rounded-full font-bold border border-amber-500/30">🛍️ Order Bonus: <span id="webOrderSpinsDisplay">2</span></span>
                    </div>

                    <div class="w-24 h-24 bg-purple-500/10 border-4 border-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl text-pink-400 shadow-lg">
                        <i id="webWheelIcon" class="fas fa-dice"></i>
                    </div>
                    <h3 class="text-lg font-bold text-white mb-1">Lucky Spin Wheel</h3>
                    <p class="text-xs text-gray-400 mb-4">Spin & Win up to 50 Coins per spin!</p>

                    <button onclick="spinLuckyWheel()" class="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 rounded-xl shadow-lg transition">SPIN WHEEL NOW</button>
                </div>
            </div>
        </div>

        <!-- Investor Modal -->
        <div id="investorModal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md hidden items-center justify-center p-4">
            <div class="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <button onclick="closeInvestorModal()" class="absolute top-5 right-5 text-gray-400 hover:text-white text-xl"><i class="fas fa-times"></i></button>

                <div class="text-center mb-6">
                    <div class="w-14 h-14 bg-green-500/20 text-green-400 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl font-bold border border-green-500/30">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <h2 class="text-2xl font-bold text-white">CSGO Investor Partner</h2>
                    <p class="text-xs text-gray-400 mt-1">Invest in CSGO SHOP inventory & logistics to earn guaranteed annual ROI.</p>
                </div>

                <div class="space-y-4 mb-6">
                    <div class="bg-gray-800 p-4 rounded-2xl border border-gray-700">
                        <div class="flex justify-between items-center mb-1">
                            <h3 class="font-bold text-white">Starter Partner Plan</h3>
                            <span class="text-blue-400 font-bold text-sm">12% Annual ROI</span>
                        </div>
                        <p class="text-xs text-gray-400">Min Investment: ৳10,000 (3-Month Lock Period)</p>
                    </div>

                    <div class="bg-gray-800 p-4 rounded-2xl border border-amber-500/60 relative">
                        <span class="absolute -top-3 right-4 bg-amber-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full">POPULAR</span>
                        <div class="flex justify-between items-center mb-1">
                            <h3 class="font-bold text-white">Growth Partner Plan</h3>
                            <span class="text-amber-400 font-bold text-sm">18% Annual ROI</span>
                        </div>
                        <p class="text-xs text-gray-400">Min Investment: ৳50,000 (6-Month Lock Period)</p>
                    </div>

                    <div class="bg-gray-800 p-4 rounded-2xl border border-gray-700">
                        <div class="flex justify-between items-center mb-1">
                            <h3 class="font-bold text-white">Enterprise Partner Plan</h3>
                            <span class="text-purple-400 font-bold text-sm">24% Annual ROI + 5% Share</span>
                        </div>
                        <p class="text-xs text-gray-400">Min Investment: ৳100,000 (12-Month Lock Period)</p>
                    </div>
                </div>

                <div class="bg-gray-800/60 p-4 rounded-2xl border border-gray-700/60 mb-6 text-left">
                    <p class="text-xs text-gray-300 font-bold mb-1">Payment Instructions:</p>
                    <p class="text-xs text-gray-400 mb-2">Send investment payment via bKash / Nagad / Rocket Personal Send Money to:</p>
                    <p class="text-lg font-bold text-amber-400 font-mono">01873827520</p>
                </div>
            </div>
        </div>

        <!-- Reseller Modal -->
        <div id="resellerModal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md hidden items-center justify-center p-4">
            <div class="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <button onclick="closeResellerModal()" class="absolute top-5 right-5 text-gray-400 hover:text-white text-xl"><i class="fas fa-times"></i></button>

                <div class="text-center mb-6">
                    <div class="w-14 h-14 bg-purple-500/20 text-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl font-bold border border-purple-500/30">
                        <i class="fas fa-store"></i>
                    </div>
                    <h2 class="text-2xl font-bold text-white">CSGO Reseller Center</h2>
                    <p class="text-xs text-gray-400 mt-1">Buy products at wholesale price & sell directly to your customers!</p>
                </div>

                <div class="space-y-3 mb-6">
                    <div class="bg-gray-800 p-3.5 rounded-xl border border-gray-700 flex justify-between items-center">
                        <span class="text-sm font-bold text-white">Bronze Reseller</span>
                        <span class="text-xs font-bold text-purple-400">5% Extra Wholesale OFF</span>
                    </div>
                    <div class="bg-gray-800 p-3.5 rounded-xl border border-gray-700 flex justify-between items-center">
                        <span class="text-sm font-bold text-white">Silver Reseller</span>
                        <span class="text-xs font-bold text-purple-400">10% Extra Wholesale OFF</span>
                    </div>
                    <div class="bg-gray-800 p-3.5 rounded-xl border border-gray-700 flex justify-between items-center">
                        <span class="text-sm font-bold text-white">Gold Reseller</span>
                        <span class="text-xs font-bold text-purple-400">15% Extra Wholesale OFF</span>
                    </div>
                    <div class="bg-gray-800 p-3.5 rounded-xl border border-gray-700 flex justify-between items-center">
                        <span class="text-sm font-bold text-white">Platinum Reseller</span>
                        <span class="text-xs font-bold text-purple-400">20% Extra Wholesale OFF</span>
                    </div>
                </div>

                <button onclick="alert('Wholesale Reseller application submitted!'); closeResellerModal();" class="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 rounded-xl shadow-lg transition">Apply for Wholesale Account</button>
            </div>
        </div>
    `;

    document.body.appendChild(container);
}

// ============================================================================
// APP BOOTSTRAP: Instant load and render
// ============================================================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        handleRoute();
        loadProducts();
    });
} else {
    handleRoute();
    loadProducts();
}
