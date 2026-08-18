import re

with open('c:/Users/CS/OneDrive/Desktop/CSGO APP/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the start of the else block
start_idx = content.find("} else {\n        const identifier")
if start_idx == -1:
    print("Could not find start index")
    exit(1)

# Find the end of renderAccount
end_idx = content.find("fetchWalletTransactions();\n        renderDashboardWishlist();\n    }\n}", start_idx)
if end_idx == -1:
    print("Could not find end index")
    exit(1)
end_idx += len("fetchWalletTransactions();\n        renderDashboardWishlist();\n    }\n}")

# We will replace everything from start_idx to end_idx with our new Dashboard HTML.
new_else_block = """} else {
        const identifier = user.username || user.phone;
        const refLink = window.location.origin + window.location.pathname + '?ref=' + identifier;
        const earnings = localStorage.getItem('csgo_earnings_' + identifier) || 0;
        const clicks = localStorage.getItem('csgo_clicks_' + identifier) || 0;
        
        mainContent.innerHTML = `
<div class="container page-content" style="max-width: 900px; margin: 0 auto; padding-top: 20px;">
    
    <!-- 1. Compact Profile Header -->
    <div class="dashboard-header">
        <div class="dashboard-avatar">${user.name ? user.name.charAt(0).toUpperCase() : 'U'}</div>
        <div>
            <h2 style="margin: 0 0 5px 0; font-size: 1.5rem; color: white;">${user.name || 'User'} <i class="fas fa-check-circle" style="color: #3DDC84; font-size: 1rem;" title="Verified"></i></h2>
            <p style="margin: 0; color: var(--text-light); font-size: 0.9rem;">${user.email || user.phone || ''}</p>
            <div style="display: flex; gap: 10px; margin-top: 10px;">
                ${(user.role === 'admin' || user.phone === '01873827520') ? `<button class="btn btn-sm" onclick="navigateTo('admin')" style="background: var(--accent-gradient); color: var(--bg-dark);"><i class="fas fa-shield-alt"></i> Admin Panel</button>` : ''}
                <button class="btn btn-sm btn-outline" onclick="openEditProfileModal()"><i class="fas fa-user-edit"></i> Edit Profile</button>
                <button class="btn btn-sm btn-outline" onclick="logout()" style="border-color: rgba(239, 68, 68, 0.3); color: #ef4444;"><i class="fas fa-sign-out-alt"></i> Logout</button>
            </div>
        </div>
        <div class="profile-completion">
            <div style="color: white; font-weight: bold; font-size: 0.9rem;">85% Complete Profile</div>
            <div class="progress-bar-bg"><div class="progress-bar-fill" style="width: 85%;"></div></div>
        </div>
    </div>

    <!-- 2. Quick Stats Grid (4 Cards) -->
    <div class="quick-stats-grid">
        <div class="stat-card-premium" onclick="document.getElementById('wallet-history-section').scrollIntoView({behavior: 'smooth'})">
            <div class="stat-icon" style="background: rgba(245, 166, 35, 0.1); color: var(--accent-color);">
                <i class="fas fa-wallet"></i>
            </div>
            <div>
                <div style="color: var(--text-light); font-size: 0.8rem; margin-bottom: 5px;">Available Balance</div>
                <div style="color: white; font-size: 1.3rem; font-weight: bold;">?${user.wallet_balance || 0}</div>
            </div>
        </div>
        
        <div class="stat-card-premium" onclick="document.getElementById('orders-list-section').scrollIntoView({behavior: 'smooth'})">
            <div class="stat-icon" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6;">
                <i class="fas fa-box-open"></i>
            </div>
            <div>
                <div style="color: var(--text-light); font-size: 0.8rem; margin-bottom: 5px;">Total Orders</div>
                <div style="color: white; font-size: 1.3rem; font-weight: bold;" id="dashboard-total-orders">-</div>
            </div>
        </div>
        
        <div class="stat-card-premium" onclick="document.getElementById('affiliate-section').scrollIntoView({behavior: 'smooth'})">
            <div class="stat-icon" style="background: rgba(16, 185, 129, 0.1); color: #10b981;">
                <i class="fas fa-users"></i>
            </div>
            <div>
                <div style="color: var(--text-light); font-size: 0.8rem; margin-bottom: 5px;">Affiliate Earned</div>
                <div style="color: white; font-size: 1.3rem; font-weight: bold;" id="dashboard-affiliate-earned">?${earnings}</div>
            </div>
        </div>
        
        <div class="stat-card-premium" onclick="document.getElementById('wishlist-section').scrollIntoView({behavior: 'smooth'})">
            <div class="stat-icon" style="background: rgba(239, 68, 68, 0.1); color: #ef4444;">
                <i class="fas fa-heart"></i>
            </div>
            <div>
                <div style="color: var(--text-light); font-size: 0.8rem; margin-bottom: 5px;">Wishlist</div>
                <div style="color: white; font-size: 1.3rem; font-weight: bold;" id="dashboard-wishlist-count">-</div>
            </div>
        </div>
    </div>

    <!-- 3. Recent Orders & Notifications Grid -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; margin-bottom: 30px;">
        
        <!-- Recent Orders -->
        <div id="orders-list-section" style="background: var(--bg-card); padding: 25px; border-radius: 16px; border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-shopping-bag" style="color: var(--accent-color);"></i> Recent Orders
                </h3>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; background: rgba(0,0,0,0.2); padding: 15px; border-radius: 12px; border: 1px solid var(--border-color);">
                <div style="text-align: center; cursor: pointer;">
                    <div style="color: #f59e0b; font-size: 1.5rem; margin-bottom: 5px;"><i class="fas fa-clock"></i></div>
                    <div style="font-size: 0.8rem; color: var(--text-light);">Pending</div>
                </div>
                <div style="text-align: center; cursor: pointer;">
                    <div style="color: #3b82f6; font-size: 1.5rem; margin-bottom: 5px;"><i class="fas fa-truck"></i></div>
                    <div style="font-size: 0.8rem; color: var(--text-light);">Processing</div>
                </div>
                <div style="text-align: center; cursor: pointer;">
                    <div style="color: #10b981; font-size: 1.5rem; margin-bottom: 5px;"><i class="fas fa-check-circle"></i></div>
                    <div style="font-size: 0.8rem; color: var(--text-light);">Delivered</div>
                </div>
                <div style="text-align: center; cursor: pointer;">
                    <div style="color: #ef4444; font-size: 1.5rem; margin-bottom: 5px;"><i class="fas fa-undo"></i></div>
                    <div style="font-size: 0.8rem; color: var(--text-light);">Returns</div>
                </div>
            </div>

            <div id="dashboard-orders-list">
                <p style="color: var(--text-light); font-size: 0.9rem; text-align: center; padding: 20px;">Loading orders...</p>
            </div>
        </div>

        <!-- Notification Center -->
        <div style="background: var(--bg-card); padding: 25px; border-radius: 16px; border: 1px solid var(--border-color); display: flex; flex-direction: column;">
            <h3 style="margin: 0 0 20px 0; display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-bell" style="color: #3b82f6;"></i> Notification Center
            </h3>
            <div id="wallet-history" style="flex-grow: 1; overflow-y: auto; max-height: 300px; padding-right: 5px;">
                <p style="color: var(--text-light); font-size: 0.85rem; text-align: center; padding-top: 20px;">Loading notifications...</p>
            </div>
        </div>
    </div>

    <!-- 4. Affiliate Section (Accordions) -->
    <div id="affiliate-section" style="background: var(--bg-glass); backdrop-filter: blur(10px); padding: 25px; border-radius: 16px; border: 1px solid var(--border-color); margin-bottom: 30px; box-shadow: var(--shadow-md);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="margin: 0; display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-chart-line" style="color: #F5A623;"></i> Affiliate Dashboard
            </h3>
            <div style="background: rgba(245, 166, 35, 0.1); padding: 5px 12px; border-radius: 20px; font-size: 0.8rem; color: #F5A623; border: 1px solid rgba(245, 166, 35, 0.2);">
                Rank: <strong>${user.affiliate_status === 'approved' ? 'Active' : 'Starter'}</strong>
            </div>
        </div>
        
        ${user.affiliate_status === 'approved' ? `
        <!-- Accordion: Overview -->
        <div class="accordion-item">
            <div class="accordion-header" onclick="this.nextElementSibling.classList.toggle('active')">
                <span><i class="fas fa-home" style="width: 20px;"></i> Overview & Quick Share</span>
                <i class="fas fa-chevron-down"></i>
            </div>
            <div class="accordion-content active">
                <p style="color: var(--text-light); font-size: 0.9rem; margin-bottom: 15px;">Share your unique link and earn commission on every purchase!</p>
                <div class="referral-actions">
                    <button class="btn-social btn-copy" onclick="copyToClipboard('${refLink}', 'Link Copied!')"><i class="fas fa-copy"></i> Copy Link</button>
                    <button class="btn-social btn-whatsapp" onclick="window.open('https://api.whatsapp.com/send?text=Check out CSGO SHOP: ${encodeURIComponent(refLink)}', '_blank')"><i class="fab fa-whatsapp"></i> WhatsApp</button>
                    <button class="btn-social btn-facebook" onclick="window.open('https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(refLink)}', '_blank')"><i class="fab fa-facebook-f"></i> Facebook</button>
                    <button class="btn-social btn-telegram" onclick="window.open('https://t.me/share/url?url=${encodeURIComponent(refLink)}', '_blank')"><i class="fab fa-telegram-plane"></i> Telegram</button>
                    <button class="btn-social btn-qr" onclick="alert('QR Code feature coming soon!')"><i class="fas fa-qrcode"></i> QR Code</button>
                </div>
                
                <div style="margin-top: 25px;">
                    <canvas id="earningsChart" style="width: 100%; height: 200px;"></canvas>
                </div>
            </div>
        </div>
        
        <!-- Accordion: Withdraw -->
        <div class="accordion-item" id="wallet-history-section">
            <div class="accordion-header" onclick="this.nextElementSibling.classList.toggle('active')">
                <span><i class="fas fa-money-bill-wave" style="width: 20px;"></i> Withdraw Funds</span>
                <i class="fas fa-chevron-down"></i>
            </div>
            <div class="accordion-content">
                <div style="display: flex; flex-direction: column; gap: 15px;">
                    <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 12px; border: 1px solid var(--border-color);">
                        <h4 style="margin: 0 0 5px 0;">Available to Withdraw</h4>
                        <div style="font-size: 1.5rem; font-weight: bold; color: var(--accent-color);">?${user.wallet_balance || 0}</div>
                        <p style="margin: 5px 0 0 0; font-size: 0.8rem; color: var(--text-light);">Minimum withdraw: ?500</p>
                    </div>
                    <button class="btn" style="width: 100%;" onclick="openWithdrawModal()">Request Withdrawal</button>
                </div>
            </div>
        </div>

        <!-- Accordion: Performance -->
        <div class="accordion-item">
            <div class="accordion-header" onclick="this.nextElementSibling.classList.toggle('active')">
                <span><i class="fas fa-trophy" style="width: 20px;"></i> Performance Tracking</span>
                <i class="fas fa-chevron-down"></i>
            </div>
            <div class="accordion-content">
                <div id="referred-orders-list">
                    <p style="color: var(--text-light); font-size: 0.9rem;">Loading performance data...</p>
                </div>
            </div>
        </div>
        ` : `
        <div style="text-align: center; padding: 30px;">
            <i class="fas fa-rocket" style="font-size: 3rem; color: rgba(245, 166, 35, 0.3); margin-bottom: 15px;"></i>
            <h3>Start Earning Today</h3>
            <p style="color: var(--text-light); font-size: 0.9rem; margin-bottom: 20px;">Join our affiliate program and earn commission on every sale.</p>
            <button class="btn" onclick="applyForAffiliate()">Apply Now</button>
        </div>
        `}
    </div>

    <!-- 5. Wishlist (Minimal Empty State) -->
    <div id="wishlist-section" style="background: var(--bg-card); padding: 25px; border-radius: 16px; border: 1px solid var(--border-color); margin-bottom: 30px;">
        <h3 style="margin: 0 0 20px 0; display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-heart" style="color: #ef4444;"></i> My Wishlist
        </h3>
        <div id="dashboard-wishlist-container">
            <p style="color: var(--text-light); font-size: 0.9rem;">Loading wishlist...</p>
        </div>
    </div>

    <!-- Minimal Dashboard Footer -->
    <div class="minimal-footer">
        <div>&copy; 2026 CSGO SHOP. All rights reserved.</div>
        <div class="minimal-footer-links">
            <a href="#support"><i class="fas fa-headset"></i> Support</a>
            <a href="#help"><i class="fas fa-question-circle"></i> Help Center</a>
            <a href="#report"><i class="fas fa-flag"></i> Report Issue</a>
        </div>
    </div>

</div>

<!-- Modals -->
<!-- Edit Profile Modal -->
<div id="edit-profile-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 1000; justify-content: center; align-items: center; backdrop-filter: blur(5px);">
    <div style="background: var(--bg-light); padding: 30px; border-radius: 12px; width: 90%; max-width: 500px; border: 1px solid var(--border-color); max-height: 90vh; overflow-y: auto;">
        <h3 style="margin-bottom: 20px;">Edit Profile</h3>
        <form onsubmit="window.handleUpdateProfile(event)">
            <div class="form-group">
                <label style="display: block; margin-bottom: 5px; color: var(--text-light);">Full Name</label>
                <input type="text" id="edit-profile-name" value="${user.name || ''}" required style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--secondary-color); color: white; margin-bottom: 15px;">
            </div>
            <div class="form-group">
                <label style="display: block; margin-bottom: 5px; color: var(--text-light);">Username</label>
                <input type="text" id="edit-profile-username" value="${user.username || ''}" style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--secondary-color); color: white; margin-bottom: 15px;">
            </div>
            <div class="form-group">
                <label style="display: block; margin-bottom: 5px; color: var(--text-light);">Email Address</label>
                <input type="email" id="edit-profile-email" value="${user.email || ''}" style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--secondary-color); color: white; margin-bottom: 15px;">
            </div>
            <div class="form-group">
                <label style="display: block; margin-bottom: 5px; color: var(--text-light);">Delivery Address</label>
                <textarea id="edit-profile-address" rows="2" style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--secondary-color); color: white; margin-bottom: 15px;">${user.address || ''}</textarea>
            </div>
            
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button type="submit" class="btn" style="flex: 1;">Save Changes</button>
                <button type="button" class="btn btn-outline" style="flex: 1;" onclick="closeEditProfileModal()">Cancel</button>
            </div>
        </form>
    </div>
</div>

<!-- Withdraw Modal -->
<div id="withdraw-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 1000; justify-content: center; align-items: center; backdrop-filter: blur(5px);">
    <div style="background: var(--bg-light); padding: 30px; border-radius: 12px; width: 90%; max-width: 400px; border: 1px solid var(--border-color);">
        <h3 style="margin-bottom: 20px;">Withdraw Funds</h3>
        <form onsubmit="window.handleWithdrawRequest(event)">
            <div class="form-group">
                <label style="display: block; margin-bottom: 5px; color: var(--text-light);">Amount (Min: ?500)</label>
                <input type="number" id="withdraw-amount" min="500" max="${user.wallet_balance || 0}" required style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--secondary-color); color: white; margin-bottom: 15px;">
            </div>
            <div class="form-group">
                <label style="display: block; margin-bottom: 5px; color: var(--text-light);">Payment Method</label>
                <select id="withdraw-method" required style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--secondary-color); color: white; margin-bottom: 15px;">
                    <option value="bkash">bKash</option>
                    <option value="nagad">Nagad</option>
                    <option value="rocket">Rocket</option>
                    <option value="bank">Bank Transfer</option>
                </select>
            </div>
            <div class="form-group">
                <label style="display: block; margin-bottom: 5px; color: var(--text-light);">Account Details / Number</label>
                <input type="text" id="withdraw-details" required style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--secondary-color); color: white; margin-bottom: 15px;">
            </div>
            
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button type="submit" class="btn" style="flex: 1;">Submit Request</button>
                <button type="button" class="btn btn-outline" style="flex: 1;" onclick="closeWithdrawModal()">Cancel</button>
            </div>
        </form>
    </div>
</div>
        `;
        
        // Fetch all data
        fetchMyOrders(user.phone);
        fetchPayoutHistory(user.phone);
        if (user.affiliate_status === 'approved') {
            fetchReferredOrders(identifier);
            fetchClicks(identifier);
            // Render Graph
            setTimeout(renderAffiliateChart, 500);
        }
        fetchWalletTransactions();
        renderDashboardWishlist();
        
        // Update wishlist count and orders count asynchronously
        updateDashboardCounts(user.phone);
    }
}
"""

content = content[:start_idx] + new_else_block + content[end_idx:]

with open('c:/Users/CS/OneDrive/Desktop/CSGO APP/script.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated script.js successfully")
