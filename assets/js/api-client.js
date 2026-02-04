// API Configuration
// CHANGE THIS TO YOUR PRODUCTION BACKEND URL WHEN DEPLOYING
const PROD_API_BASE_URL = 'https://your-backend.onrender.com/api'; // Replace with actual backend URL
const storedApiBaseUrl = localStorage.getItem('apiBaseUrl');
const API_BASE_URL = storedApiBaseUrl || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : PROD_API_BASE_URL);

class CSGOAPI {
  constructor() {
    this.token = localStorage.getItem('authToken');
  }

  // Helper method for API calls
  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API Error');
    }

    return response.json();
  }

  // ===== AUTH =====
  async register(email, password, name) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name })
    });
    this.token = data.token;
    localStorage.setItem('authToken', data.token);
    return data;
  }

  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.token = data.token;
    localStorage.setItem('authToken', data.token);
    return data;
  }

  async getMe() {
    return this.request('/auth/me');
  }

  logout() {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  // ===== PRODUCTS =====
  async getProducts(category = null, search = null) {
    let query = '/products';
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    if (params.toString()) query += '?' + params.toString();

    return this.request(query);
  }

  async getProduct(id) {
    return this.request(`/products/${id}`);
  }

  async createProduct(data) {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateProduct(id, data) {
    return this.request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteProduct(id) {
    return this.request(`/products/${id}`, {
      method: 'DELETE'
    });
  }

  // ===== ORDERS =====
  async createOrder(items, deliveryAddress, paymentMethod, phone) {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify({
        items,
        delivery_address: deliveryAddress,
        payment_method: paymentMethod,
        phone
      })
    });
  }

  async getOrders() {
    return this.request('/orders');
  }

  async getOrder(id) {
    return this.request(`/orders/${id}`);
  }

  async submitPayment(orderId, txnId) {
    return this.request(`/orders/${orderId}/submit-payment`, {
      method: 'POST',
      body: JSON.stringify({ txn_id: txnId })
    });
  }

  async verifyPayment(orderId, verified, notes = '') {
    return this.request(`/orders/${orderId}/verify-payment`, {
      method: 'POST',
      body: JSON.stringify({ verified, notes })
    });
  }

  async updateOrderStatus(orderId, status) {
    return this.request(`/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }

  // ===== UTILITY =====
  isAuthenticated() {
    return !!this.token;
  }

  isAdmin() {
    const user = this.getCurrentUser();
    return user && ['super_admin', 'internal_member'].includes(user.role);
  }

  isSuperAdmin() {
    const user = this.getCurrentUser();
    return user && user.role === 'super_admin';
  }

  getCurrentUser() {
    const token = localStorage.getItem('authToken');
    if (!token) return null;

    try {
      // Decode JWT (basic decoding, no verification)
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload;
    } catch {
      return null;
    }
  }
}

// Export singleton
const api = new CSGOAPI();
window.api = api;

