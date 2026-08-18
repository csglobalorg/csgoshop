import re

with open('c:/Users/CS/OneDrive/Desktop/CSGO APP/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

old_filter_bar = '''            <div class="filter-bar">
                <div class="filter-group">
                    <label>Sort by:</label>
                    <select id="sort-select" onchange="applySort(this.value, '${(category || '').replace(/'/g, "\\'")}', '${(searchQuery || '').replace(/'/g, "\\'")}')">
                        <option value="default">Default</option>
                        <option value="price-low">Price: Low to High</option>
                        <option value="price-high">Price: High to Low</option>
                        <option value="newest">Newest Arrivals</option>
                    </select>
                </div>
                <div class="filter-group">
                    <span>${displayProducts.length} Products Found</span>
                </div>
            </div>'''

new_filter_bar = '''            <div class="premium-filter-bar" style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; background: rgba(15,23,42,0.4); padding: 15px 20px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 25px; gap: 15px;">
                <div class="filter-left" style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap;">
                    <div class="filter-group premium-select-wrapper" style="display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-sort-amount-down text-accent"></i>
                        <select id="sort-select" onchange="applySort(this.value, '${(category || '').replace(/'/g, "\\'")}', '${(searchQuery || '').replace(/'/g, "\\'")}')" style="background: transparent; border: none; color: white; outline: none; font-weight: 600; cursor: pointer; padding-right: 10px;">
                            <option value="default" style="color: black;">Default Sorting</option>
                            <option value="price-low" style="color: black;">Price: Low to High</option>
                            <option value="price-high" style="color: black;">Price: High to Low</option>
                            <option value="newest" style="color: black;">Newest Arrivals</option>
                        </select>
                    </div>
                    
                    <!-- Advanced Filters Placeholder for UI -->
                    <div class="filter-group toggle-wrapper" style="display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" id="in-stock-only" onchange="alert('Advanced filtering active (UI Demo)')" style="accent-color: #F5A623; cursor: pointer; width: 16px; height: 16px;">
                        <label for="in-stock-only" style="font-size: 0.9rem; color: #CBD5E1; cursor: pointer;">In Stock Only</label>
                    </div>
                </div>
                
                <div class="filter-right">
                    <span style="background: rgba(245,166,35,0.1); color: #F5A623; padding: 6px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600;">
                        ${displayProducts.length} Products Found
                    </span>
                </div>
            </div>'''

content = content.replace(old_filter_bar, new_filter_bar)

with open('c:/Users/CS/OneDrive/Desktop/CSGO APP/script.js', 'w', encoding='utf-8') as f:
    f.write(content)
    
print("Updated filter bar successfully.")
