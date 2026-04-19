const { getDb } = require('../config/db');

function mapOrderRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    code: row.code,
    client_id: row.client_id,
    motorcycle_id: row.motorcycle_id,
    assigned_employee_id: row.assigned_employee_id,
    preferred_date: row.preferred_date,
    scheduled_date: row.scheduled_date,
    reported_issue: row.reported_issue,
    diagnosis: row.diagnosis,
    current_status: row.current_status,
    budget_amount: Number(row.budget_amount || 0),
    parts_total: Number(row.parts_total || 0),
    labor_total: Number(row.labor_total || 0),
    total_amount: Number(row.total_amount || 0),
    signature_name: row.signature_name,
    signature_accepted_at: row.signature_accepted_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    client_name: row.client_name,
    client_email: row.client_email,
    supplier_company_name: row.supplier_company_name,
    motorcycle: {
      id: row.motorcycle_id,
      brand: row.brand,
      model: row.model,
      year: row.year,
      plate: row.plate,
      color: row.color,
      notes: row.motorcycle_notes
    }
  };
}

function listOrdersQuery(whereClause = '', extraJoin = '') {
  return `
    SELECT DISTINCT
      so.*,
      u.name AS client_name,
      u.email AS client_email,
      m.brand,
      m.model,
      m.year,
      m.plate,
      m.color,
      m.notes AS motorcycle_notes,
      su.company_name AS supplier_company_name
    FROM service_orders so
    INNER JOIN clients c ON c.id = so.client_id
    INNER JOIN users u ON u.id = c.user_id
    INNER JOIN motorcycles m ON m.id = so.motorcycle_id
    LEFT JOIN service_order_parts sop ON sop.service_order_id = so.id
    LEFT JOIN parts p ON p.id = sop.part_id
    LEFT JOIN suppliers su ON su.id = p.supplier_id
    ${extraJoin}
    ${whereClause}
    ORDER BY so.updated_at DESC
  `;
}

async function listOrdersForUser(user) {
  const db = await getDb();

  if (user.role === 'employee') {
    const rows = await db.all(listOrdersQuery());
    return rows.map(mapOrderRow);
  }

  if (user.role === 'client') {
    const rows = await db.all(listOrdersQuery('WHERE so.client_id = ?'), [user.profile.client_id]);
    return rows.map(mapOrderRow);
  }

  const rows = await db.all(
    listOrdersQuery('WHERE p.supplier_id = ?'),
    [user.profile.supplier_id]
  );

  return rows.map(mapOrderRow);
}

async function getOrderById(id) {
  const db = await getDb();
  const order = await db.get(listOrdersQuery('WHERE so.id = ?'), [id]);

  if (!order) {
    return null;
  }

  const history = await db.all(
    `
      SELECT
        h.id,
        h.previous_status,
        h.new_status,
        h.note,
        h.created_at,
        u.name AS actor_name,
        u.role AS actor_role
      FROM service_order_history h
      INNER JOIN users u ON u.id = h.user_id
      WHERE h.service_order_id = ?
      ORDER BY h.created_at ASC
    `,
    [id]
  );

  const parts = await db.all(
    `
      SELECT
        sop.id,
        sop.quantity,
        sop.unit_price,
        sop.line_total,
        p.id AS part_id,
        p.supplier_id,
        p.name,
        p.sku,
        su.company_name AS supplier_name
      FROM service_order_parts sop
      INNER JOIN parts p ON p.id = sop.part_id
      LEFT JOIN suppliers su ON su.id = p.supplier_id
      WHERE sop.service_order_id = ?
      ORDER BY sop.id ASC
    `,
    [id]
  );

  const laborEntries = await db.all(
    `
      SELECT
        le.id,
        le.description,
        le.hours,
        le.hourly_rate,
        le.total_price,
        u.name AS employee_name
      FROM labor_entries le
      LEFT JOIN employees e ON e.id = le.employee_id
      LEFT JOIN users u ON u.id = e.user_id
      WHERE le.service_order_id = ?
      ORDER BY le.id ASC
    `,
    [id]
  );

  const appointments = await db.all(
    `
      SELECT *
      FROM appointments
      WHERE service_order_id = ?
      ORDER BY updated_at DESC
    `,
    [id]
  );

  const approval = await db.get(
    `
      SELECT *
      FROM approvals_or_signatures
      WHERE service_order_id = ?
    `,
    [id]
  );

  return {
    ...mapOrderRow(order),
    history,
    parts: parts.map((part) => ({
      ...part,
      quantity: Number(part.quantity),
      unit_price: Number(part.unit_price),
      line_total: Number(part.line_total)
    })),
    labor_entries: laborEntries.map((entry) => ({
      ...entry,
      hours: Number(entry.hours),
      hourly_rate: Number(entry.hourly_rate),
      total_price: Number(entry.total_price)
    })),
    appointments,
    approval
  };
}

async function createMotorcycle(payload) {
  const db = await getDb();
  const result = await db.run(
    `
      INSERT INTO motorcycles (client_id, brand, model, year, plate, color, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.client_id,
      payload.brand,
      payload.model,
      payload.year,
      payload.plate,
      payload.color || null,
      payload.notes || null
    ]
  );

  return result.lastID;
}

async function createOrder(payload) {
  const db = await getDb();
  const result = await db.run(
    `
      INSERT INTO service_orders (
        code,
        client_id,
        motorcycle_id,
        assigned_employee_id,
        preferred_date,
        scheduled_date,
        reported_issue,
        diagnosis,
        current_status,
        budget_amount,
        signature_name,
        signature_accepted_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.code,
      payload.client_id,
      payload.motorcycle_id,
      payload.assigned_employee_id || null,
      payload.preferred_date || null,
      payload.scheduled_date || payload.preferred_date || null,
      payload.reported_issue,
      payload.diagnosis || null,
      payload.current_status,
      payload.budget_amount || 0,
      payload.signature_name || null,
      payload.signature_accepted_at || null
    ]
  );

  return result.lastID;
}

async function createAppointment(payload) {
  const db = await getDb();
  const result = await db.run(
    `
      INSERT INTO appointments (
        service_order_id,
        client_id,
        preferred_date,
        scheduled_date,
        status,
        notes,
        created_by_user_id,
        updated_by_user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.service_order_id,
      payload.client_id,
      payload.preferred_date || null,
      payload.scheduled_date || payload.preferred_date || null,
      payload.status,
      payload.notes || null,
      payload.created_by_user_id,
      payload.updated_by_user_id
    ]
  );

  return result.lastID;
}

async function updateOrderRecord(id, payload) {
  const db = await getDb();
  await db.run(
    `
      UPDATE service_orders
      SET
        assigned_employee_id = ?,
        preferred_date = ?,
        scheduled_date = ?,
        reported_issue = ?,
        diagnosis = ?,
        budget_amount = ?,
        signature_name = ?,
        signature_accepted_at = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [
      payload.assigned_employee_id || null,
      payload.preferred_date || null,
      payload.scheduled_date || null,
      payload.reported_issue,
      payload.diagnosis || null,
      payload.budget_amount || 0,
      payload.signature_name || null,
      payload.signature_accepted_at || null,
      id
    ]
  );
}

async function updateOrderStatus(id, status) {
  const db = await getDb();
  await db.run(
    `
      UPDATE service_orders
      SET current_status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [status, id]
  );
}

async function insertHistory(payload) {
  const db = await getDb();
  await db.run(
    `
      INSERT INTO service_order_history (
        service_order_id,
        user_id,
        previous_status,
        new_status,
        note
      )
      VALUES (?, ?, ?, ?, ?)
    `,
    [
      payload.service_order_id,
      payload.user_id,
      payload.previous_status || null,
      payload.new_status || null,
      payload.note || null
    ]
  );
}

async function replaceOrderParts(serviceOrderId, parts) {
  const db = await getDb();
  await db.run('DELETE FROM service_order_parts WHERE service_order_id = ?', [serviceOrderId]);

  for (const part of parts) {
    await db.run(
      `
        INSERT INTO service_order_parts (
          service_order_id,
          part_id,
          quantity,
          unit_price,
          line_total
        )
        VALUES (?, ?, ?, ?, ?)
      `,
      [
        serviceOrderId,
        part.part_id,
        part.quantity,
        part.unit_price,
        part.line_total
      ]
    );
  }
}

async function replaceLaborEntries(serviceOrderId, entries) {
  const db = await getDb();
  await db.run('DELETE FROM labor_entries WHERE service_order_id = ?', [serviceOrderId]);

  for (const entry of entries) {
    await db.run(
      `
        INSERT INTO labor_entries (
          service_order_id,
          employee_id,
          description,
          hours,
          hourly_rate,
          total_price
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        serviceOrderId,
        entry.employee_id || null,
        entry.description,
        entry.hours,
        entry.hourly_rate,
        entry.total_price
      ]
    );
  }
}

async function upsertApproval(serviceOrderId, payload) {
  const db = await getDb();
  const existing = await db.get(
    'SELECT id FROM approvals_or_signatures WHERE service_order_id = ?',
    [serviceOrderId]
  );

  if (existing) {
    await db.run(
      `
        UPDATE approvals_or_signatures
        SET accepted = ?, signed_by = ?, signed_at = ?, notes = ?
        WHERE service_order_id = ?
      `,
      [
        payload.accepted ? 1 : 0,
        payload.signed_by || null,
        payload.signed_at || null,
        payload.notes || null,
        serviceOrderId
      ]
    );
    return;
  }

  await db.run(
    `
      INSERT INTO approvals_or_signatures (
        service_order_id,
        accepted,
        signed_by,
        signed_at,
        notes
      )
      VALUES (?, ?, ?, ?, ?)
    `,
    [
      serviceOrderId,
      payload.accepted ? 1 : 0,
      payload.signed_by || null,
      payload.signed_at || null,
      payload.notes || null
    ]
  );
}

async function recalculateOrderTotals(serviceOrderId) {
  const db = await getDb();
  const sums = await db.get(
    `
      SELECT
        COALESCE((SELECT SUM(line_total) FROM service_order_parts WHERE service_order_id = ?), 0) AS parts_total,
        COALESCE((SELECT SUM(total_price) FROM labor_entries WHERE service_order_id = ?), 0) AS labor_total
    `,
    [serviceOrderId, serviceOrderId]
  );

  const partsTotal = Number(sums.parts_total || 0);
  const laborTotal = Number(sums.labor_total || 0);
  const totalAmount = partsTotal + laborTotal;

  await db.run(
    `
      UPDATE service_orders
      SET
        parts_total = ?,
        labor_total = ?,
        total_amount = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [partsTotal, laborTotal, totalAmount, serviceOrderId]
  );

  return {
    parts_total: partsTotal,
    labor_total: laborTotal,
    total_amount: totalAmount
  };
}

async function generateOrderCode() {
  const db = await getDb();
  const row = await db.get('SELECT COUNT(*) AS total FROM service_orders');
  return `OS-${String((row?.total || 0) + 1).padStart(4, '0')}`;
}

module.exports = {
  listOrdersForUser,
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
};
