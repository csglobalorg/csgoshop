import re

with open('c:/Users/CS/OneDrive/Desktop/CSGO APP/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

new_func = '''function generateProductsHtml(productsArray) {
    const wishlist = JSON.parse(localStorage.getItem('csgo_wishlist')) || [];

    return productsArray.map(product => {
        const reviews = JSON.parse(localStorage.getItem('csgo_reviews')) || {};
        const productReviews = reviews[product.id] || [];
        let avgRating = 0;
        if (productReviews.length > 0) {
            const sum = productReviews.reduce((acc, review) => acc + review.rating, 0);
            avgRating = Math.round(sum / productReviews.length);
        }
        
        const isWishlisted = wishlist.includes(product.id);
        const seed = product.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

        // Calculate discount percentage
        let discountBadgeHtml = '';
        if (product.originalPrice && product.originalPrice > product.price) {
            const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
            discountBadgeHtml = `<div class="premium-badge discount-badge">?? ${discount}% OFF</div>`;
        } else if (product.badge) {
            discountBadgeHtml = `<div class="premium-badge regular-badge">${product.badge.toUpperCase()}</div>`;
        }

        const soldCount = (seed % 400) + 50; 
        const displayRating = avgRating ? avgRating.toFixed(1) : ((seed % 10) / 10 + 4.0).toFixed(1);
        const reviewCount = productReviews.length > 0 ? productReviews.length : Math.floor(Math.random() * 50) + 10;
        
        const isStockOut = product.status === 'stock-out' || product.badge === 'stock-out';

        return `
         <div class="product-card premium-card ${isStockOut ? 'out-of-stock' : ''}" data-id="${product.id}">
            ${discountBadgeHtml}
            
            <div class="wishlist-btn-overlay ${isWishlisted ? 'active' : ''}" onclick="toggleWishlist('${product.id}', event)" title="Add to Wishlist">
                <i class="${isWishlisted ? 'fas' : 'far'} fa-heart"></i>
            </div>

            <div class="product-img-wrapper" onclick="navigateTo('product-details', '${product.id}')">
                 <img src="${getOptimizedImageUrl(product.image, 400, 85)}" 
                      alt="${product.name}" 
                      class="product-img"
                      loading="lazy" 
                      decoding="async">
                
                <div class="quick-view-overlay">
                    <button class="btn-quick-view" onclick="openQuickView('${product.id}', event)">
                        <i class="fas fa-eye"></i> Quick View
                    </button>
                </div>
                
                ${isStockOut ? `<div class="stock-out-overlay"><span>Out of Stock</span></div>` : ''}
            </div>

            <div class="product-info">
                <div class="product-meta">
                    <div class="product-rating">
                        <i class="fas fa-star text-accent"></i>
                        <span>${displayRating} (${reviewCount})</span>
                    </div>
                    <div class="product-sold">Sold ${soldCount}+</div>
                </div>
                
                <div class="product-category-label">${product.category || 'Premium Collection'}</div>
                <h3 class="product-title" onclick="navigateTo('product-details', '${product.id}')" title="${product.name}">${product.name}</h3>
                
                <div class="product-price-row">
                    <div class="current-price">?${product.price}</div>
                    ${product.originalPrice && product.originalPrice > product.price ? 
                        `<div class="old-price">?${product.originalPrice}</div>` : ''}
                </div>
                
                <div class="trust-indicators">
                    <span class="trust-badge"><i class="fas fa-truck-fast"></i> Fast Delivery</span>
                    <span class="trust-badge"><i class="fas fa-hand-holding-dollar"></i> COD</span>
                </div>

                <div class="product-actions-grid">
                    <button class="btn btn-outline-premium action-cart" onclick="addToCart('${product.id}', event)" ${isStockOut ? 'disabled' : ''}>
                        <i class="fas fa-cart-plus"></i>
                    </button>
                    <button class="btn btn-primary-premium action-buy" onclick="buyNow('${product.id}', event)" ${isStockOut ? 'disabled' : ''}>
                        Buy Now
                    </button>
                </div>
            </div>
        </div>
    `}).join('');
}'''

# Extract the old function text
pattern = re.compile(r'function generateProductsHtml\(productsArray\) \{.*?\n\}\n', re.DOTALL)
new_content = pattern.sub(new_func + '\n', content)

with open('c:/Users/CS/OneDrive/Desktop/CSGO APP/script.js', 'w', encoding='utf-8') as f:
    f.write(new_content)
    
print("Replaced generateProductsHtml successfully.")
