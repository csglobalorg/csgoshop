import os

css_to_append = """
/* === PREMIUM UI OVERHAUL FIXES === */

/* Product Grid Actions */
.product-actions-grid {
    display: grid;
    grid-template-columns: 45px 1fr;
    gap: 8px;
    margin-top: 15px;
}
.btn-outline-premium {
    background: transparent;
    border: 1px solid var(--accent-color);
    color: var(--accent-color);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s;
}
.btn-outline-premium:hover {
    background: var(--accent-color);
    color: #000;
}
.btn-primary-premium {
    background: var(--accent-color);
    color: #000;
    border: none;
    border-radius: 8px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s;
}
.btn-primary-premium:hover {
    background: var(--accent-hover);
    transform: translateY(-2px);
}
.product-price-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
}
.trust-indicators {
    display: flex;
    gap: 10px;
    margin-bottom: 15px;
}
.trust-badge {
    font-size: 0.7rem;
    color: var(--text-light);
    display: flex;
    align-items: center;
    gap: 4px;
    background: rgba(255,255,255,0.05);
    padding: 3px 6px;
    border-radius: 4px;
}

/* Mobile Specific Tweaks for Painless UI */
@media (max-width: 768px) {
    .products-grid {
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 10px !important;
        padding: 0 5px;
    }
    .product-card {
        border-radius: 12px;
    }
    .product-info {
        padding: 10px;
    }
    .product-title {
        font-size: 0.85rem !important;
        line-height: 1.3 !important;
        height: 34px !important; /* exactly 2 lines */
        margin-bottom: 5px !important;
    }
    .current-price {
        font-size: 1rem !important;
    }
    .old-price {
        font-size: 0.75rem !important;
    }
    .trust-indicators {
        display: none; /* Hide trust on mobile grid to save space */
    }
    .product-actions-grid {
        grid-template-columns: 1fr;
        margin-top: 10px;
    }
    .btn-outline-premium.action-cart {
        display: none !important; /* Hide cart button on mobile grid */
    }
    .btn-primary-premium.action-buy {
        width: 100%;
        padding: 8px;
        font-size: 0.85rem;
    }
    .mobile-search-bar {
        padding: 10px 0 !important;
        top: 60px !important; 
    }
    .header-container {
        height: 60px !important;
    }
    .mobile-search-toggle {
        padding: 8px !important;
        margin-right: 5px !important;
    }
}
"""

with open('style.css', 'a', encoding='utf-8') as f:
    f.write(css_to_append)

print("CSS appended successfully.")
