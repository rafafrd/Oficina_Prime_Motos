const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const { getDb, getDatabasePath, resetDbCache } = require('../config/db');

function replaceSeedTokens(sql) {
  const tokens = {
    '__CLIENT_ANA_HASH__': bcrypt.hashSync('Cliente@123', 10),
    '__CLIENT_BRUNO_HASH__': bcrypt.hashSync('Cliente2@123', 10),
    '__EMPLOYEE_HASH__': bcrypt.hashSync('Oficina@123', 10),
    '__ADMIN_HASH__': bcrypt.hashSync('Admin@123', 10),
    '__SUPPLIER_HASH__': bcrypt.hashSync('Fornecedor@123', 10)
  };

  return Object.entries(tokens).reduce(
    (content, [token, value]) => content.replace(new RegExp(token, 'g'), value),
    sql
  );
}

async function databaseHasSchema(db) {
  const row = await db.get(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'"
  );

  return Boolean(row);
}

async function initializeDatabase(options = {}) {
  const { force = false, seed = true } = options;
  const databasePath = getDatabasePath();

  if (force && databasePath !== ':memory:' && fs.existsSync(databasePath)) {
    await resetDbCache();
    fs.unlinkSync(databasePath);
  }

  const db = await getDb();
  const schemaPath = path.join(__dirname, '..', 'schema.sql');
  const seedPath = path.join(__dirname, '..', 'seed.sql');

  if (force || !(await databaseHasSchema(db))) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    await db.exec(schemaSql);
  }

  if (seed) {
    const existingUsers = await db.get('SELECT COUNT(*) AS total FROM users');

    if (!existingUsers || existingUsers.total === 0) {
      const seedSql = replaceSeedTokens(fs.readFileSync(seedPath, 'utf-8'));
      await db.exec(seedSql);
    }
  }

  return db;
}

module.exports = {
  initializeDatabase
};
