const express = require('express');
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/auth');
const { requireSuperAdmin, requireAdmin } = require('../middleware/rbac');
const router = express.Router();

router.post('/', authMiddleware, orderController.createOrder);
router.get('/', authMiddleware, orderController.getOrders);
router.get('/:id', authMiddleware, orderController.getOrder);

// Customer - submit payment
router.post('/:id/submit-payment', authMiddleware, orderController.submitPayment);

// Admin - verify payment
router.post('/:id/verify-payment', authMiddleware, requireSuperAdmin, orderController.verifyPayment);

// Admin - update status
router.put('/:id/status', authMiddleware, requireAdmin, orderController.updateOrderStatus);

module.exports = router;
