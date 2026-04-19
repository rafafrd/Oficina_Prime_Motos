const { initializeDatabase } = require('./init');
const { closeDb, getDatabasePath } = require('../config/db');

async function reset() {
  await initializeDatabase({ force: true, seed: true });
  await closeDb();
  console.log(`Banco reinicializado em ${getDatabasePath()}`);
}

reset().catch((error) => {
  console.error('Falha ao reinicializar o banco:', error);
  process.exit(1);
});
