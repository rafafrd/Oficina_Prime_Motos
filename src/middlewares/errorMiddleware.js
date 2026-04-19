function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: 'Recurso não encontrado.'
  });
}

function errorHandler(error, req, res, next) {
  const status = error.status || 500;

  if (status >= 500) {
    console.error(error);
  }

  res.status(status).json({
    success: false,
    message: error.message || 'Erro interno do servidor.',
    details: error.details || undefined
  });
}

module.exports = {
  notFoundHandler,
  errorHandler
};
