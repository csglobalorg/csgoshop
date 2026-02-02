const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

// Helmet for security headers
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:']
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});

// CSRF Token generation
const csrfTokenMiddleware = (req, res, next) => {
  req.csrfToken = uuidv4();
  res.locals.csrfToken = req.csrfToken;
  next();
};

// CSRF Token validation
const validateCsrfToken = (req, res, next) => {
  const token = req.body.csrfToken || req.headers['x-csrf-token'];
  
  if (!token || token !== req.csrfToken) {
    return res.status(403).json({ error: 'CSRF token validation failed' });
  }
  
  next();
};

// Input sanitization
const sanitizeInput = (req, res, next) => {
  const sanitize = (str) => {
    if (typeof str !== 'string') return str;
    return str
      .replace(/[<>]/g, '')
      .trim();
  };

  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitize(req.body[key]);
      }
    });
  }

  next();
};

module.exports = {
  securityHeaders,
  loginLimiter,
  apiLimiter,
  csrfTokenMiddleware,
  validateCsrfToken,
  sanitizeInput
};
