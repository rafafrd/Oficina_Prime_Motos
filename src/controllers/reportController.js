const { listReportsForUser, getReportByOrderId } = require('../models/reportModel');
const { ensureOrderAccess } = require('../services/orderService');
const { asyncHandler, ok } = require('../utils/http');

const listReports = asyncHandler(async (req, res) => {
  const reports = await listReportsForUser(req.currentUser);
  ok(res, reports);
});

const getOrderReport = asyncHandler(async (req, res) => {
  const report = await getReportByOrderId(Number(req.params.id));
  ensureOrderAccess(report, req.currentUser);
  ok(res, report);
});

module.exports = {
  listReports,
  getOrderReport
};
