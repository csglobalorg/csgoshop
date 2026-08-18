import re

with open('c:/Users/CS/OneDrive/Desktop/CSGO APP/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

new_render_home = '''function renderHome() {
    if (loadError && products.length === 0) {
        mainContent.innerHTML = `
            <div class="empty-state" style="padding: 100px 20px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ff9800; margin-bottom: 20px;"></i>
                <h2>Products Failed to Load</h2>
                <div style="display: flex; gap: 15px; justify-content: center;">
                    <button class="btn" onclick="loadProducts()">Retry Loading</button>
                    <button class="btn btn-outline" onclick="window.location.reload()">Refresh Page</button>
                </div>
            </div>
        `;
        return;
    }

    // --- 1. Top Categories (Right below Hero) ---
    const priorityCategories = [
        { name: "Men's Fashion", icon: "fas fa-tshirt", display: "Men's Fashion" },
        { name: "Women's Fashion", icon: "fas fa-female", display: "Women's Fashion" },
        { name: "Gadgets & Electronics", icon: "fas fa-laptop", display: "Electronics" },
        { name: "Home & Lifestyle", icon: "fas fa-home", display: "Home" },
        { name: "Kids Zone", icon: "fas fa-child", display: "Kids" },
        { name: "Beauty & Health", icon: "fas fa-heartbeat", display: "Beauty" }
    ];
    let topCategoriesHtml = priorityCategories.map(cat => `
        <div class="premium-category-card" onclick="filterCategory('${cat.name.replace(/'/g, "\\'")}')" style="background: rgba(15,23,42,0.6); border: 1px solid rgba(255,255,255,0.05); padding: 25px 15px; border-radius: 20px; text-align: center; cursor: pointer; transition: all 0.3s ease; display: flex; flex-direction: column; gap: 15px; align-items: center;">
            <div style="width: 60px; height: 60px; border-radius: 50%; background: rgba(245,166,35,0.1); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: #F5A623;">
                <i class="${cat.icon}"></i>
            </div>
            <h3 style="font-size: 0.95rem; font-weight: 600; margin: 0; color: #E2E8F0;">${cat.display}</h3>
        </div>
    `).join('');

    // --- 2. Data Segments ---
    let trendingToShow = products.filter(p => !p.custom && (p.isTrending || p.badge === 'hot' || p.badge === 'trending')).slice(0, 10);
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
    
    let recentlyViewedIds = JSON.parse(localStorage.getItem('csgo_recently_viewed')) || [];
    let recentlyViewedProducts = recentlyViewedIds.map(id => products.find(p => p.id === id)).filter(p => p).slice(0, 10);

    let recommendedProducts = [];
    if (recentlyViewedProducts.length > 0) {
        const recentCats = recentlyViewedProducts.map(p => p.category);
        recommendedProducts = products.filter(p => recentCats.includes(p.category) && !recentlyViewedIds.includes(p.id)).slice(0, 10);
    }
    if (recommendedProducts.length < 5) recommendedProducts = products.slice(16, 26);

    // --- 3. Premium Customer Reviews ---
    const reviews = [
        { name: "Rahim U.", rating: 5, text: "Excellent product quality and very fast delivery. Completely satisfied with the service from CSGO Shop.", date: "2 days ago" },
        { name: "Nadia K.", rating: 5, text: "The app is so smooth and the products are exactly as shown in the pictures. Highly recommended!", date: "1 week ago" },
        { name: "Saimon H.", rating: 4, text: "Great pricing compared to other marketplaces. Customer support was also very helpful.", date: "3 weeks ago" }
    ];
    let reviewsHtml = reviews.map(r => `
        <div style="background: #0F172A; border: 1px solid rgba(255,255,255,0.05); padding: 30px; border-radius: 24px; text-align: left; position: relative;">
            <div style="position: absolute; top: 20px; right: 20px; color: rgba(255,255,255,0.03); font-size: 4rem; line-height: 1;"><i class="fas fa-quote-right"></i></div>
            <div style="display: flex; gap: 4px; color: #F5A623; font-size: 0.9rem; margin-bottom: 15px;">
                ${'<i class="fas fa-star"></i>'.repeat(r.rating)}
            </div>
            <p style="color: #CBD5E1; font-size: 1rem; line-height: 1.6; margin-bottom: 25px; position: relative; z-index: 1;">"${r.text}"</p>
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="width: 45px; height: 45px; background: rgba(245,166,35,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #F5A623; font-weight: bold; font-size: 1.2rem;">
                    ${r.name.charAt(0)}
                </div>
                <div>
                    <h4 style="color: white; margin: 0 0 4px 0; font-size: 0.95rem; display: flex; align-items: center; gap: 6px;">${r.name} <i class="fas fa-check-circle" style="color: #3DDC84; font-size: 0.8rem;" title="Verified Buyer"></i></h4>
                    <div style="color: #64748B; font-size: 0.8rem;">${r.date}</div>
                </div>
            </div>
        </div>
    `).join('');

    mainContent.innerHTML = `
        <!-- HERO SECTION (Cinematic Redesign) -->
        <section class="premium-hero" style="position: relative; width: 100%; min-height: 620px; display: flex; align-items: center; overflow: hidden; background: #020617; border-bottom: 1px solid rgba(255,255,255,0.05); margin-bottom: 40px;">
            <!-- Animated Background Glow -->
            <div style="position: absolute; top: 20%; left: 10%; width: 50%; height: 50%; background: radial-gradient(circle, rgba(245,166,35,0.15) 0%, transparent 60%); filter: blur(60px); animation: pulse 6s infinite alternate;"></div>
            <div style="position: absolute; bottom: -10%; right: -10%; width: 60%; height: 60%; background: radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 60%); filter: blur(80px);"></div>
            
            <div class="container" style="position: relative; z-index: 10; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center;">
                <div class="hero-content">
                    <div style="display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 8px 16px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; color: #F5A623; margin-bottom: 25px;">
                        <span style="display: block; width: 8px; height: 8px; background: #F5A623; border-radius: 50%; box-shadow: 0 0 10px #F5A623;"></span> Live Marketplace 2026
                    </div>
                    <h1 style="font-size: clamp(3rem, 5vw, 4.5rem); line-height: 1.1; font-weight: 800; color: white; margin-bottom: 25px; letter-spacing: -1px;">
                        Premium <br>
                        <span style="color: #F5A623;">Shopping</span> <br>
                        Experience.
                    </h1>
                    <p style="color: #94A3B8; font-size: 1.1rem; line-height: 1.6; max-width: 480px; margin-bottom: 40px;">
                        Discover handpicked products with unmatched quality. Fast delivery, secure payments, and a seamless shopping journey.
                    </p>
                    <div style="display: flex; gap: 20px; align-items: center;">
                        <button class="btn btn-primary-premium" style="padding: 15px 35px; font-size: 1rem;" onclick="navigateTo('products')">Explore Now <i class="fas fa-arrow-right" style="margin-left: 8px;"></i></button>
                    </div>
                </div>
                
                <div class="hero-image" style="position: relative; display: flex; justify-content: center; align-items: center;">
                    <!-- Floating abstract UI elements -->
                    <div style="position: absolute; width: 100%; height: 100%; max-width: 500px; max-height: 500px; background: linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01)); border: 1px solid rgba(255,255,255,0.05); border-radius: 30px; transform: rotate(-5deg); z-index: 1;"></div>
                    <img src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=1000" style="width: 100%; max-width: 500px; border-radius: 30px; object-fit: cover; aspect-ratio: 4/5; position: relative; z-index: 2; box-shadow: 0 30px 60px rgba(0,0,0,0.5); transform: rotate(2deg); transition: transform 0.5s ease;" alt="Premium Shopping" onmouseover="this.style.transform='rotate(0deg) scale(1.02)'" onmouseout="this.style.transform='rotate(2deg) scale(1)'">
                    
                    <!-- Trust Card Floating -->
                    <div style="position: absolute; bottom: 40px; left: -20px; background: rgba(15,23,42,0.8); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.1); padding: 15px 25px; border-radius: 16px; z-index: 3; display: flex; align-items: center; gap: 15px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); animation: float 4s infinite ease-in-out;">
                        <div style="width: 40px; height: 40px; background: rgba(61,220,132,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #3DDC84; font-size: 1.2rem;">
                            <i class="fas fa-shield-check"></i>
                        </div>
                        <div>
                            <div style="color: white; font-weight: 700; font-size: 1.1rem;">100% Secure</div>
                            <div style="color: #94A3B8; font-size: 0.8rem;">Verified Products</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- TOP CATEGORIES -->
        <section class="container" style="margin-bottom: 40px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 25px;">
                <div>
                    <h2 style="font-size: 1.5rem; color: white; margin: 0 0 5px 0;">Top Categories</h2>
                    <p style="color: #64748B; font-size: 0.9rem; margin: 0;">Explore our wide range of collections</p>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 20px;">
                ${topCategoriesHtml}
            </div>
        </section>

        <!-- FLASH SALE (Horizontal Carousel) -->
        <section class="container" style="margin-bottom: 40px; background: #0F172A; border-radius: 24px; padding: 30px; border: 1px solid rgba(245,166,35,0.1); position: relative; overflow: hidden;">
            <div style="position: absolute; top: -50%; right: -10%; width: 40%; height: 200%; background: radial-gradient(circle, rgba(239,68,68,0.05) 0%, transparent 60%); pointer-events: none;"></div>
            
            <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; margin-bottom: 30px; gap: 20px;">
                <div style="display: flex; align-items: center; gap: 20px;">
                    <h2 style="font-size: 1.8rem; color: white; margin: 0; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-bolt" style="color: #F5A623;"></i> Flash Sale
                    </h2>
                    <div class="countdown-timer" style="display: flex; gap: 8px;">
                        <div style="background: rgba(239,68,68,0.1); color: #EF4444; padding: 6px 12px; border-radius: 8px; font-weight: 700; font-size: 1.1rem; border: 1px solid rgba(239,68,68,0.2);">03</div><span style="color: white; font-weight: bold; align-self: center;">:</span>
                        <div style="background: rgba(239,68,68,0.1); color: #EF4444; padding: 6px 12px; border-radius: 8px; font-weight: 700; font-size: 1.1rem; border: 1px solid rgba(239,68,68,0.2);">45</div><span style="color: white; font-weight: bold; align-self: center;">:</span>
                        <div style="background: rgba(239,68,68,0.1); color: #EF4444; padding: 6px 12px; border-radius: 8px; font-weight: 700; font-size: 1.1rem; border: 1px solid rgba(239,68,68,0.2);">12</div>
                    </div>
                </div>
                <button class="btn btn-outline-premium" onclick="filterCategory('OFFER')" style="height: 36px; font-size: 0.85rem;">View All Deals</button>
            </div>
            
            <!-- Horizontal Scroll Container -->
            <div class="carousel-container" style="display: flex; gap: 20px; overflow-x: auto; padding-bottom: 20px; scroll-snap-type: x mandatory; scrollbar-width: thin; scrollbar-color: rgba(245,166,35,0.5) rgba(255,255,255,0.05);">
                ${dealsToShow.map(p => `
                    <div style="min-width: 260px; max-width: 260px; scroll-snap-align: start;">
                        ${generateProductsHtml([p])}
                    </div>
                `).join('')}
            </div>
        </section>

        <!-- TRENDING -->
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
        ` : ''}

        <!-- CUSTOMER REVIEWS -->
        <section class="container" style="margin-bottom: 60px;">
            <div style="text-align: center; margin-bottom: 40px;">
                <h2 style="font-size: 2rem; color: white; margin: 0 0 10px 0;">Loved by Customers</h2>
                <p style="color: #64748B; font-size: 1rem; margin: 0;">See what our users are saying about us</p>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px;">
                ${reviewsHtml}
            </div>
        </section>
    `;
    
    // Add simple animation for floating elements
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-15px); }
            100% { transform: translateY(0px); }
        }
        @keyframes pulse {
            0% { opacity: 0.5; transform: scale(1); }
            100% { opacity: 0.8; transform: scale(1.1); }
        }
        @keyframes shimmer {
            100% { transform: translateX(100%); }
        }
        .carousel-container::-webkit-scrollbar {
            height: 6px;
        }
        .carousel-container::-webkit-scrollbar-track {
            background: rgba(255,255,255,0.05);
            border-radius: 10px;
        }
        .carousel-container::-webkit-scrollbar-thumb {
            background: rgba(245,166,35,0.5);
            border-radius: 10px;
        }
        .carousel-container::-webkit-scrollbar-thumb:hover {
            background: rgba(245,166,35,0.8);
        }
    `;
    document.head.appendChild(style);
}'''

pattern = re.compile(r'function renderHome\(\) \{.*?(?=\nasync function|\nfunction|\nwindow\.)', re.DOTALL)
new_content = pattern.sub(new_render_home + '\n\n', content)

with open('c:/Users/CS/OneDrive/Desktop/CSGO APP/script.js', 'w', encoding='utf-8') as f:
    f.write(new_content)
    
print("Replaced renderHome successfully.")
