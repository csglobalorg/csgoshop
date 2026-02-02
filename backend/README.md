# CSGO SHOP Backend - Complete Setup Guide

## 🚀 Installation

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Setup Environment
```bash
# Copy example file
cp .env.example .env

# Edit .env with your Supabase credentials
```

### 3. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. In SQL Editor, paste the contents of `migrations/001_initial_schema.sql`
4. Get your credentials:
   - SUPABASE_URL: Project URL
   - SUPABASE_ANON_KEY: Anon key
   - SUPABASE_SERVICE_ROLE_KEY: Service role key

### 4. Update .env
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-32-character-secret-key-min
PORT=5000
```

### 5. Start Server
```bash
# Development
npm run dev

# Production
npm start
```

Server runs on `http://localhost:5000`

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Products
- `GET /api/products` - List products (with role-based pricing)
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create (Super Admin only)
- `PUT /api/products/:id` - Update (Super Admin only)
- `DELETE /api/products/:id` - Delete (Super Admin only)

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders` - List orders (role-based)
- `GET /api/orders/:id` - Get order details
- `POST /api/orders/:id/submit-payment` - Submit TXN ID
- `POST /api/orders/:id/verify-payment` - Verify payment (Super Admin)
- `PUT /api/orders/:id/status` - Update status (Admin)

---

## 🔐 Security Features

✅ **Password Hashing** - bcryptjs with 10 rounds
✅ **JWT Authentication** - 7-day expiry
✅ **Rate Limiting** - 5 login attempts per 15 min
✅ **CSRF Protection** - Token-based
✅ **SQL Injection Prevention** - Parameterized queries
✅ **XSS Protection** - Input sanitization
✅ **CORS** - Whitelist domains
✅ **Security Headers** - Helmet middleware
✅ **Role-Based Access** - 3-tier permission system

---

## 👥 Roles

### 🔑 Super Admin
- Full system access
- Create/edit/delete products
- View factory & sell prices
- Auto profit calculation
- Manual payment verification
- Member management

### 👤 Internal Member
- View factory & sell prices
- See profits
- Help with order processing
- Limited permissions

### 🛒 Public User
- Browse products (sell price only)
- Place orders
- Submit payments
- Track orders

---

## 💳 Payment Methods

Orders support manual payment via:
1. **bKash** - Mobile banking
2. **Nagad** - Mobile banking
3. **Rocket** - Mobile banking
4. **Bank Transfer** - Direct transfer

Flow:
1. Customer creates order
2. Gets payment instructions
3. Makes payment
4. Submits TXN ID
5. Super Admin verifies
6. Order status updates

---

## 🔗 Frontend Integration

See `frontend/` folder for integration examples

```javascript
// Example: Login
const response = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com', password: '****' })
});

const { token } = await response.json();
localStorage.setItem('authToken', token);
```

---

## 📝 Environment Variables

| Variable | Description |
|----------|-------------|
| SUPABASE_URL | Supabase project URL |
| SUPABASE_ANON_KEY | Public anon key |
| JWT_SECRET | Secret for JWT signing (min 32 chars) |
| PORT | Server port (default: 5000) |
| JWT_EXPIRE | Token expiry (default: 7d) |
| BCRYPT_ROUNDS | Password hashing rounds (default: 10) |
| NODE_ENV | development/production |

---

## 🆘 Troubleshooting

**Port already in use:**
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

**Supabase connection failed:**
- Check SUPABASE_URL and keys in .env
- Ensure network/VPN allows Supabase

**JWT errors:**
- Verify JWT_SECRET length (min 32 chars)
- Check token expiry

---

## 📞 Support

For issues, check logs in console and verify:
1. Supabase tables created
2. Environment variables set
3. Node.js version >= 14
4. Port not in use

