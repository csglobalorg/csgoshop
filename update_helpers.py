import re

with open('c:/Users/CS/OneDrive/Desktop/CSGO APP/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

new_functions = """
function updateDashboardCounts(phone) {
    const wishlist = JSON.parse(localStorage.getItem('csgo_wishlist')) || [];
    const wishlistCountEl = document.getElementById('dashboard-wishlist-count');
    if (wishlistCountEl) wishlistCountEl.textContent = wishlist.length;
    
    // Total orders we can estimate or wait for fetchMyOrders to update it
    // Let's rely on fetchMyOrders to update #dashboard-total-orders
}

function renderAffiliateChart() {
    const canvas = document.getElementById('earningsChart');
    if (!canvas) return;
    
    if (typeof Chart === 'undefined') {
        setTimeout(renderAffiliateChart, 500);
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, 'rgba(245, 166, 35, 0.4)');
    gradient.addColorStop(1, 'rgba(245, 166, 35, 0)');
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'This Week'],
            datasets: [{
                label: 'Earnings (?)',
                data: [0, 50, 120, 90, 250, 420, 580], // Demo data, in real app fetch from DB
                borderColor: '#F5A623',
                backgroundColor: gradient,
                borderWidth: 2,
                pointBackgroundColor: '#1E293B',
                pointBorderColor: '#F5A623',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#F5A623',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return '?' + context.parsed.y;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
                    ticks: { color: '#64748B' }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
                    ticks: { color: '#64748B', callback: function(value) { return '?' + value; } }
                }
            },
            animation: {
                duration: 1500,
                easing: 'easeOutQuart'
            }
        }
    });
}

function openWithdrawModal() {
    const modal = document.getElementById('withdraw-modal');
    if (modal) {
        modal.style.display = 'flex';
        // entrance animation
        modal.querySelector('div').style.transform = 'scale(0.9)';
        modal.querySelector('div').style.opacity = '0';
        setTimeout(() => {
            modal.querySelector('div').style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            modal.querySelector('div').style.transform = 'scale(1)';
            modal.querySelector('div').style.opacity = '1';
        }, 10);
    }
}

function closeWithdrawModal() {
    const modal = document.getElementById('withdraw-modal');
    if (modal) {
        modal.querySelector('div').style.transform = 'scale(0.9)';
        modal.querySelector('div').style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}

window.handleWithdrawRequest = async function(e) {
    e.preventDefault();
    const amount = document.getElementById('withdraw-amount').value;
    const method = document.getElementById('withdraw-method').value;
    const details = document.getElementById('withdraw-details').value;
    
    const user = JSON.parse(localStorage.getItem('csgo_user'));
    
    if (amount < 500) {
        showToast('Minimum withdraw amount is ?500', 'error');
        return;
    }
    
    if (amount > (user.wallet_balance || 0)) {
        showToast('Insufficient balance', 'error');
        return;
    }
    
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    btn.disabled = true;
    
    try {
        const response = await apiFetch('https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/request-payout', {
            method: 'POST',
            body: JSON.stringify({
                phone: user.phone,
                amount: parseFloat(amount),
                method: method,
                details: details
            })
        });
        
        if (response.ok) {
            showToast('Withdrawal request submitted successfully!', 'success');
            closeWithdrawModal();
            // Update user balance locally
            user.wallet_balance = (user.wallet_balance || 0) - parseFloat(amount);
            localStorage.setItem('csgo_user', JSON.stringify(user));
            renderAccount();
        } else {
            const err = await response.json();
            throw new Error(err.error || 'Failed to submit request');
        }
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};

"""

# Append to the end of script.js
content += "\n" + new_functions

with open('c:/Users/CS/OneDrive/Desktop/CSGO APP/script.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Added helper functions to script.js")
