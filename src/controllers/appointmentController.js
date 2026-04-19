const { listAppointmentsForUser, getAppointmentById, updateAppointment } = require('../models/appointmentModel');
const { getOrderById } = require('../models/orderModel');
const { createAppointment } = require('../models/orderModel');
const { validateAppointmentStatus, ensureOrderAccess } = require('../services/orderService');
const { createError, asyncHandler, ok } = require('../utils/http');
const { sanitizeText } = require('../utils/sanitize');

const listAppointments = asyncHandler(async (req, res) => {
  const appointments = await listAppointmentsForUser(req.currentUser);
  ok(res, appointments);
});

const createAppointmentHandler = asyncHandler(async (req, res) => {
  const serviceOrderId = Number(req.body.service_order_id);
  const order = await getOrderById(serviceOrderId);
  ensureOrderAccess(order, req.currentUser);
  validateAppointmentStatus(req.body.status || 'Solicitado');

  const appointmentId = await createAppointment({
    service_order_id: serviceOrderId,
    client_id: order.client_id,
    preferred_date: req.body.preferred_date,
    scheduled_date: req.body.scheduled_date || req.body.preferred_date,
    status: req.body.status || 'Solicitado',
    notes: sanitizeText(req.body.notes, 250),
    created_by_user_id: req.currentUser.id,
    updated_by_user_id: req.currentUser.id
  });

  const appointment = await getAppointmentById(appointmentId);
  ok(res, appointment, 201);
});

const updateAppointmentHandler = asyncHandler(async (req, res) => {
  if (req.currentUser.role !== 'employee') {
    throw createError(403, 'Somente funcionários podem ajustar agendamentos.');
  }

  const appointment = await getAppointmentById(Number(req.params.id));

  if (!appointment) {
    throw createError(404, 'Agendamento não encontrado.');
  }

  validateAppointmentStatus(req.body.status || appointment.status);

  const updated = await updateAppointment(appointment.id, {
    preferred_date: req.body.preferred_date || appointment.preferred_date,
    scheduled_date: req.body.scheduled_date || appointment.scheduled_date,
    status: req.body.status || appointment.status,
    notes: sanitizeText(req.body.notes || appointment.notes, 250),
    updated_by_user_id: req.currentUser.id
  });

  ok(res, updated);
});

module.exports = {
  listAppointments,
  createAppointmentHandler,
  updateAppointmentHandler
};
