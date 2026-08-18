import re

with open('c:/Users/CS/OneDrive/Desktop/CSGO APP/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

search_logic = '''
/* --- Phase 2: Premium Live Search --- */
function openSearchOverlay() {
    const overlay = document.getElementById('search-overlay');
    if (overlay) {
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        renderSearchSuggestions();
    }
}

function closeSearchOverlay() {
    const overlay = document.getElementById('search-overlay');
    if (overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

// Close search when clicking outside
document.addEventListener('click', (e) => {
    const overlay = document.getElementById('search-overlay');
    const searchBox = document.querySelector('.desktop-search-wrapper');
    if (overlay && overlay.classList.contains('active') && searchBox) {
        if (!overlay.contains(e.target) && !searchBox.contains(e.target)) {
            closeSearchOverlay();
        }
    }
});

// Also close on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeSearchOverlay();
        const searchInput = document.getElementById('desktop-search-input');
        if (searchInput) searchInput.blur();
    }
});

function renderSearchSuggestions() {
    const container = document.getElementById('search-suggestions-container');
    if (!container) return;
    
    let history = JSON.parse(localStorage.getItem('csgo_search_history') || '[]');
    
    // Trending Searches (Mocked for premium feel)
    const trending = ['Nike Shoes', 'Smart Watch', 'Panjabi', 'Gaming Mouse'];
    
    let html = `
        <div class="search-block">
            <h3><i class="fas fa-history"></i> Recent Searches</h3>
            <div class="search-tags">
                ${history.length > 0 ? history.map(item => `
                    <div class="search-tag" onclick="fillSearch('${item}')">${item}</div>
                `).join('') : '<span style="color:#64748B; font-size: 0.85rem;">No recent searches</span>'}
            </div>
        </div>
        <div class="search-block">
            <h3><i class="fas fa-fire" style="color:#ef4444;"></i> Trending</h3>
            <div class="search-tags">
                ${trending.map(item => `
                    <div class="search-tag" onclick="fillSearch('${item}')">
                        <i class="fas fa-arrow-trend-up"></i> ${item}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Clear live results area
    const resultsGrid = document.getElementById('search-live-results');
    if (resultsGrid) resultsGrid.innerHTML = '';
}

function fillSearch(query) {
    const input = document.getElementById('desktop-search-input');
    if (input) {
        input.value = query;
        handleLiveSearch(query);
    }
}

let searchTimeout;
function handleLiveSearch(query) {
    clearTimeout(searchTimeout);
    const resultsGrid = document.getElementById('search-live-results');
    const container = document.getElementById('search-suggestions-container');
    const clearBtn = document.querySelector('.clear-search');
    
    if (clearBtn) clearBtn.style.display = query.length > 0 ? 'block' : 'none';
    
    if (query.trim().length === 0) {
        renderSearchSuggestions();
        if (container) container.style.display = 'flex';
        return;
    }
    
    searchTimeout = setTimeout(() => {
        if (container) container.style.display = 'none';
        
        // Save to history on active search
        if (query.length > 2) {
            let history = JSON.parse(localStorage.getItem('csgo_search_history') || '[]');
            if (!history.includes(query)) {
                history.unshift(query);
                if (history.length > 5) history.pop();
                localStorage.setItem('csgo_search_history', JSON.stringify(history));
            }
        }

        const filtered = products.filter(p => 
            p.name.toLowerCase().includes(query.toLowerCase()) || 
            (p.category && p.category.toLowerCase().includes(query.toLowerCase()))
        ).slice(0, 8); // Max 8 results for live search
        
        if (resultsGrid) {
            if (filtered.length > 0) {
                // Reuse existing generateProductsHtml but maybe wrap in a grid or it will just return the cards
                resultsGrid.innerHTML = `
                    <div style="grid-column: 1 / -1; margin-bottom: 20px;">
                        <h3 style="color: white; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
                            Results for "${query}" <span style="color: #64748B; font-size: 0.9rem;">(${filtered.length})</span>
                        </h3>
                    </div>
                    ${generateProductsHtml(filtered)}
                `;
            } else {
                resultsGrid.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 40px 0;">
                        <i class="fas fa-search" style="font-size: 3rem; color: rgba(255,255,255,0.1); margin-bottom: 20px;"></i>
                        <h3 style="color: white; margin-bottom: 10px;">No results found for "${query}"</h3>
                        <p style="color: #64748B;">Try checking your spelling or using more general terms.</p>
                    </div>
                `;
            }
        }
    }, 300); // 300ms debounce
}

function clearSearch() {
    const input = document.getElementById('desktop-search-input');
    if (input) {
        input.value = '';
        handleLiveSearch('');
        input.focus();
    }
}
'''

content += "\n" + search_logic

with open('c:/Users/CS/OneDrive/Desktop/CSGO APP/script.js', 'w', encoding='utf-8') as f:
    f.write(content)
    
print("Search JS appended successfully.")
