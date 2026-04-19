const bcrypt = require('bcryptjs');

const { findUserByEmail } = require('../models/userModel');
const { createError } = require('../utils/http');
const { sanitizeEmail } = require('../utils/sanitize');

async function authenticate(email, password) {
  const user = await findUserByEmail(sanitizeEmail(email));

  if (!user) {
    throw createError(401, 'Credenciais inválidas.');
  }

  const matches = await bcrypt.compare(password, user.password_hash);

  if (!matches) {
    throw createError(401, 'Credenciais inválidas.');
  }

  const { password_hash, ...publicUser } = user;
  return publicUser;
}

module.exports = {
  authenticate
};
