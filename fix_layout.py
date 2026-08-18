import re

with open('c:/Users/CS/OneDrive/Desktop/CSGO APP/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix renderCategories
categories_old = '''    allCategoriesToRender.forEach(cat => {
        const catProducts = products.filter(p => p.category === cat.name);
        
        if (catProducts.length > 0) {
            renderedCount++;
            html += `
                <div class="category-section" style="margin-bottom: 60px; background: rgba(30,41,59,0.3); border-radius: 24px; padding: 30px; border: 1px solid rgba(255,255,255,0.05);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); flex-wrap: wrap; gap: 15px;">
                        <div style="display: flex; align-items: center; gap: 20px;">
                            <img src="${cat.image}" alt="${cat.display}" style="width: 80px; height: 80px; border-radius: 16px; object-fit: cover; box-shadow: 0 10px 20px rgba(0,0,0,0.3);">
                            <div>
                                <h2 style="font-size: 1.8rem; margin: 0 0 5px 0;">${cat.display}</h2>
                                <span style="color: var(--text-light); font-size: 0.9rem;">${catProducts.length} Products Available</span>
                            </div>
                        </div>
                        <a href="#products?cat=${encodeURIComponent(cat.name)}" class="btn btn-outline" style="padding: 10px 20px; font-size: 0.9rem; border-radius: 12px; display: inline-flex; align-items: center; gap: 8px;">View All ${cat.display} <i class="fas fa-arrow-right"></i></a>
                    </div>
                    
                    <div class="products-grid">
                        ${generateProductsHtml(catProducts.slice(0, 4))}
                    </div>
                </div>
            `;
        }
    });'''

categories_new = '''    allCategoriesToRender.forEach(cat => {
        const subCats = subcategoriesMap[cat.name] || [];
        const catProducts = products.filter(p => p.category === cat.name || subCats.includes(p.category));
        
        if (catProducts.length > 0 || subCats.length > 0) {
            renderedCount++;
            html += `
                <div class="category-section" style="margin-bottom: 60px; background: rgba(30,41,59,0.3); border-radius: 24px; padding: 30px; border: 1px solid rgba(255,255,255,0.05);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); flex-wrap: wrap; gap: 15px;">
                        <div style="display: flex; align-items: center; gap: 20px;">
                            <img src="${cat.image}" alt="${cat.display}" style="width: 80px; height: 80px; border-radius: 16px; object-fit: cover; box-shadow: 0 10px 20px rgba(0,0,0,0.3);">
                            <div>
                                <h2 style="font-size: 1.8rem; margin: 0 0 5px 0;">${cat.display}</h2>
                                <span style="color: var(--text-light); font-size: 0.9rem;">${catProducts.length} Products Available</span>
                            </div>
                        </div>
                        <a href="#products?cat=${encodeURIComponent(cat.name)}" class="btn btn-outline" style="padding: 10px 20px; font-size: 0.9rem; border-radius: 12px; display: inline-flex; align-items: center; gap: 8px;">View All ${cat.display} <i class="fas fa-arrow-right"></i></a>
                    </div>
                    
                    ${subCats.length > 0 ? `
                    <div class="subcategories-pills" style="margin-bottom: 25px; display: flex; flex-wrap: wrap; gap: 10px;">
                        ${subCats.map(sub => `
                            <button class="btn" style="padding: 6px 15px; font-size: 0.85rem; border-radius: 20px; background: rgba(255,255,255,0.05); color: #cbd5e1; border: 1px solid rgba(255,255,255,0.1); transition: all 0.3s ease;" onclick="filterCategory('${sub.replace(/'/g, "\\'")}')" onmouseover="this.style.background='var(--accent-color)'; this.style.color='white'; this.style.borderColor='var(--accent-color)';" onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.color='#cbd5e1'; this.style.borderColor='rgba(255,255,255,0.1)';">
                                ${sub}
                            </button>
                        `).join('')}
                    </div>
                    ` : ''}

                    <div class="products-grid">
                        ${generateProductsHtml(catProducts.slice(0, 4))}
                    </div>
                </div>
            `;
        }
    });'''

if categories_old in content:
    content = content.replace(categories_old, categories_new)
else:
    print("Could not find categories_old")

# Fix renderHome
home_old_1 = '''    let trendingToShow = products.filter(p => !p.custom && (p.isTrending || p.badge === 'hot' || p.badge === 'trending')).slice(0, 10);
    if (trendingToShow.length < 5) trendingToShow = products.slice(0, 10);

    let dealsToShow = products.filter(p => p.originalPrice && p.originalPrice > p.price).sort((a, b) => {
        const discA = (a.originalPrice - a.price) / a.originalPrice;
        const discB = (b.originalPrice - b.price) / b.originalPrice;
        return discB - discA;
    }).slice(0, 10);
    if (dealsToShow.length < 5) dealsToShow = products.slice(8, 18);

    let bestSellers = products.filter(p => p.badge === 'best-seller').slice(0, 10);
    if (bestSellers.length < 5) bestSellers = [...products].reverse().slice(5, 15);

    let newArrivals = [...products].reverse().slice(0, 10);
    
    let recentlyViewedIds = [];
    try { recentlyViewedIds = JSON.parse(localStorage.getItem('csgo_recently_viewed')) || []; } catch(e) {}
    let recentlyViewedProducts = recentlyViewedIds.map(id => products.find(p => p.id === id)).filter(p => p).slice(0, 10);

    let recommendedProducts = [];
    if (recentlyViewedProducts.length > 0) {
        const recentCats = recentlyViewedProducts.map(p => p.category);
        recommendedProducts = products.filter(p => recentCats.includes(p.category) && !recentlyViewedIds.includes(p.id)).slice(0, 10);
    }
    if (recommendedProducts.length < 5) recommendedProducts = products.slice(16, 26);'''

home_new_1 = '''    let dealsToShow = products.filter(p => p.originalPrice && p.originalPrice > p.price).sort((a, b) => {
        const discA = (a.originalPrice - a.price) / a.originalPrice;
        const discB = (b.originalPrice - b.price) / b.originalPrice;
        return discB - discA;
    }).slice(0, 10);
    if (dealsToShow.length < 5) dealsToShow = products.slice(8, 18);

    const categoriesList = Object.keys(subcategoriesMap).sort();
    const priority = ["Men's Fashion", "Women's Fashion", "Gadgets & Electronics", "Home & Lifestyle", "Kids Zone", "Offer"];
    const sortedCategoriesList = [
        ...priority.filter(p => categoriesList.includes(p)),
        ...categoriesList.filter(c => !priority.includes(c))
    ];

    let categorySectionsHtml = sortedCategoriesList.map(mainCat => {
        const subCats = subcategoriesMap[mainCat] || [];
        const catProducts = products.filter(p => p.category === mainCat || subCats.includes(p.category));
        
        if (catProducts.length === 0) return '';
        
        return `
        <section class="container" style="margin-bottom: 50px;">
            <div class="section-header" style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
                <div>
                    <h2 style="font-size: 1.8rem; color: white; margin: 0 0 5px 0;">${mainCat}</h2>
                </div>
                <button class="btn btn-text" onclick="filterCategory('${mainCat.replace(/'/g, "\\'")}')" style="padding: 0;">View All <i class="fas fa-chevron-right"></i></button>
            </div>
            
            ${subCats.length > 0 ? `
            <div class="subcategories-pills" style="margin-bottom: 20px; display: flex; flex-wrap: wrap; gap: 10px;">
                ${subCats.map(sub => `
                    <button class="btn" style="padding: 6px 15px; font-size: 0.85rem; border-radius: 20px; background: rgba(255,255,255,0.05); color: #cbd5e1; border: 1px solid rgba(255,255,255,0.1); transition: all 0.3s ease;" onclick="filterCategory('${sub.replace(/'/g, "\\'")}')" onmouseover="this.style.background='var(--accent-color)'; this.style.color='white'; this.style.borderColor='var(--accent-color)';" onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.color='#cbd5e1'; this.style.borderColor='rgba(255,255,255,0.1)';">
                        ${sub}
                    </button>
                `).join('')}
            </div>
            ` : ''}

            <div class="products-grid">
                ${generateProductsHtml(catProducts.slice(0, 10))}
            </div>
        </section>
        `;
    }).join('');'''

if home_old_1 in content:
    content = content.replace(home_old_1, home_new_1)
else:
    print("Could not find home_old_1")

home_old_2 = '''        <!-- TRENDING -->
        <section class="container" style="margin-bottom: 40px;">
            <div class="section-header" style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 25px;">
                <div>
                    <h2 style="font-size: 1.5rem; color: white; margin: 0 0 5px 0;">Trending Now</h2>
                    <p style="color: #64748B; font-size: 0.9rem; margin: 0;">Most popular choices right now</p>
                </div>
            </div>
            <div class="products-grid">
                ${generateProductsHtml(trendingToShow)}
            </div>
        </section>

        <!-- BEST SELLERS -->
        <section class="container" style="margin-bottom: 40px;">
            <div class="section-header" style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 25px;">
                <div>
                    <h2 style="font-size: 1.5rem; color: white; margin: 0 0 5px 0;">Best Sellers</h2>
                    <p style="color: #64748B; font-size: 0.9rem; margin: 0;">Our top rated products</p>
                </div>
            </div>
            <div class="products-grid">
                ${generateProductsHtml(bestSellers)}
            </div>
        </section>

        <!-- NEW ARRIVALS -->
        <section class="container" style="margin-bottom: 40px;">
            <div class="section-header" style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 25px;">
                <div>
                    <h2 style="font-size: 1.5rem; color: white; margin: 0 0 5px 0;">New Arrivals</h2>
                    <p style="color: #64748B; font-size: 0.9rem; margin: 0;">Fresh drops just for you</p>
                </div>
            </div>
            <div class="products-grid">
                ${generateProductsHtml(newArrivals)}
            </div>
        </section>
        
        <!-- RECOMMENDED -->
        ${recommendedProducts.length > 0 ? `
        <section class="container" style="margin-bottom: 40px;">
            <div class="section-header" style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 25px;">
                <div>
                    <h2 style="font-size: 1.5rem; color: white; margin: 0 0 5px 0;">Recommended For You</h2>
                    <p style="color: #64748B; font-size: 0.9rem; margin: 0;">Based on your recent activity</p>
                </div>
            </div>
            <div class="products-grid">
                ${generateProductsHtml(recommendedProducts)}
            </div>
        </section>
        ` : ''}'''

home_new_2 = '''        <!-- DYNAMIC CATEGORY SECTIONS -->
        ${categorySectionsHtml}'''

if home_old_2 in content:
    content = content.replace(home_old_2, home_new_2)
else:
    print("Could not find home_old_2")

with open('c:/Users/CS/OneDrive/Desktop/CSGO APP/script.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done")
