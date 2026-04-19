const { findUserById } = require('../models/userModel');
const { createError } = require('../utils/http');

async function attachCurrentUser(req, res, next) {
  const userId = req.session?.userId;

  if (!userId) {
    req.currentUser = null;
    return next();
  }

  try {
    const user = await findUserById(userId);
    req.currentUser = user || null;
    return next();
  } catch (error) {
    return next(error);
  }
}

function requireAuth(req, res, next) {
  if (!req.currentUser) {
    return next(createError(401, 'Autenticação necessária.'));
  }

  return next();
}

function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.currentUser) {
      return next(createError(401, 'Autenticação necessária.'));
    }

    if (!roles.includes(req.currentUser.role)) {
      return next(createError(403, 'Você não possui permissão para este recurso.'));
    }

    return next();
  };
}

function requireAdminEmployee(req, res, next) {
  if (!req.currentUser) {
    return next(createError(401, 'Autenticação necessária.'));
  }

  if (req.currentUser.role !== 'employee' || !req.currentUser.is_admin) {
    return next(createError(403, 'Somente funcionários administradores podem executar esta ação.'));
  }

  return next();
}

module.exports = {
  attachCurrentUser,
  requireAuth,
  requireRoles,
  requireAdminEmployee
};
