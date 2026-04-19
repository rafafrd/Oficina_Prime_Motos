const { listPartsForUser, createPart, listSupplierOrders } = require('../models/partModel');
const { createError, asyncHandler, ok } = require('../utils/http');
const {
  sanitizeNumber,
  sanitizeText
} = require('../utils/sanitize');

const listParts = asyncHandler(async (req, res) => {
  const parts = await listPartsForUser(req.currentUser);
  ok(res, parts);
});

const createPartHandler = asyncHandler(async (req, res) => {
  if (req.currentUser.role !== 'employee') {
    throw createError(403, 'Somente funcionários podem cadastrar peças.');
  }

  const part = await createPart({
    supplier_id: sanitizeNumber(req.body.supplier_id),
    name: sanitizeText(req.body.name, 120),
    sku: sanitizeText(req.body.sku, 80),
    unit_price: sanitizeNumber(req.body.unit_price),
    stock_quantity: sanitizeNumber(req.body.stock_quantity)
  });

  ok(res, part, 201);
});

const listSupplierOrderHandler = asyncHandler(async (req, res) => {
  if (req.currentUser.role !== 'supplier') {
    throw createError(403, 'Área restrita a fornecedores.');
  }

  const orders = await listSupplierOrders(req.currentUser.profile.supplier_id);
  ok(res, orders);
});

module.exports = {
  listParts,
  createPartHandler,
  listSupplierOrderHandler
};
