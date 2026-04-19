import {
  apiRequest,
  escapeHtml,
  formatCurrency,
  formatDateTime,
  slugifyStatus
} from './api.js';

const NAVIGATION = {
  client: [
    { href: '/dashboard', label: 'Dashboard', key: 'dashboard', meta: 'Resumo' },
    { href: '/requests', label: 'Ordens', key: 'requests', meta: 'Solicitações' },
    { href: '/appointments', label: 'Agenda', key: 'appointments', meta: 'Datas' }
  ],
  employee: [
    { href: '/dashboard', label: 'Dashboard', key: 'dashboard', meta: 'Operação' },
    { href: '/requests', label: 'Ordens', key: 'requests', meta: 'Execução' },
    { href: '/appointments', label: 'Agenda', key: 'appointments', meta: 'Reagendar' }
  ],
  supplier: [
    { href: '/supplier', label: 'Fornecedor', key: 'supplier', meta: 'Pedidos' },
    { href: '/report?id=1', label: 'Relatórios', key: 'report', meta: 'Consulta' }
  ]
};

export async function initializeProtectedPage({ page, title, allowedRoles }) {
  let user;

  try {
    user = await apiRequest('/api/auth/me');
  } catch (error) {
    if (error.status === 401) {
      window.location.href = '/login';
      return null;
    }

    throw error;
  }

  if (allowedRoles?.length && !allowedRoles.includes(user.role)) {
    window.location.href = user.role === 'supplier' ? '/supplier' : '/dashboard';
    return null;
  }

  renderShell(user, page, title);
  return user;
}

function renderShell(user, page, title) {
  const sidebar = document.getElementById('sidebar');
  const topbar = document.getElementById('topbar');
  const links = NAVIGATION[user.role] || [];

  if (sidebar) {
    sidebar.innerHTML = `
      <div class="sidebar-brand">
        <span class="brand-mark">OP</span>
        <div>
          <strong>Oficina Prime</strong>
          <span>${escapeHtml(roleLabel(user.role))}</span>
        </div>
      </div>
      <nav>
        <ul class="sidebar-nav">
          ${links
            .map(
              (link) => `
                <li>
                  <a class="nav-link ${page === link.key ? 'active' : ''}" href="${link.href}">
                    <span>${escapeHtml(link.label)}</span>
                    <span>${escapeHtml(link.meta)}</span>
                  </a>
                </li>
              `
            )
            .join('')}
        </ul>
      </nav>
      <div class="sidebar-footer">
        <div class="user-chip">
          <strong>${escapeHtml(user.name)}</strong><br />
          <span>${escapeHtml(user.email)}</span>
        </div>
      </div>
    `;
  }

  if (topbar) {
    topbar.innerHTML = `
      <div>
        <div class="eyebrow">Ambiente interno</div>
        <div class="topbar-title">${escapeHtml(title)}</div>
      </div>
      <div class="topbar-user">
        <div class="user-chip">
          <strong>${escapeHtml(user.name)}</strong><br />
          <span>${escapeHtml(roleLabel(user.role))}</span>
        </div>
        <button id="logoutButton" class="btn btn-ghost" type="button">Sair</button>
      </div>
    `;

    const logoutButton = document.getElementById('logoutButton');
    logoutButton?.addEventListener('click', async () => {
      try {
        await apiRequest('/api/auth/logout', { method: 'POST' });
      } finally {
        window.location.href = '/login';
      }
    });
  }
}

function roleLabel(role) {
  return {
    client: 'Cliente',
    employee: 'Funcionário',
    supplier: 'Fornecedor'
  }[role] || role;
}

export function statusPill(status) {
  return `<span class="status-pill ${slugifyStatus(status)}">${escapeHtml(status)}</span>`;
}

export function infoTable(columns, rows) {
  if (!rows.length) {
    return `<div class="state-block">Nenhum registro disponível.</div>`;
  }

  return `
    <div class="table-shell">
      <table>
        <thead>
          <tr>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) => `
                <tr>${columns.map((column) => `<td>${row[column.key] ?? '-'}</td>`).join('')}</tr>
              `
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

export function stateBlock(message, type = 'loading') {
  return `<div class="state-block ${type}">${escapeHtml(message)}</div>`;
}

export function renderTimeline(statusFlow, currentStatus) {
  const currentIndex = statusFlow.indexOf(currentStatus);

  return `
    <div class="timeline">
      ${statusFlow
        .map(
          (status, index) => `
            <div class="timeline-item ${index <= currentIndex ? 'active' : ''}">
              <strong>${escapeHtml(status)}</strong>
              <p>${index === currentIndex ? 'Etapa atual da ordem.' : 'Etapa do fluxo operacional.'}</p>
            </div>
          `
        )
        .join('')}
    </div>
  `;
}

export function orderSummary(order) {
  return `
    <div class="key-grid">
      <div>
        <span>Cliente</span>
        <strong>${escapeHtml(order.client_name)}</strong>
      </div>
      <div>
        <span>Moto</span>
        <strong>${escapeHtml(`${order.motorcycle.brand} ${order.motorcycle.model}`)}</strong>
      </div>
      <div>
        <span>Status</span>
        <strong>${statusPill(order.current_status)}</strong>
      </div>
      <div data-testid="order-status">
        <span>Valor total</span>
        <strong>${formatCurrency(order.total_amount)}</strong>
      </div>
      <div>
        <span>Agenda</span>
        <strong>${formatDateTime(order.scheduled_date)}</strong>
      </div>
      <div>
        <span>Orçamento</span>
        <strong>${formatCurrency(order.budget_amount)}</strong>
      </div>
    </div>
  `;
}
