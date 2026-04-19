const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

let dbPromise;

function getDatabasePath() {
  const configuredPath = process.env.SQLITE_DB_PATH;

  if (configuredPath) {
    return path.isAbsolute(configuredPath)
      ? configuredPath
      : path.join(process.cwd(), configuredPath);
  }

  return path.join(__dirname, '..', 'database', 'app.db');
}

async function getDb() {
  if (!dbPromise) {
    const filename = getDatabasePath();
    const dir = path.dirname(filename);

    if (filename !== ':memory:' && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    dbPromise = open({
      filename,
      driver: sqlite3.Database
    });
  }

  const db = await dbPromise;
  await db.exec('PRAGMA foreign_keys = ON;');
  return db;
}

async function closeDb() {
  if (!dbPromise) {
    return;
  }

  const db = await dbPromise;
  await db.close();
  dbPromise = null;
}

async function resetDbCache() {
  await closeDb();
}

module.exports = {
  getDb,
  getDatabasePath,
  closeDb,
  resetDbCache
};
