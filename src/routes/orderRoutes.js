const express = require('express');

const {
  listOrders,
  getOrder,
  createOrderHandler,
  updateOrderHandler,
  updateStatusHandler,
  addHistoryHandler
} = require('../controllers/orderController');
const { requireAuth, requireRoles } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(requireAuth);
router.get('/', requireRoles('client', 'employee'), listOrders);
router.get('/:id', requireRoles('client', 'employee'), getOrder);
router.post('/', requireRoles('client', 'employee'), createOrderHandler);
router.put('/:id', requireRoles('client', 'employee'), updateOrderHandler);
router.patch('/:id/status', requireRoles('employee'), updateStatusHandler);
router.post('/:id/history', requireRoles('client', 'employee'), addHistoryHandler);

module.exports = router;
