const express = require('express');

const {
  createUserHandler,
  getUserHandler,
  updateUserHandler
} = require('../controllers/userController');
const { attachCurrentUser, requireAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/', attachCurrentUser, createUserHandler);
router.get('/:id', requireAuth, getUserHandler);
router.put('/:id', requireAuth, updateUserHandler);

module.exports = router;
