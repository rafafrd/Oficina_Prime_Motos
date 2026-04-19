const express = require('express');

const { listSupplierOrderHandler } = require('../controllers/partController');
const { requireAuth, requireRoles } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(requireAuth);
router.get('/orders', requireRoles('supplier'), listSupplierOrderHandler);

module.exports = router;
