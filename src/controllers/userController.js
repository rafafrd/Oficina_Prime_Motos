const bcrypt = require('bcryptjs');

const { createUser, findUserById, updateUser } = require('../models/userModel');
const { USER_ROLES } = require('../utils/constants');
const { createError, asyncHandler, ok } = require('../utils/http');
const {
  sanitizeEmail,
  sanitizeText
} = require('../utils/sanitize');

function normalizeUserPayload(body) {
  return {
    name: sanitizeText(body.name, 120),
    email: sanitizeEmail(body.email),
    phone: sanitizeText(body.phone, 40),
    role: body.role,
    document: sanitizeText(body.document, 40),
    address: sanitizeText(body.address, 150),
    position: sanitizeText(body.position, 80),
    company_name: sanitizeText(body.company_name, 120),
    is_admin: Boolean(body.is_admin)
  };
}

const createUserHandler = asyncHandler(async (req, res) => {
  const payload = normalizeUserPayload(req.body);
  const password = String(req.body.password || '');

  if (!payload.name || !payload.email || password.length < 8) {
    throw createError(400, 'Nome, e-mail e senha com mínimo de 8 caracteres são obrigatórios.');
  }

  if (!USER_ROLES.includes(payload.role || 'client')) {
    throw createError(400, 'Perfil de usuário inválido.');
  }

  if (!req.currentUser) {
    payload.role = 'client';
  } else if (payload.role !== 'client') {
    if (req.currentUser.role !== 'employee' || !req.currentUser.is_admin) {
      throw createError(403, 'Somente administradores podem criar funcionários ou fornecedores.');
    }
  }

  payload.role = payload.role || 'client';
  payload.password_hash = await bcrypt.hash(password, 10);

  const user = await createUser(payload);
  const { password_hash, ...safeUser } = user;
  ok(res, safeUser, 201);
});

const getUserHandler = asyncHandler(async (req, res) => {
  const targetUser = await findUserById(req.params.id);

  if (!targetUser) {
    throw createError(404, 'Usuário não encontrado.');
  }

  const canAccess =
    req.currentUser &&
    (req.currentUser.id === targetUser.id ||
      (req.currentUser.role === 'employee' && req.currentUser.is_admin));

  if (!canAccess) {
    throw createError(403, 'Acesso negado ao usuário solicitado.');
  }

  const { password_hash, ...safeUser } = targetUser;
  ok(res, safeUser);
});

const updateUserHandler = asyncHandler(async (req, res) => {
  const targetUser = await findUserById(req.params.id);

  if (!targetUser) {
    throw createError(404, 'Usuário não encontrado.');
  }

  const canEdit =
    req.currentUser &&
    (req.currentUser.id === targetUser.id ||
      (req.currentUser.role === 'employee' && req.currentUser.is_admin));

  if (!canEdit) {
    throw createError(403, 'Você não pode editar este usuário.');
  }

  const payload = normalizeUserPayload({ ...targetUser, ...req.body });
  payload.role = targetUser.role;
  const user = await updateUser(targetUser.id, payload);
  const { password_hash, ...safeUser } = user;
  ok(res, safeUser);
});

module.exports = {
  createUserHandler,
  getUserHandler,
  updateUserHandler
};
