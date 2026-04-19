const { getDb } = require('../config/db');

function baseUserSelect() {
  return `
    SELECT
      u.id,
      u.name,
      u.email,
      u.phone,
      u.role,
      u.is_admin,
      u.password_hash,
      u.created_at,
      u.updated_at,
      c.id AS client_id,
      c.document AS client_document,
      c.address AS client_address,
      e.id AS employee_id,
      e.position AS employee_position,
      s.id AS supplier_id,
      s.company_name AS supplier_company_name
    FROM users u
    LEFT JOIN clients c ON c.user_id = u.id
    LEFT JOIN employees e ON e.user_id = u.id
    LEFT JOIN suppliers s ON s.user_id = u.id
  `;
}

function serializeUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    is_admin: Boolean(row.is_admin),
    created_at: row.created_at,
    updated_at: row.updated_at,
    password_hash: row.password_hash,
    profile: {
      client_id: row.client_id || null,
      document: row.client_document || null,
      address: row.client_address || null,
      employee_id: row.employee_id || null,
      position: row.employee_position || null,
      supplier_id: row.supplier_id || null,
      company_name: row.supplier_company_name || null
    }
  };
}

async function findUserByEmail(email) {
  const db = await getDb();
  const row = await db.get(`${baseUserSelect()} WHERE u.email = ?`, [email]);
  return serializeUser(row);
}

async function findUserById(id) {
  const db = await getDb();
  const row = await db.get(`${baseUserSelect()} WHERE u.id = ?`, [id]);
  return serializeUser(row);
}

async function createUser(payload) {
  const db = await getDb();
  const result = await db.run(
    `
      INSERT INTO users (name, email, password_hash, role, phone, is_admin)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      payload.name,
      payload.email,
      payload.password_hash,
      payload.role,
      payload.phone || null,
      payload.is_admin ? 1 : 0
    ]
  );

  if (payload.role === 'client') {
    await db.run(
      `
        INSERT INTO clients (user_id, document, address)
        VALUES (?, ?, ?)
      `,
      [result.lastID, payload.document || null, payload.address || null]
    );
  }

  if (payload.role === 'employee') {
    await db.run(
      `
        INSERT INTO employees (user_id, position)
        VALUES (?, ?)
      `,
      [result.lastID, payload.position || 'Técnico']
    );
  }

  if (payload.role === 'supplier') {
    await db.run(
      `
        INSERT INTO suppliers (user_id, company_name)
        VALUES (?, ?)
      `,
      [result.lastID, payload.company_name || payload.name]
    );
  }

  return findUserById(result.lastID);
}

async function updateUser(id, payload) {
  const db = await getDb();

  await db.run(
    `
      UPDATE users
      SET name = ?, email = ?, phone = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [payload.name, payload.email, payload.phone || null, id]
  );

  if (payload.role === 'client') {
    await db.run(
      `
        UPDATE clients
        SET document = ?, address = ?
        WHERE user_id = ?
      `,
      [payload.document || null, payload.address || null, id]
    );
  }

  if (payload.role === 'employee') {
    await db.run(
      `
        UPDATE employees
        SET position = ?
        WHERE user_id = ?
      `,
      [payload.position || 'Técnico', id]
    );
  }

  if (payload.role === 'supplier') {
    await db.run(
      `
        UPDATE suppliers
        SET company_name = ?
        WHERE user_id = ?
      `,
      [payload.company_name || payload.name, id]
    );
  }

  return findUserById(id);
}

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  updateUser
};
