import os

css_to_append = """
/* === PAYMENT GATEWAY STYLES === */
.checkout-main .form-group input, 
.checkout-main .form-group textarea, 
.checkout-main .form-group select {
    background: rgba(0, 0, 0, 0.2) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    color: white !important;
    transition: all 0.3s ease;
}

.checkout-main .form-group input:focus, 
.checkout-main .form-group textarea:focus, 
.checkout-main .form-group select:focus {
    border-color: var(--accent-color) !important;
    box-shadow: 0 0 10px rgba(249, 158, 26, 0.2) !important;
    outline: none;
}

.payment-method {
    background: var(--bg-glass);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 15px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    cursor: pointer;
    transition: all 0.3s ease;
    text-align: center;
    position: relative;
    overflow: hidden;
}

.payment-method:hover {
    transform: translateY(-3px);
    border-color: rgba(255, 255, 255, 0.3);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.payment-method.active {
    border-color: var(--accent-color);
    background: rgba(249, 158, 26, 0.05);
    box-shadow: 0 0 15px rgba(249, 158, 26, 0.15);
}

.payment-method.active::after {
    content: '\\f058';
    font-family: 'Font Awesome 6 Free';
    font-weight: 900;
    position: absolute;
    top: 5px;
    right: 5px;
    color: var(--accent-color);
    font-size: 1.1rem;
}

.payment-method span {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-color);
}
"""

with open('style.css', 'a', encoding='utf-8') as f:
    f.write(css_to_append)

print("Payment Gateway CSS appended successfully.")
