// Authentication UI Helper
class AuthUI {
  // Show login modal
  static showLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
      const bootstrapModal = new bootstrap.Modal(modal);
      bootstrapModal.show();
    }
  }

  // Update UI based on auth status
  static updateUI() {
    const isAuth = api.isAuthenticated();
    const user = api.getCurrentUser();

    // Hide login button, show user menu
    const loginBtn = document.getElementById('loginBtn');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');

    if (loginBtn && userMenu) {
      if (isAuth) {
        loginBtn?.classList.add('d-none');
        userMenu?.classList.remove('d-none');
        if (userName) userName.textContent = user?.email || 'User';
      } else {
        loginBtn?.classList.remove('d-none');
        userMenu?.classList.add('d-none');
      }
    }

    // Show admin links only for admins
    const adminLinks = document.querySelectorAll('[data-admin-only]');
    adminLinks.forEach(link => {
      if (api.isAdmin()) {
        link.classList.remove('d-none');
      } else {
        link.classList.add('d-none');
      }
    });
  }

  // Handle login form
  static setupLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = form.querySelector('[name="email"]').value;
      const password = form.querySelector('[name="password"]').value;

      try {
        const response = await api.login(email, password);

        // CHECK ROLE AND SAVE ADMIN STATUS
        const role = response.user.role;
        if (role === 'super_admin' || role === 'internal_member') {
          localStorage.setItem('isAdmin', 'true');
          localStorage.setItem('adminEmail', email); // dashboard/index.html expects this
        } else {
          localStorage.removeItem('isAdmin');
          localStorage.removeItem('adminEmail');
        }

        alert('Login successful!');
        form.reset();

        // Handle modal if present
        const modalEl = document.getElementById('loginModal');
        if (modalEl) {
          bootstrap.Modal.getInstance(modalEl).hide();
        }

        this.updateUI();

        // Redirect to dashboard if admin
        if (role === 'super_admin' || role === 'internal_member') {
          if (confirm('Go to Admin Dashboard?')) {
            window.location.href = '/dashboard/index.html';
          } else {
            if (window.location.pathname.includes('signin.html')) {
              window.location.href = '../index.html';
            }
          }
        } else {
          // Redirect user if on signin page
          if (window.location.pathname.includes('signin.html')) {
            window.location.href = '../index.html';
          }
        }

      } catch (error) {
        alert('Login failed: ' + error.message);
      }
    });
  }

  // Handle signup form
  static setupSignupForm() {
    const form = document.getElementById('signupForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = form.querySelector('[id="fullName"]')?.value || 'User';
      const email = form.querySelector('[id="formSignupEmail"]')?.value || form.querySelector('[type="email"]')?.value;
      const password = form.querySelector('[id="formSignupPassword"]')?.value || form.querySelector('[type="password"]')?.value;

      if (!email || !password) {
        alert('Please fill in all required fields.');
        return;
      }

      try {
        await api.register(email, password, name);
        alert('Registration successful! Please login.');
        form.reset();
        window.location.href = 'signin.html';
      } catch (error) {
        alert('Registration failed: ' + error.message);
      }
    });
  }

  // Handle logout
  static setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        api.logout();
        // CLEAR ADMIN KEYS
        localStorage.removeItem('isAdmin');
        localStorage.removeItem('adminEmail');

        this.updateUI();
        window.location.href = '/index.html';
      });
    }
  }

  static init() {
    this.updateUI();
    this.setupLoginForm();
    this.setupSignupForm();
    this.setupLogout();

    // Update UI when returning to page
    window.addEventListener('focus', () => this.updateUI());
  }
}

// Products UI Helper
class ProductsUI {
  static displayProduct(product) {
    const user = api.getCurrentUser();
    let html = `
      <div class="col-md-6 col-lg-4 mb-4">
        <div class="card">
          <img src="${product.images?.[0] || '/assets/images/placeholder.jpg'}" class="card-img-top" alt="${product.name}">
          <div class="card-body">
            <h5 class="card-title">${product.name}</h5>
            <p class="card-text">${product.description?.substring(0, 100)}...</p>
            
            <div class="price-section">
              <span class="h5">৳ ${product.sell_price.toFixed(2)}</span>
    `;

    // Show factory price for admins
    if (user && ['super_admin', 'internal_member'].includes(user.role)) {
      html += `
        <br>
        <small class="text-muted">
          Factory: ৳ ${product.factory_price.toFixed(2)}<br>
          Profit: ৳ ${product.profit.toFixed(2)} (${product.profit_percentage}%)
        </small>
      `;
    }

    html += `
            </div>
            
            <div class="mt-3">
              <button class="btn btn-primary btn-sm" onclick="addToCart('${product.id}')">
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    return html;
  }

  static async loadProducts(category = null, search = null) {
    const container = document.getElementById('productsContainer');
    if (!container) return;

    try {
      container.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div></div>';
      const products = await api.getProducts(category, search);

      container.innerHTML = products.map(p => this.displayProduct(p)).join('');
    } catch (error) {
      container.innerHTML = `<div class="alert alert-danger">Error loading products: ${error.message}</div>`;
    }
  }
}

// Cart UI Helper
class CartUI {
  static init() {
    window.addToCart = (productId) => {
      let cart = JSON.parse(localStorage.getItem('cart') || '[]');
      const item = cart.find(i => i.product_id === productId);

      if (item) {
        item.quantity += 1;
      } else {
        cart.push({ product_id: productId, quantity: 1 });
      }

      localStorage.setItem('cart', JSON.stringify(cart));
      alert('Added to cart!');
      this.updateCartBadge();
    };

    this.updateCartBadge();
  }

  static updateCartBadge() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const badge = document.getElementById('cartBadge');
    if (badge) {
      badge.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
    }
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  AuthUI.init();
  CartUI.init();
  ProductsUI.loadProducts();
});
