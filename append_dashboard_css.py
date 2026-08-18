import os

css_to_append = """
/* === USER DASHBOARD STYLES === */
.dashboard-header {
    display: flex;
    align-items: center;
    background: var(--bg-glass);
    padding: 25px;
    border-radius: 20px;
    border: 1px solid var(--border-color);
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    backdrop-filter: blur(10px);
    margin-bottom: 30px;
    flex-wrap: wrap;
    gap: 20px;
}
.dashboard-avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: var(--accent-gradient);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
    font-weight: 800;
    color: var(--bg-dark);
    box-shadow: 0 5px 15px rgba(249, 158, 26, 0.3);
}
.profile-completion {
    margin-left: auto;
    min-width: 200px;
    background: rgba(0,0,0,0.3);
    padding: 15px;
    border-radius: 12px;
}
.progress-bar-bg {
    height: 8px;
    background: rgba(255,255,255,0.1);
    border-radius: 4px;
    margin-top: 10px;
    overflow: hidden;
}
.progress-bar-fill {
    height: 100%;
    background: var(--accent-gradient);
    border-radius: 4px;
}
.quick-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
}
.stat-card-premium {
    background: var(--bg-glass);
    padding: 20px;
    border-radius: 16px;
    border: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    gap: 15px;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
}
.stat-card-premium:hover {
    transform: translateY(-5px);
    border-color: rgba(255,255,255,0.2);
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
}
.stat-icon {
    width: 50px;
    height: 50px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
}
@media (max-width: 768px) {
    .dashboard-header {
        flex-direction: column;
        text-align: center;
    }
    .profile-completion {
        margin-left: 0;
        width: 100%;
    }
    .quick-stats-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
    }
    .stat-card-premium {
        flex-direction: column;
        text-align: center;
        padding: 15px 10px;
    }
}
"""

with open('style.css', 'a', encoding='utf-8') as f:
    f.write(css_to_append)

print("Dashboard CSS appended successfully.")
