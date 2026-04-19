const { getDb } = require('../config/db');

async function listPartsForUser(user) {
  const db = await getDb();

  if (user.role === 'supplier') {
    return db.all(
      `
        SELECT p.*, s.company_name AS supplier_name
        FROM parts p
        INNER JOIN suppliers s ON s.id = p.supplier_id
        WHERE p.supplier_id = ?
        ORDER BY p.name ASC
      `,
      [user.profile.supplier_id]
    );
  }

  return db.all(
    `
      SELECT p.*, s.company_name AS supplier_name
      FROM parts p
      INNER JOIN suppliers s ON s.id = p.supplier_id
      ORDER BY p.name ASC
    `
  );
}

async function getPartById(id) {
  const db = await getDb();
  return db.get('SELECT * FROM parts WHERE id = ?', [id]);
}

async function createPart(payload) {
  const db = await getDb();
  const result = await db.run(
    `
      INSERT INTO parts (supplier_id, name, sku, unit_price, stock_quantity)
      VALUES (?, ?, ?, ?, ?)
    `,
    [
      payload.supplier_id,
      payload.name,
      payload.sku,
      payload.unit_price,
      payload.stock_quantity || 0
    ]
  );

  return getPartById(result.lastID);
}

async function listSupplierOrders(supplierId) {
  const db = await getDb();
  return db.all(
    `
      SELECT
        so.id AS order_id,
        so.code,
        so.current_status,
        so.scheduled_date,
        u.name AS client_name,
        m.brand || ' ' || m.model AS motorcycle_label,
        p.name AS part_name,
        sop.quantity,
        sop.line_total,
        s.company_name AS supplier_name
      FROM service_order_parts sop
      INNER JOIN parts p ON p.id = sop.part_id
      INNER JOIN suppliers s ON s.id = p.supplier_id
      INNER JOIN service_orders so ON so.id = sop.service_order_id
      INNER JOIN clients c ON c.id = so.client_id
      INNER JOIN users u ON u.id = c.user_id
      INNER JOIN motorcycles m ON m.id = so.motorcycle_id
      WHERE p.supplier_id = ?
      ORDER BY so.updated_at DESC, sop.id ASC
    `,
    [supplierId]
  );
}

module.exports = {
  listPartsForUser,
  getPartById,
  createPart,
  listSupplierOrders
};
