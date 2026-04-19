const { listOrdersForUser, getOrderById } = require('./orderModel');

async function listReportsForUser(user) {
  return listOrdersForUser(user);
}

async function getReportByOrderId(orderId) {
  return getOrderById(orderId);
}

module.exports = {
  listReportsForUser,
  getReportByOrderId
};
