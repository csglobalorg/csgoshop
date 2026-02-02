const express = require('express');
const productController = require('../controllers/productController');
const authMiddleware = require('../middleware/auth');
const { requireSuperAdmin } = require('../middleware/rbac');
const router = express.Router();

router.get('/', authMiddleware, productController.getProducts);
router.get('/:id', authMiddleware, productController.getProduct);

// Admin only
router.post('/', authMiddleware, requireSuperAdmin, productController.createProduct);
router.put('/:id', authMiddleware, requireSuperAdmin, productController.updateProduct);
router.delete('/:id', authMiddleware, requireSuperAdmin, productController.deleteProduct);

module.exports = router;
