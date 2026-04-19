const app = require('./src/app');
const { initializeDatabase } = require('./src/database/init');

const PORT = Number(process.env.PORT || process.env.APP_PORT || 3000);

async function startServer() {
  await initializeDatabase();

  app.listen(PORT, () => {
    console.log(`Servidor iniciado em http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Falha ao iniciar a aplicação:', error);
  process.exit(1);
});
