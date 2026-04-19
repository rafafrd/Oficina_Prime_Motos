const express = require('express');

const {
  listParts,
  createPartHandler
} = require('../controllers/partController');
const { requireAuth, requireRoles } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(requireAuth);
router.get('/', requireRoles('employee', 'supplier'), listParts);
router.post('/', requireRoles('employee'), createPartHandler);

module.exports = router;
