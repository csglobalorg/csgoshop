import re

with open('c:/Users/CS/OneDrive/Desktop/CSGO APP/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace header icons to include the desktop search
old_icons = '''            <!-- Right: Search, Wishlist, Cart, Profile -->
            <div class="header-icons" style="display: flex; align-items: center; gap: 20px;">
                <!-- Mobile Search Trigger -->
                <button class="mobile-search-toggle" onclick="toggleMobileSearch()" aria-label="Toggle search" style="background:none; border:none; color:inherit; cursor: pointer; padding: 5px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                </button>'''

new_icons = '''            <!-- Right: Search, Wishlist, Cart, Profile -->
            <div class="header-icons" style="display: flex; align-items: center; gap: 20px;">
                
                <!-- Desktop Search (Premium Expanding) -->
                <div class="desktop-search-wrapper desktop-only">
                    <div class="premium-search-box">
                        <i class="fas fa-search search-icon"></i>
                        <input type="text" id="desktop-search-input" placeholder="Search products..." oninput="handleLiveSearch(this.value)" onfocus="openSearchOverlay()" autocomplete="off">
                        <button class="clear-search" onclick="clearSearch()" style="display:none;"><i class="fas fa-times"></i></button>
                    </div>
                </div>

                <!-- Mobile Search Trigger -->
                <button class="mobile-search-toggle" onclick="toggleMobileSearch()" aria-label="Toggle search" style="background:none; border:none; color:inherit; cursor: pointer; padding: 5px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                </button>'''

content = content.replace(old_icons, new_icons)

# Add search overlay right after </header>
old_end_header = '''    </header>

    <!-- Mobile Search Bar (Expandable) -->'''

new_end_header = '''    </header>

    <!-- Premium Search Overlay -->
    <div id="search-overlay" class="search-overlay">
        <div class="search-overlay-content container">
            <div class="search-suggestions-container" id="search-suggestions-container">
                <!-- Injected via JS -->
            </div>
            <div class="search-results-grid" id="search-live-results">
                <!-- Injected via JS -->
            </div>
        </div>
    </div>

    <!-- Mobile Search Bar (Expandable) -->'''

content = content.replace(old_end_header, new_end_header)

with open('c:/Users/CS/OneDrive/Desktop/CSGO APP/index.html', 'w', encoding='utf-8') as f:
    f.write(content)
    
print("Updated index.html successfully.")
