import re

with open('c:/Users/CS/OneDrive/Desktop/CSGO APP/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

new_header = r'''    <!-- Header -->
    <header class="header" id="main-header">
        <div class="container header-container" style="display: flex; align-items: center; justify-content: space-between; gap: 20px;">
            <!-- Left: Brand -->
            <div style="display: flex; align-items: center; gap: 15px;">
                <button class="mobile-menu-toggle" onclick="toggleMobileMenu()" aria-label="Open menu" style="background:none; border:none; color:inherit; cursor: pointer;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="3" y1="12" x2="21" y2="12"></line>
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>
                </button>
                <a href="#" onclick="navigateTo('home'); return false;" class="logo" style="text-decoration: none;"
                    title="CSGO SHOP">
                    <div class="clean-logo">CSGO<span>SHOP</span></div>
                </a>
            </div>
            
            <!-- Center: Navigation (Desktop Only) -->
            <div class="header-nav desktop-only" style="display: flex; gap: 30px; font-weight: 500;">
                <a href="#" onclick="navigateTo('home'); return false;" style="color: var(--text-color); text-decoration: none; transition: color 0.3s;" onmouseover="this.style.color='var(--accent-color)'" onmouseout="this.style.color='var(--text-color)'">Home</a>
                <a href="#" onclick="navigateTo('products'); return false;" style="color: var(--text-color); text-decoration: none; transition: color 0.3s;" onmouseover="this.style.color='var(--accent-color)'" onmouseout="this.style.color='var(--text-color)'">Shop</a>
                <a href="#" onclick="navigateTo('categories'); return false;" style="color: var(--text-color); text-decoration: none; transition: color 0.3s;" onmouseover="this.style.color='var(--accent-color)'" onmouseout="this.style.color='var(--text-color)'">Categories</a>
                <a href="#" onclick="navigateTo('affiliate'); return false;" style="color: var(--text-color); text-decoration: none; transition: color 0.3s;" onmouseover="this.style.color='var(--accent-color)'" onmouseout="this.style.color='var(--text-color)'">Affiliate</a>
                <a href="#" onclick="navigateTo('about'); return false;" style="color: var(--text-color); text-decoration: none; transition: color 0.3s;" onmouseover="this.style.color='var(--accent-color)'" onmouseout="this.style.color='var(--text-color)'">About</a>
            </div>
            
            <!-- Right: Search, Wishlist, Cart, Profile -->
            <div class="header-icons" style="display: flex; align-items: center; gap: 20px;">
                <!-- Mobile Search Trigger -->
                <button class="mobile-search-toggle" onclick="toggleMobileSearch()" aria-label="Toggle search" style="background:none; border:none; color:inherit; cursor: pointer; padding: 5px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                </button>
                <button class="wishlist-icon desktop-only" onclick="navigateTo('wishlist')" aria-label="My Wishlist"
                    style="background:none; border:none; color:inherit; cursor: pointer; padding: 5px; transition: color 0.3s;" onmouseover="this.style.color='var(--accent-color)'" onmouseout="this.style.color='inherit'">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                </button>
                <button class="cart-icon" onclick="toggleCart()" aria-label="Open shopping cart"
                    style="background:none; border:none; color:inherit; cursor: pointer; padding: 5px; position: relative; transition: color 0.3s;" onmouseover="this.style.color='var(--accent-color)'" onmouseout="this.style.color='inherit'">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path>
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <path d="M16 10a4 4 0 0 1-8 0"></path>
                    </svg>
                    <span class="cart-count" id="cart-count">0</span>
                </button>
                <button class="user-icon desktop-only" onclick="navigateTo('account')" aria-label="My Account"
                    style="background:none; border:none; color:inherit; cursor: pointer; padding: 5px; transition: color 0.3s;" onmouseover="this.style.color='var(--accent-color)'" onmouseout="this.style.color='inherit'">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                </button>
            </div>
        </div>
    </header>'''

pattern = r'    <!-- Header -->\n    <header class="header">.*?</header>'
new_content = re.sub(pattern, new_header, content, flags=re.DOTALL)

with open('c:/Users/CS/OneDrive/Desktop/CSGO APP/index.html', 'w', encoding='utf-8') as f:
    f.write(new_content)
    
print('Header Replaced successfully')
