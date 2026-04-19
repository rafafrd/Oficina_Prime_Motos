import { apiRequest, formatCurrency, formatDateTime, escapeHtml } from './api.js';
import { initializeProtectedPage, infoTable, stateBlock, statusPill } from './common.js';

const user = await initializeProtectedPage({
  page: 'dashboard',
  title: 'Dashboard',
  allowedRoles: ['client', 'employee']
});

if (user) {
  await loadDashboard();
}

async function loadDashboard() {
  const metricsNode = document.getElementById('dashboardMetrics');
  const ordersNode = document.getElementById('recentOrders');
  const appointmentsNode = document.getElementById('upcomingAppointments');

  metricsNode.innerHTML = stateBlock('Carregando indicadores...');
  ordersNode.innerHTML = stateBlock('Carregando ordens...');
  appointmentsNode.innerHTML = stateBlock('Carregando agenda...');

  try {
    const [orders, appointments] = await Promise.all([
      apiRequest('/api/orders'),
      apiRequest('/api/appointments')
    ]);

    const openOrders = orders.filter((order) => !['Finalizado', 'Entregue'].includes(order.current_status));
    const waitingApproval = orders.filter((order) => order.current_status === 'Aguardando aprovação');
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

    metricsNode.innerHTML = [
      metricCard('Ordens abertas', String(openOrders.length), 'Fluxo em andamento'),
      metricCard('Aguardando aprovação', String(waitingApproval.length), 'Cliente precisa responder'),
      metricCard('Agenda futura', String(appointments.length), 'Atendimentos confirmados e reagendados'),
      metricCard('Valor total', formatCurrency(totalRevenue), 'Peças + mão de obra')
    ].join('');

    ordersNode.innerHTML = infoTable(
      [
        { key: 'code', label: 'Ordem' },
        { key: 'status', label: 'Status' },
        { key: 'moto', label: 'Moto' },
        { key: 'total', label: 'Total' }
      ],
      orders.slice(0, 6).map((order) => ({
        code: `<a class="text-link" href="/requests?order=${order.id}">${escapeHtml(order.code)}</a>`,
        status: statusPill(order.current_status),
        moto: escapeHtml(`${order.motorcycle.brand} ${order.motorcycle.model}`),
        total: formatCurrency(order.total_amount)
      }))
    );

    appointmentsNode.innerHTML = infoTable(
      [
        { key: 'date', label: 'Data' },
        { key: 'order', label: 'Ordem' },
        { key: 'client', label: 'Cliente' },
        { key: 'status', label: 'Status' }
      ],
      appointments.slice(0, 6).map((appointment) => ({
        date: formatDateTime(appointment.scheduled_date || appointment.preferred_date),
        order: escapeHtml(appointment.order_code),
        client: escapeHtml(appointment.client_name),
        status: statusPill(appointment.status)
      }))
    );
  } catch (error) {
    metricsNode.innerHTML = stateBlock(error.message, 'error');
    ordersNode.innerHTML = stateBlock(error.message, 'error');
    appointmentsNode.innerHTML = stateBlock(error.message, 'error');
  }
}

function metricCard(title, value, detail) {
  return `
    <article class="metric-card" data-testid="dashboard-card">
      <span class="eyebrow">${title}</span>
      <strong>${value}</strong>
      <span>${detail}</span>
    </article>
  `;
}
