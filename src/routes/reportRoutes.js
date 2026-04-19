const express = require('express');

const { listReports, getOrderReport } = require('../controllers/reportController');
const { requireAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(requireAuth);
router.get('/orders', listReports);
router.get('/orders/:id', getOrderReport);

module.exports = router;
