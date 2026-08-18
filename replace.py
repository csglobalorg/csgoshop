import re

with open('c:/Users/CS/OneDrive/Desktop/CSGO APP/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

new_template = r'''    const homeContentHtml = 
        <!-- 1. Hero Section -->
        <section class="hero bg-dark">
            <img src="/hero.webp" 
                 class="hero-img" 
                 loading="eager" 
                 fetchpriority="high"
                 alt="CSGO SHOP hero image"
                 style="opacity: 0.6;">
            <div class="hero-bottom-fade"></div>
            <div class="container" style="position: relative; z-index: 5;">
                <div class="hero-content" style="padding-top: 50px; padding-bottom: 50px;">
                    <div class="hero-badge">
                        <i class="fas fa-bolt"></i> Up to 50% OFF on Selected Items
                    </div>
                    <h1>Premium Quality Products <span class="highlight">at Best Price</span></h1>
                    <div class="hero-subtitle">
                        <i class="fas fa-truck"></i> Fast Delivery All Over Bangladesh
                    </div>
                    <p style="font-size: 1.1rem; max-width: 600px; margin: 0 auto 30px;">Shop from our curated collection of high-end fashion, gadgets, and lifestyle items. Experience the best online shopping experience in BD.</p>
                    <div class="hero-btns" style="justify-content: center;">
                        <button class="btn" style="padding: 15px 35px; font-size: 1.1rem; background: var(--accent-color); color: #000;" onclick="navigateTo('products')">Shop Now <i class="fas fa-chevron-right" style="margin-left: 10px;"></i></button>
                        <button class="btn btn-outline" style="padding: 15px 35px; font-size: 1.1rem;" onclick="filterCategory('OFFER')">View Offers</button>
                    </div>
                </div>
            </div>
        </section>

        <!-- Search Bar under Hero -->
        <div class="large-search-container">
            <div class="large-search-bar" style="display: flex; align-items: center;">
                <i class="fas fa-search" style="color: var(--text-light); font-size: 1.4rem; margin-left: 15px; margin-right: 10px;"></i>
                <input type="text" id="home-search-input" style="flex: 1; background: transparent; border: none; color: white; outline: none;" placeholder="Search for premium products, brands and more..." onkeypress="if(event.key === 'Enter') { navigateTo('search', this.value.trim()); }">
                <button class="btn" style="background: var(--accent-color); color: #000;" onclick="navigateTo('search', document.getElementById('home-search-input').value.trim())">Search</button>
            </div>
        </div>

        <!-- 2. Top Categories -->
        <section class="container bg-alternate" style="padding: 80px 20px;">
            <div class="section-header" style="text-align: center; margin-bottom: 40px;">
                <h2 class="section-title">Explore Categories</h2>
                <p>Find exactly what you're looking for</p>
            </div>
            <div class="categories-grid" style="grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 20px;">
                
            </div>
        </section>

        <!-- 3. Flash Sale Container -->
        <div id="flash-sale-container" class="bg-gradient-red" style="padding: 60px 0; border-radius: 0; box-shadow: inset 0 0 50px rgba(0,0,0,0.5);"></div>

        <!-- 4. Trending Section -->
        <section class="container bg-alternate" style="padding: 80px 20px;">
            <div class="section-header" style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 40px;">
                <div>
                    <h2 class="section-title" style="color: var(--accent-color); text-align: left;">Trending Now</h2>
                    <p>Most popular premium items right now</p>
                </div>
                <button class="btn btn-outline" style="padding: 10px 24px;" onclick="navigateTo('products')">View All</button>
            </div>
            <div class="products-grid">
                
            </div>
        </section>

        <!-- 5. Best Sellers Section -->
        <section class="container" style="padding: 80px 20px;">
            <div class="section-header" style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 40px;">
                <div>
                    <h2 class="section-title" style="color: #ef4444; text-align: left;">Best Sellers</h2>
                    <p>Hand-picked favorites at best prices</p>
                </div>
                <button class="btn btn-outline" style="padding: 10px 24px;" onclick="filterCategory('OFFER')">Shop All</button>
            </div>
            <div class="products-grid">
                
            </div>
        </section>

        <!-- 6. New Arrivals Section -->
        <section class="container bg-alternate" style="padding: 80px 20px;">
            <div class="section-header" style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 40px;">
                <div>
                    <h2 class="section-title" style="text-align: left;">New Arrivals</h2>
                    <p>Freshly added premium products</p>
                </div>
                <button class="btn btn-outline" style="padding: 10px 24px;" onclick="navigateTo('products')">View All</button>
            </div>
            <div class="products-grid">
                
            </div>
        </section>

        <!-- 7. Why CSGO (Statistics) -->
        <section class="container" style="padding: 80px 20px;">
            <div class="section-header" style="text-align: center; margin-bottom: 50px;">
                <h2 class="section-title">Why Choose CSGO SHOP</h2>
                <p>The most trusted premium marketplace in Bangladesh</p>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 30px;">
                <div class="stat-card">
                    <i class="fas fa-star stat-icon"></i>
                    <div class="stat-value">4.8</div>
                    <div class="stat-label">Average Rating</div>
                </div>
                <div class="stat-card">
                    <i class="fas fa-shipping-fast stat-icon" style="color: #3b82f6;"></i>
                    <div class="stat-value">24h</div>
                    <div class="stat-label">Fast Delivery</div>
                </div>
                <div class="stat-card">
                    <i class="fas fa-check-circle stat-icon" style="color: #10b981;"></i>
                    <div class="stat-value">100%</div>
                    <div class="stat-label">Authentic Items</div>
                </div>
                <div class="stat-card">
                    <i class="fas fa-users stat-icon" style="color: #ef4444;"></i>
                    <div class="stat-value">50k+</div>
                    <div class="stat-label">Happy Customers</div>
                </div>
            </div>
        </section>

        <!-- 8. Customer Reviews -->
        <section class="container bg-alternate" style="padding: 80px 20px;">
            <div class="section-header" style="text-align: center; margin-bottom: 50px;">
                <h2 class="section-title">What Our Customers Say</h2>
                <p>Real reviews from verified buyers</p>
            </div>
            <div style="display: flex; gap: 30px; overflow-x: auto; padding-bottom: 20px; scrollbar-width: none;">
                <div style="min-width: 320px; flex: 1; background: var(--bg-card); padding: 30px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
                    <div style="color: #f59e0b; margin-bottom: 15px; font-size: 1.2rem;"><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i></div>
                    <p style="font-size: 1rem; color: var(--text-light); margin-bottom: 25px; font-style: italic; line-height: 1.6;">"Amazing quality and very fast delivery. The premium packaging really impressed me. Will definitely buy again!"</p>
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="width: 50px; height: 50px; background: var(--accent-color); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.2rem; color: #000;">R</div>
                        <div>
                            <h4 style="margin: 0; font-size: 1.1rem;">Rahim Uddin</h4>
                            <span style="font-size: 0.85rem; color: var(--text-light);">Verified Buyer <i class="fas fa-check-circle" style="color: #10b981;"></i></span>
                        </div>
                    </div>
                </div>
                <div style="min-width: 320px; flex: 1; background: var(--bg-card); padding: 30px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
                    <div style="color: #f59e0b; margin-bottom: 15px; font-size: 1.2rem;"><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i></div>
                    <p style="font-size: 1rem; color: var(--text-light); margin-bottom: 25px; font-style: italic; line-height: 1.6;">"The product matched the description perfectly. Customer service was incredibly helpful when I had a query. 10/10 experience."</p>
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="width: 50px; height: 50px; background: #3b82f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.2rem; color: #fff;">S</div>
                        <div>
                            <h4 style="margin: 0; font-size: 1.1rem;">Sadia Islam</h4>
                            <span style="font-size: 0.85rem; color: var(--text-light);">Verified Buyer <i class="fas fa-check-circle" style="color: #10b981;"></i></span>
                        </div>
                    </div>
                </div>
                <div style="min-width: 320px; flex: 1; background: var(--bg-card); padding: 30px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
                    <div style="color: #f59e0b; margin-bottom: 15px; font-size: 1.2rem;"><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i></div>
                    <p style="font-size: 1rem; color: var(--text-light); margin-bottom: 25px; font-style: italic; line-height: 1.6;">"Best ecommerce experience in BD so far. The UI is smooth and the gadgets are 100% genuine. Highly recommended!"</p>
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="width: 50px; height: 50px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.2rem; color: #fff;">T</div>
                        <div>
                            <h4 style="margin: 0; font-size: 1.1rem;">Tanvir Ahmed</h4>
                            <span style="font-size: 0.85rem; color: var(--text-light);">Verified Buyer <i class="fas fa-check-circle" style="color: #10b981;"></i></span>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- 9. App Download Banner -->
        <section class="container" style="padding: 80px 20px;">
            <div style="background: linear-gradient(135deg, rgba(15,23,42,0.8), rgba(30,58,138,0.4)); border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 50px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 40px; box-shadow: 0 20px 50px rgba(0,0,0,0.3);">
                <div style="flex: 1; min-width: 300px;">
                    <h2 class="section-title" style="text-align: left; margin-bottom: 15px;">Download Our Premium App</h2>
                    <p style="color: var(--text-light); font-size: 1.1rem; margin-bottom: 30px; max-width: 500px;">Get exclusive app-only deals, faster checkout, and a seamless shopping experience directly on your smartphone.</p>
                    <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                        <button class="btn btn-outline" style="background: #000; color: white; border: 1px solid rgba(255,255,255,0.2); padding: 12px 25px; display: flex; align-items: center; gap: 15px; border-radius: 12px;">
                            <i class="fab fa-google-play" style="font-size: 2rem; color: #3DDC84;"></i> 
                            <div style="text-align: left; line-height: 1.2;">
                                <span style="font-size: 0.75rem; color: #aaa;">GET IT ON</span><br>
                                <span style="font-size: 1.2rem; font-weight: 600;">Google Play</span>
                            </div>
                        </button>
                    </div>
                </div>
                <div style="flex-shrink: 0; text-align: center;">
                    <i class="fas fa-mobile-alt" style="font-size: 10rem; color: rgba(255,255,255,0.1); transform: rotate(-15deg);"></i>
                </div>
            </div>
        </section>

        <!-- 10. All Products Section -->
        <section id="all-products-segment" class="container bg-alternate" style="padding: 80px 20px;">
            <div class="section-header" style="text-align: center; margin-bottom: 50px;">
                <h2 class="section-title">All Products</h2>
                <p>Browse our entire premium catalog</p>
            </div>
            <div id="home-all-products-grid" class="products-grid">
                
            </div>
            <div id="home-load-more-container" style="text-align: center; margin-top: 50px;">
                <button id="home-load-more-btn" class="btn btn-outline" style="padding: 15px 40px; font-size: 1.1rem; border-radius: 30px;" onclick="loadMoreHomeProducts()">Discover More Products</button>
            </div>
        </section>

        
    ;'''

pattern = r'const homeContentHtml = .*?(\$\{renderSEOHomeContent\(\)\}\n    );'
new_content = re.sub(pattern, new_template, content, flags=re.DOTALL)

with open('c:/Users/CS/OneDrive/Desktop/CSGO APP/script.js', 'w', encoding='utf-8') as f:
    f.write(new_content)
    
print('Replaced successfully')
