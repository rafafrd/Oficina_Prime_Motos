const { authenticate } = require('../services/authService');
const { asyncHandler, ok } = require('../utils/http');

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await authenticate(email, password);
  req.session.userId = user.id;
  ok(res, user);
});

const logout = asyncHandler(async (req, res) => {
  await new Promise((resolve, reject) => {
    req.session.destroy((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  res.clearCookie('connect.sid');
  ok(res, { message: 'Logout efetuado com sucesso.' });
});

const me = asyncHandler(async (req, res) => {
  ok(res, req.currentUser);
});

module.exports = {
  login,
  logout,
  me
};
