import os

css_to_append = """
/* === MODERN FILTER BAR === */
.filter-bar {
    background: rgba(15,23,42,0.6) !important;
    border: 1px solid rgba(255,255,255,0.05) !important;
    backdrop-filter: blur(12px) !important;
    border-radius: 16px !important;
    padding: 15px 25px !important;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3) !important;
}

.filter-group select {
    background: rgba(0,0,0,0.3) !important;
    border: 1px solid rgba(255,255,255,0.1) !important;
    color: white !important;
    border-radius: 8px !important;
    padding: 10px 15px !important;
    cursor: pointer !important;
    transition: all 0.3s ease !important;
}

.filter-group select:focus {
    border-color: var(--accent-color) !important;
    outline: none !important;
}

@media (max-width: 768px) {
    .filter-bar {
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 15px !important;
    }
    
    .filter-group {
        justify-content: space-between !important;
        width: 100% !important;
    }
}
"""

with open('style.css', 'a', encoding='utf-8') as f:
    f.write(css_to_append)

print("Modern Filter Bar CSS appended successfully.")
