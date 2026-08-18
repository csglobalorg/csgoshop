css = '''
/* ==========================================================
   BLUEPRINT PHASE 1: HERO, CATEGORIES & FLASH SALE
   ========================================================== */

/* --- 1. Premium Hero --- */
.premium-hero {
    position: relative;
    background: var(--secondary-color);
    overflow: hidden;
    padding: 0 !important;
}

.hero-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 580px;
    position: relative;
    z-index: 2;
}

.hero-left {
    flex: 1;
    max-width: 600px;
    padding: 60px 0;
}

.hero-right {
    flex: 1;
    display: flex;
    justify-content: flex-end;
    position: relative;
}

.hero-image-wrapper {
    position: relative;
    width: 100%;
    max-width: 500px;
}

.hero-img-animated {
    width: 100%;
    height: auto;
    border-radius: 20px;
    animation: slowZoom 20s infinite alternate linear;
    position: relative;
    z-index: 2;
}

.hero-glow {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 80%;
    height: 80%;
    background: radial-gradient(circle, var(--accent-color) 0%, transparent 70%);
    opacity: 0.3;
    filter: blur(50px);
    z-index: 1;
    animation: pulseGlow 4s infinite alternate;
}

@keyframes slowZoom {
    0% { transform: scale(1); }
    100% { transform: scale(1.1); }
}

@keyframes pulseGlow {
    0% { opacity: 0.2; transform: translate(-50%, -50%) scale(0.9); }
    100% { opacity: 0.4; transform: translate(-50%, -50%) scale(1.1); }
}

.hero-title {
    font-size: 3.5rem;
    line-height: 1.1;
    margin-bottom: 20px;
    font-weight: 800;
}

.hero-desc {
    font-size: 1.1rem;
    color: var(--text-light);
    margin-bottom: 30px;
    line-height: 1.6;
}

.hero-btns {
    display: flex;
    gap: 15px;
}

/* Trust Cards (Hero Bottom) */
.trust-cards-container {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
    padding: 30px 20px;
    position: relative;
    z-index: 3;
    background: rgba(13, 17, 23, 0.6);
    backdrop-filter: blur(10px);
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    margin-top: -80px;
}

.trust-card {
    display: flex;
    align-items: center;
    gap: 15px;
}

.trust-icon {
    font-size: 2rem;
    background: rgba(255, 255, 255, 0.05);
    padding: 15px;
    border-radius: 12px;
}

.trust-info h4 {
    margin: 0 0 5px 0;
    font-size: 1.1rem;
}

.trust-info p {
    margin: 0;
    font-size: 0.85rem;
    color: var(--text-light);
}

/* --- 2. Quick Categories (Premium Cards) --- */
.quick-categories-section {
    padding: 80px 20px;
}

.premium-categories .category-card {
    background: linear-gradient(145deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.8)) !important;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2) !important;
    border-radius: 20px !important;
    padding: 25px 15px !important;
    transition: all 0.3s ease !important;
}

.premium-categories .category-card:hover {
    background: linear-gradient(145deg, rgba(40, 51, 69, 0.8), rgba(25, 33, 52, 0.9)) !important;
    transform: translateY(-10px) !important;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 20px rgba(245, 166, 35, 0.2) !important;
    border-color: var(--accent-color) !important;
}

/* --- 3. Flash Sale Countdown --- */
.flash-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
}

.countdown-timer {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: 20px;
}

.time-box {
    background: #ef4444;
    color: white;
    font-weight: bold;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 1.1rem;
    box-shadow: 0 4px 10px rgba(239, 68, 68, 0.3);
}

.countdown-timer .colon {
    font-weight: bold;
    font-size: 1.2rem;
    color: var(--text-color);
}

.products-horizontal-slider {
    display: flex;
    gap: 20px;
    overflow-x: auto;
    padding-bottom: 20px;
    scrollbar-width: none; /* Firefox */
}
.products-horizontal-slider::-webkit-scrollbar {
    display: none; /* Chrome */
}
.products-horizontal-slider > * {
    min-width: 280px;
    flex-shrink: 0;
}

/* --- Responsive Adjustments --- */
@media (max-width: 992px) {
    .hero-container {
        flex-direction: column;
        text-align: center;
        padding-top: 40px;
    }
    
    .hero-title {
        font-size: 2.5rem;
    }
    
    .hero-btns {
        justify-content: center;
    }
    
    .hero-right {
        margin-top: 40px;
        justify-content: center;
    }
    
    .trust-cards-container {
        grid-template-columns: repeat(2, 1fr);
        margin-top: 0;
        border-top: none;
    }
}

@media (max-width: 768px) {
    .hero-container {
        min-height: 420px;
    }
    
    .flash-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 15px;
    }
    
    .countdown-timer {
        margin-left: 0;
    }
    
    .trust-cards-container {
        grid-template-columns: 1fr;
    }
}
'''

with open('c:/Users/CS/OneDrive/Desktop/CSGO APP/style.css', 'a', encoding='utf-8') as f:
    f.write(css)

print('CSS styles for Blueprint Phase 1 appended.')
