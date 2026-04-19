import { apiRequest, escapeHtml, formatCurrency, formatDate } from './api.js';
import { initializeProtectedPage, infoTable, stateBlock, statusPill } from './common.js';

const user = await initializeProtectedPage({
  page: 'supplier',
  title: 'Portal do Fornecedor',
  allowedRoles: ['supplier']
});

if (user) {
  await loadSupplierArea();
}

async function loadSupplierArea() {
  const metricsNode = document.getElementById('supplierMetrics');
  const partsNode = document.getElementById('supplierParts');
  const ordersNode = document.getElementById('supplierOrders');

  metricsNode.innerHTML = stateBlock('Carregando painel...');
  partsNode.innerHTML = stateBlock('Carregando peças...');
  ordersNode.innerHTML = stateBlock('Carregando ordens...');

  try {
    const [parts, orders] = await Promise.all([
      apiRequest('/api/parts'),
      apiRequest('/api/suppliers/orders')
    ]);

    metricsNode.innerHTML = [
      metricCard('Peças catalogadas', String(parts.length), 'Itens do fornecedor'),
      metricCard('Ordens ligadas', String(new Set(orders.map((item) => item.order_id)).size), 'Demandas em aberto'),
      metricCard(
        'Valor vinculado',
        formatCurrency(orders.reduce((sum, item) => sum + Number(item.line_total || 0), 0)),
        'Total por fornecimento'
      )
    ].join('');

    partsNode.innerHTML = infoTable(
      [
        { key: 'name', label: 'Peça' },
        { key: 'sku', label: 'SKU' },
        { key: 'price', label: 'Preço' },
        { key: 'stock', label: 'Estoque' }
      ],
      parts.map((part) => ({
        name: escapeHtml(part.name),
        sku: escapeHtml(part.sku),
        price: formatCurrency(part.unit_price),
        stock: String(part.stock_quantity)
      }))
    );

    ordersNode.innerHTML = infoTable(
      [
        { key: 'code', label: 'Ordem' },
        { key: 'client', label: 'Cliente' },
        { key: 'part', label: 'Peça' },
        { key: 'status', label: 'Status' },
        { key: 'date', label: 'Agenda' }
      ],
      orders.map((item) => ({
        code: `<a class="text-link" href="/report?id=${item.order_id}">${escapeHtml(item.code)}</a>`,
        client: escapeHtml(item.client_name),
        part: `${escapeHtml(item.part_name)} • ${item.quantity}x`,
        status: statusPill(item.current_status),
        date: formatDate(item.scheduled_date)
      }))
    );
  } catch (error) {
    metricsNode.innerHTML = stateBlock(error.message, 'error');
    partsNode.innerHTML = stateBlock(error.message, 'error');
    ordersNode.innerHTML = stateBlock(error.message, 'error');
  }
}

function metricCard(title, value, detail) {
  return `
    <article class="metric-card">
      <span class="eyebrow">${title}</span>
      <strong>${value}</strong>
      <span>${detail}</span>
    </article>
  `;
}
