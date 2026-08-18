import re

with open('c:/Users/CS/OneDrive/Desktop/CSGO APP/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

new_html = r'''    const homeContentHtml = 
        <!-- 1. Hero Section -->
        <section class="hero premium-hero">
            <div class="container hero-container">
                <div class="hero-left">
                    <div class="hero-badge">
                        <i class="fas fa-crown" style="color: #F5A623;"></i> Premium Marketplace
                    </div>
                    <h1 class="hero-title">Discover the Best Products <span class="highlight">at CSGO SHOP</span></h1>
                    <p class="hero-desc">Shop from our curated collection of high-end fashion, gadgets, and lifestyle items. Experience the best online shopping experience in BD.</p>
                    <div class="hero-btns">
                        <button class="btn btn-primary" onclick="navigateTo('products')">Shop Now <i class="fas fa-arrow-right"></i></button>
                        <button class="btn btn-outline-light" onclick="navigateTo('categories')">Explore Categories</button>
                    </div>
                </div>
                <div class="hero-right">
                    <div class="hero-image-wrapper">
                        <img src="/hero.webp" class="hero-img-animated" loading="eager" fetchpriority="high" alt="CSGO SHOP hero image">
                        <div class="hero-glow"></div>
                    </div>
                </div>
            </div>
            
            <!-- Trust Cards at bottom of hero -->
            <div class="container trust-cards-container">
                <div class="trust-card">
                    <div class="trust-icon"><i class="fas fa-star" style="color: #F5A623;"></i></div>
                    <div class="trust-info">
                        <h4>4.8 Rating</h4>
                        <p>1200+ Reviews</p>
                    </div>
                </div>
                <div class="trust-card">
                    <div class="trust-icon"><i class="fas fa-users" style="color: #3b82f6;"></i></div>
                    <div class="trust-info">
                        <h4>Happy Customers</h4>
                        <p>Join our community</p>
                    </div>
                </div>
                <div class="trust-card">
                    <div class="trust-icon"><i class="fas fa-box-open" style="color: #10b981;"></i></div>
                    <div class="trust-info">
                        <h4>350+ Delivered</h4>
                        <p>All over Bangladesh</p>
                    </div>
                </div>
                <div class="trust-card">
                    <div class="trust-icon"><i class="fas fa-headset" style="color: #ef4444;"></i></div>
                    <div class="trust-info">
                        <h4>24/7 Support</h4>
                        <p>Always here for you</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- 2. Quick Categories (Premium Cards) -->
        <section class="container quick-categories-section">
            <div class="categories-grid premium-categories">
                
            </div>
        </section>

        <!-- 3. Flash Sale -->
        <section class="container flash-sale-section">
            <div class="section-header flash-header">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <h2 class="section-title"><i class="fas fa-bolt" style="color: #ef4444;"></i> Flash Sale</h2>
                    <div class="countdown-timer">
                        <div class="time-box">03</div><span class="colon">:</span>
                        <div class="time-box">20</div><span class="colon">:</span>
                        <div class="time-box">40</div>
                    </div>
                </div>
                <button class="btn btn-text" onclick="filterCategory('OFFER')">View All <i class="fas fa-chevron-right"></i></button>
            </div>
            <div id="flash-sale-container" class="products-horizontal-slider">
                
            </div>
        </section>

        <!-- 4. Trending Products -->
        <section class="container products-section bg-alternate">
            <div class="section-header">
                <h2 class="section-title">Trending Products</h2>
                <button class="btn btn-text" onclick="navigateTo('products')">View All <i class="fas fa-chevron-right"></i></button>
            </div>
            <div class="products-grid">
                
            </div>
        </section>

        <!-- 5. Best Sellers -->
        <section class="container products-section">
            <div class="section-header">
                <h2 class="section-title">Best Sellers</h2>
                <button class="btn btn-text" onclick="filterCategory('OFFER')">View All <i class="fas fa-chevron-right"></i></button>
            </div>
            <div class="products-grid">
                
            </div>
        </section>

        <!-- 6. New Arrivals -->
        <section class="container products-section bg-alternate">
            <div class="section-header">
                <h2 class="section-title">New Arrivals</h2>
                <button class="btn btn-text" onclick="navigateTo('products')">View All <i class="fas fa-chevron-right"></i></button>
            </div>
            <div class="products-grid">
                
            </div>
        </section>

        <!-- 7. Recommended -->
        <section class="container products-section">
            <div class="section-header">
                <h2 class="section-title">Recommended For You</h2>
                <button class="btn btn-text" onclick="navigateTo('products')">View All <i class="fas fa-chevron-right"></i></button>
            </div>
            <div class="products-grid">
                
            </div>
        </section>

        <!-- 8. Customer Reviews -->
        <section class="container reviews-section bg-alternate">
            <div class="section-header center">
                <h2 class="section-title">Customer Reviews</h2>
                <p>Real experiences from verified buyers</p>
            </div>
            <div class="reviews-slider">
                <!-- Review Cards -->
                <div class="review-card">
                    <div class="review-header">
                        <div class="reviewer-avatar">R</div>
                        <div>
                            <h4>Rahim Uddin <i class="fas fa-check-circle verified-badge"></i></h4>
                            <div class="stars"><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i></div>
                        </div>
                    </div>
                    <p class="review-text">"Amazing quality and very fast delivery. I am very satisfied with my purchase. Will definitely buy again!"</p>
                </div>
                <div class="review-card">
                    <div class="review-header">
                        <div class="reviewer-avatar" style="background: #3b82f6;">S</div>
                        <div>
                            <h4>Sadia Islam <i class="fas fa-check-circle verified-badge"></i></h4>
                            <div class="stars"><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i></div>
                        </div>
                    </div>
                    <p class="review-text">"The product matched the description perfectly. Customer service was also very helpful. 10/10."</p>
                </div>
                <div class="review-card">
                    <div class="review-header">
                        <div class="reviewer-avatar" style="background: #10b981;">T</div>
                        <div>
                            <h4>Tanvir Ahmed <i class="fas fa-check-circle verified-badge"></i></h4>
                            <div class="stars"><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i></div>
                        </div>
                    </div>
                    <p class="review-text">"Premium packaging and the gadgets are genuine. Best ecommerce experience in BD so far."</p>
                </div>
            </div>
        </section>

        <!-- 9. App Download Banner -->
        <section class="container download-app-section">
            <div class="app-banner">
                <div class="app-banner-content">
                    <h2>Download CSGO SHOP App</h2>
                    <p>Get exclusive app-only offers and a faster checkout experience.</p>
                    <div class="app-buttons">
                        <button class="btn btn-store"><i class="fab fa-google-play"></i> <div><span>GET IT ON</span><br>Google Play</div></button>
                        <button class="btn btn-store"><i class="fab fa-apple"></i> <div><span>Download on the</span><br>App Store</div></button>
                    </div>
                </div>
                <div class="app-banner-image">
                    <i class="fas fa-mobile-alt"></i>
                </div>
            </div>
        </section>
        
        
    ;'''

start_str = "    const homeContentHtml = "
end_str = "    // Replace skeletons or set innerHTML BEFORE initializing icons"

start_idx = content.find(start_str)
end_idx = content.find(end_str)

if start_idx != -1 and end_idx != -1:
    new_content = content[:start_idx] + new_html + "\n\n" + content[end_idx:]
    with open('c:/Users/CS/OneDrive/Desktop/CSGO APP/script.js', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully replaced homeContentHtml")
else:
    print("Could not find start or end strings")
