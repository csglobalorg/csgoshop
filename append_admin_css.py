import os

css_to_append = """
/* === ADMIN DASHBOARD STYLES === */
.admin-nav-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 15px;
    margin-bottom: 8px;
    border-radius: 10px;
    color: var(--text-light);
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 0.95rem;
    font-weight: 500;
}

.admin-nav-item:hover {
    background: rgba(255, 255, 255, 0.05);
    color: white;
}

.admin-nav-item.active {
    background: var(--accent-color);
    color: var(--bg-dark);
    font-weight: 700;
}

.admin-stat-card {
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.05);
    border-radius: 16px;
    padding: 25px;
    display: flex;
    align-items: center;
    gap: 20px;
    transition: all 0.3s ease;
}

.admin-stat-card:hover {
    transform: translateY(-3px);
    border-color: rgba(255,255,255,0.1);
    box-shadow: 0 10px 20px rgba(0,0,0,0.2);
}

.admin-table {
    width: 100%;
    border-collapse: collapse;
}

.admin-table th, .admin-table td {
    padding: 15px;
    text-align: left;
    border-bottom: 1px solid rgba(255,255,255,0.05);
}

.admin-table th {
    color: var(--text-light);
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
}

@media (max-width: 900px) {
    .admin-layout {
        flex-direction: column !important;
    }
    .admin-sidebar {
        width: 100% !important;
        border-right: none !important;
        border-bottom: 1px solid rgba(255,255,255,0.05) !important;
        height: auto !important;
    }
    .admin-sidebar .admin-nav-item {
        display: inline-flex;
        margin-right: 10px;
    }
    .admin-main-content {
        padding: 15px !important;
    }
    .admin-stat-card {
        padding: 15px;
    }
}
"""

with open('style.css', 'a', encoding='utf-8') as f:
    f.write(css_to_append)

print("Admin Dashboard CSS appended successfully.")
