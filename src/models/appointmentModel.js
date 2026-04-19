const { getDb } = require('../config/db');

async function listAppointmentsForUser(user) {
  const db = await getDb();

  if (user.role === 'employee') {
    return db.all(
      `
        SELECT
          a.*,
          so.code AS order_code,
          u.name AS client_name,
          m.brand || ' ' || m.model AS motorcycle_label
        FROM appointments a
        INNER JOIN service_orders so ON so.id = a.service_order_id
        INNER JOIN clients c ON c.id = a.client_id
        INNER JOIN users u ON u.id = c.user_id
        INNER JOIN motorcycles m ON m.id = so.motorcycle_id
        ORDER BY COALESCE(a.scheduled_date, a.preferred_date) ASC
      `
    );
  }

  if (user.role === 'client') {
    return db.all(
      `
        SELECT
          a.*,
          so.code AS order_code,
          u.name AS client_name,
          m.brand || ' ' || m.model AS motorcycle_label
        FROM appointments a
        INNER JOIN service_orders so ON so.id = a.service_order_id
        INNER JOIN clients c ON c.id = a.client_id
        INNER JOIN users u ON u.id = c.user_id
        INNER JOIN motorcycles m ON m.id = so.motorcycle_id
        WHERE a.client_id = ?
        ORDER BY COALESCE(a.scheduled_date, a.preferred_date) ASC
      `,
      [user.profile.client_id]
    );
  }

  return [];
}

async function getAppointmentById(id) {
  const db = await getDb();
  return db.get('SELECT * FROM appointments WHERE id = ?', [id]);
}

async function updateAppointment(id, payload) {
  const db = await getDb();
  await db.run(
    `
      UPDATE appointments
      SET
        preferred_date = ?,
        scheduled_date = ?,
        status = ?,
        notes = ?,
        updated_by_user_id = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [
      payload.preferred_date || null,
      payload.scheduled_date || null,
      payload.status,
      payload.notes || null,
      payload.updated_by_user_id,
      id
    ]
  );

  return getAppointmentById(id);
}

module.exports = {
  listAppointmentsForUser,
  getAppointmentById,
  updateAppointment
};
