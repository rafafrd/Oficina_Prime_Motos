function createError(status, message, details) {
  const error = new Error(message);
  error.status = status;
  error.details = details;
  return error;
}

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function ok(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

module.exports = {
  createError,
  asyncHandler,
  ok
};
