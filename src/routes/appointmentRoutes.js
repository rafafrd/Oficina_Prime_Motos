const express = require('express');

const {
  listAppointments,
  createAppointmentHandler,
  updateAppointmentHandler
} = require('../controllers/appointmentController');
const { requireAuth, requireRoles } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(requireAuth);
router.get('/', listAppointments);
router.post('/', requireRoles('client', 'employee'), createAppointmentHandler);
router.put('/:id', requireRoles('employee'), updateAppointmentHandler);

module.exports = router;
