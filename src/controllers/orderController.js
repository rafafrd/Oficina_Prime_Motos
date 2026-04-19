const { listOrdersForUser, getOrderById } = require('../models/orderModel');
const {
  ensureOrderAccess,
  createServiceOrder,
  updateServiceOrder,
  changeOrderStatus,
  addManualHistory
} = require('../services/orderService');
const { asyncHandler, ok } = require('../utils/http');

const listOrders = asyncHandler(async (req, res) => {
  const orders = await listOrdersForUser(req.currentUser);
  ok(res, orders);
});

const getOrder = asyncHandler(async (req, res) => {
  const order = await getOrderById(req.params.id);
  ensureOrderAccess(order, req.currentUser);
  ok(res, order);
});

const createOrderHandler = asyncHandler(async (req, res) => {
  const order = await createServiceOrder(req.body, req.currentUser);
  ok(res, order, 201);
});

const updateOrderHandler = asyncHandler(async (req, res) => {
  const order = await updateServiceOrder(Number(req.params.id), req.body, req.currentUser);
  ok(res, order);
});

const updateStatusHandler = asyncHandler(async (req, res) => {
  const order = await changeOrderStatus(
    Number(req.params.id),
    req.body.status,
    req.body.note,
    req.currentUser
  );
  ok(res, order);
});

const addHistoryHandler = asyncHandler(async (req, res) => {
  const order = await addManualHistory(Number(req.params.id), req.body.note, req.currentUser);
  ok(res, order, 201);
});

module.exports = {
  listOrders,
  getOrder,
  createOrderHandler,
  updateOrderHandler,
  updateStatusHandler,
  addHistoryHandler
};
