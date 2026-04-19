const {
  ORDER_STATUS_FLOW,
  APPOINTMENT_STATUSES
} = require('../utils/constants');
const {
  getOrderById,
  createMotorcycle,
  createOrder,
  createAppointment,
  updateOrderRecord,
  updateOrderStatus,
  insertHistory,
  replaceOrderParts,
  replaceLaborEntries,
  upsertApproval,
  recalculateOrderTotals,
  generateOrderCode
} = require('../models/orderModel');
const { getPartById } = require('../models/partModel');
const { createError } = require('../utils/http');
const {
  sanitizeBoolean,
  sanitizeNumber,
  sanitizeText
} = require('../utils/sanitize');

function validateStatus(status) {
  if (!ORDER_STATUS_FLOW.includes(status)) {
    throw createError(400, 'Status da ordem inválido.');
  }
}

function validateAppointmentStatus(status) {
  if (!APPOINTMENT_STATUSES.includes(status)) {
    throw createError(400, 'Status do agendamento inválido.');
  }
}

function ensureOrderAccess(order, user) {
  if (!order) {
    throw createError(404, 'Ordem de serviço não encontrada.');
  }

  if (user.role === 'employee') {
    return order;
  }

  if (user.role === 'client' && order.client_id === user.profile.client_id) {
    return order;
  }

  const supplierHasPart = order.parts?.some(
    (part) => Number(part.supplier_id) === Number(user.profile.supplier_id)
  );
  if (user.role === 'supplier' && supplierHasPart) {
    return order;
  }

  throw createError(403, 'Você não possui acesso a esta ordem.');
}

async function createServiceOrder(payload, user) {
  const clientId = user.role === 'client' ? user.profile.client_id : sanitizeNumber(payload.client_id);

  if (!clientId) {
    throw createError(400, 'Cliente da solicitação é obrigatório.');
  }

  const motorcycleId =
    payload.motorcycle_id ||
    (await createMotorcycle({
      client_id: clientId,
      brand: sanitizeText(payload.brand, 80),
      model: sanitizeText(payload.model, 80),
      year: sanitizeNumber(payload.year),
      plate: sanitizeText(payload.plate, 20),
      color: sanitizeText(payload.color, 40),
      notes: sanitizeText(payload.motorcycle_notes, 250)
    }));

  const code = await generateOrderCode();
  const orderId = await createOrder({
    code,
    client_id: clientId,
    motorcycle_id: motorcycleId,
    assigned_employee_id: user.role === 'employee' ? user.profile.employee_id : null,
    preferred_date: payload.preferred_date,
    scheduled_date: payload.preferred_date,
    reported_issue: sanitizeText(payload.reported_issue, 500),
    diagnosis: '',
    current_status: ORDER_STATUS_FLOW[0],
    budget_amount: 0
  });

  await createAppointment({
    service_order_id: orderId,
    client_id: clientId,
    preferred_date: payload.preferred_date,
    scheduled_date: payload.preferred_date,
    status: 'Solicitado',
    notes: sanitizeText(payload.appointment_notes || payload.reported_issue, 250),
    created_by_user_id: user.id,
    updated_by_user_id: user.id
  });

  await insertHistory({
    service_order_id: orderId,
    user_id: user.id,
    previous_status: null,
    new_status: ORDER_STATUS_FLOW[0],
    note: 'Solicitação criada pelo portal.'
  });

  return getOrderById(orderId);
}

async function updateServiceOrder(orderId, payload, user) {
  const currentOrder = ensureOrderAccess(await getOrderById(orderId), user);

  if (user.role === 'supplier') {
    throw createError(403, 'Fornecedor não pode editar ordens.');
  }

  const nextRecord = {
    assigned_employee_id:
      user.role === 'employee'
        ? sanitizeNumber(payload.assigned_employee_id, user.profile.employee_id)
        : currentOrder.assigned_employee_id,
    preferred_date: payload.preferred_date || currentOrder.preferred_date,
    scheduled_date: payload.scheduled_date || currentOrder.scheduled_date,
    reported_issue:
      user.role === 'employee'
        ? sanitizeText(payload.reported_issue || currentOrder.reported_issue, 500)
        : currentOrder.reported_issue,
    diagnosis:
      user.role === 'employee'
        ? sanitizeText(payload.diagnosis || currentOrder.diagnosis, 600)
        : currentOrder.diagnosis,
    budget_amount:
      user.role === 'employee'
        ? sanitizeNumber(payload.budget_amount, currentOrder.budget_amount)
        : currentOrder.budget_amount,
    signature_name: currentOrder.signature_name,
    signature_accepted_at: currentOrder.signature_accepted_at
  };

  if (user.role === 'client' && payload.signature_name) {
    nextRecord.signature_name = sanitizeText(payload.signature_name, 120);
    nextRecord.signature_accepted_at = new Date().toISOString();
    await upsertApproval(orderId, {
      accepted: sanitizeBoolean(payload.accepted),
      signed_by: nextRecord.signature_name,
      signed_at: nextRecord.signature_accepted_at,
      notes: sanitizeText(payload.acceptance_notes, 250)
    });
  }

  await updateOrderRecord(orderId, nextRecord);

  if (user.role === 'employee') {
    if (Array.isArray(payload.parts)) {
      const normalizedParts = [];

      for (const inputPart of payload.parts) {
        const partId = sanitizeNumber(inputPart.part_id);
        const existingPart = await getPartById(partId);

        if (!existingPart) {
          throw createError(400, `Peça ${partId} não encontrada.`);
        }

        const quantity = sanitizeNumber(inputPart.quantity, 1);
        const unitPrice = sanitizeNumber(inputPart.unit_price, Number(existingPart.unit_price));

        normalizedParts.push({
          part_id: partId,
          quantity,
          unit_price: unitPrice,
          line_total: quantity * unitPrice
        });
      }

      await replaceOrderParts(orderId, normalizedParts);
    }

    if (Array.isArray(payload.labor_entries)) {
      const normalizedLabor = payload.labor_entries.map((entry) => {
        const hours = sanitizeNumber(entry.hours);
        const hourlyRate = sanitizeNumber(entry.hourly_rate);

        return {
          employee_id: user.profile.employee_id,
          description: sanitizeText(entry.description, 250),
          hours,
          hourly_rate: hourlyRate,
          total_price: hours * hourlyRate
        };
      });

      await replaceLaborEntries(orderId, normalizedLabor);
    }

    await recalculateOrderTotals(orderId);

    const noteParts = [];
    if (payload.diagnosis) noteParts.push('diagnóstico atualizado');
    if (payload.budget_amount !== undefined) noteParts.push('orçamento atualizado');
    if (payload.parts) noteParts.push('peças revisadas');
    if (payload.labor_entries) noteParts.push('mão de obra revisada');

    if (noteParts.length) {
      await insertHistory({
        service_order_id: orderId,
        user_id: user.id,
        previous_status: currentOrder.current_status,
        new_status: currentOrder.current_status,
        note: `Atualização interna: ${noteParts.join(', ')}.`
      });
    }
  }

  return getOrderById(orderId);
}

async function changeOrderStatus(orderId, nextStatus, note, user) {
  if (user.role !== 'employee') {
    throw createError(403, 'Somente funcionários podem alterar o status.');
  }

  validateStatus(nextStatus);
  const order = await getOrderById(orderId);
  ensureOrderAccess(order, user);

  const currentIndex = ORDER_STATUS_FLOW.indexOf(order.current_status);
  const nextIndex = ORDER_STATUS_FLOW.indexOf(nextStatus);

  if (nextIndex < currentIndex) {
    throw createError(400, 'Não é permitido regredir o fluxo da ordem.');
  }

  await updateOrderStatus(orderId, nextStatus);
  await insertHistory({
    service_order_id: orderId,
    user_id: user.id,
    previous_status: order.current_status,
    new_status: nextStatus,
    note: sanitizeText(note || 'Status atualizado pela equipe.', 250)
  });

  return getOrderById(orderId);
}

async function addManualHistory(orderId, note, user) {
  const order = ensureOrderAccess(await getOrderById(orderId), user);

  if (!sanitizeText(note, 250)) {
    throw createError(400, 'Informe uma observação para o histórico.');
  }

  await insertHistory({
    service_order_id: orderId,
    user_id: user.id,
    previous_status: order.current_status,
    new_status: order.current_status,
    note: sanitizeText(note, 250)
  });

  return getOrderById(orderId);
}

module.exports = {
  validateStatus,
  validateAppointmentStatus,
  ensureOrderAccess,
  createServiceOrder,
  updateServiceOrder,
  changeOrderStatus,
  addManualHistory
};
