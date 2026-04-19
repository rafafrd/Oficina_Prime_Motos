import {
  apiRequest,
  escapeHtml,
  formatCurrency,
  formatDate,
  formatDateTime,
  getQueryParam
} from './api.js';
import {
  initializeProtectedPage,
  orderSummary,
  renderTimeline,
  stateBlock,
  statusPill
} from './common.js';

const STATUS_FLOW = [
  'Recebido',
  'Em diagnóstico',
  'Aguardando aprovação',
  'Aguardando peças',
  'Em manutenção',
  'Finalizado',
  'Entregue'
];

const user = await initializeProtectedPage({
  page: 'requests',
  title: 'Ordens de Serviço',
  allowedRoles: ['client', 'employee']
});

const state = {
  orders: [],
  partsCatalog: [],
  selectedOrderId: Number(getQueryParam('order')) || null,
  draftParts: [],
  draftLabor: []
};

if (user) {
  await loadOrdersPage();
}

async function loadOrdersPage() {
  const createPanel = document.getElementById('createRequestPanel');
  const listNode = document.getElementById('ordersList');
  const detailNode = document.getElementById('orderDetail');

  listNode.innerHTML = stateBlock('Carregando ordens...');
  detailNode.innerHTML = stateBlock('Carregando detalhes...');
  createPanel.innerHTML = user.role === 'client'
    ? renderCreateForm()
    : renderEmployeeGuide();

  bindCreateForm();

  try {
    const requests = [apiRequest('/api/orders')];
    if (user.role === 'employee') {
      requests.push(apiRequest('/api/parts'));
    }

    const [orders, parts = []] = await Promise.all(requests);
    state.orders = orders;
    state.partsCatalog = parts;

    if (!state.selectedOrderId && orders.length) {
      state.selectedOrderId = orders[0].id;
    }

    renderOrdersList();
    await renderOrderDetail();
  } catch (error) {
    listNode.innerHTML = stateBlock(error.message, 'error');
    detailNode.innerHTML = stateBlock(error.message, 'error');
  }
}

function renderOrdersList() {
  const counter = document.getElementById('ordersCounter');
  const listNode = document.getElementById('ordersList');

  counter.textContent = `${state.orders.length} ordem(ns)`;

  if (!state.orders.length) {
    listNode.innerHTML = stateBlock('Nenhuma ordem disponível.', 'loading');
    return;
  }

  listNode.innerHTML = `
    <div class="order-list">
      ${state.orders
        .map(
          (order) => `
            <button
              type="button"
              class="order-card ${order.id === state.selectedOrderId ? 'active' : ''}"
              data-order-id="${order.id}"
            >
              <header>
                <div>
                  <h3>${escapeHtml(order.code)}</h3>
                  <p>${escapeHtml(`${order.motorcycle.brand} ${order.motorcycle.model}`)}</p>
                </div>
                ${statusPill(order.current_status)}
              </header>
              <div class="actions-row">
                <span class="tag">${escapeHtml(order.client_name)}</span>
                <span class="tag">${formatDate(order.scheduled_date)}</span>
              </div>
              <div class="actions-row">
                <strong>${formatCurrency(order.total_amount)}</strong>
                <span class="subtle-label">Abrir detalhes</span>
              </div>
            </button>
          `
        )
        .join('')}
    </div>
  `;

  listNode.querySelectorAll('[data-order-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      state.selectedOrderId = Number(button.dataset.orderId);
      renderOrdersList();
      await renderOrderDetail();
    });
  });
}

async function renderOrderDetail() {
  const detailNode = document.getElementById('orderDetail');

  if (!state.selectedOrderId) {
    detailNode.innerHTML = `<div class="detail-placeholder">Selecione uma ordem para continuar.</div>`;
    return;
  }

  detailNode.innerHTML = stateBlock('Carregando ordem...');

  try {
    const order = await apiRequest(`/api/orders/${state.selectedOrderId}`);
    state.draftParts = order.parts.map((part) => ({
      part_id: part.part_id,
      name: part.name,
      quantity: Number(part.quantity),
      unit_price: Number(part.unit_price)
    }));
    state.draftLabor = order.labor_entries.map((entry) => ({
      description: entry.description,
      hours: Number(entry.hours),
      hourly_rate: Number(entry.hourly_rate)
    }));

    detailNode.innerHTML = renderDetailMarkup(order);
    bindDetailEvents(order);
  } catch (error) {
    detailNode.innerHTML = stateBlock(error.message, 'error');
  }
}

function renderDetailMarkup(order) {
  return `
    <div class="stack-lg">
      <div class="section-head">
        <div>
          <span class="eyebrow">Detalhe da ordem</span>
          <h2>${escapeHtml(order.code)}</h2>
        </div>
        <div class="actions-row">
          ${statusPill(order.current_status)}
          <a class="btn btn-secondary" href="/report?id=${order.id}">Abrir relatório</a>
        </div>
      </div>

      ${orderSummary(order)}

      <section class="report-section">
        <h2>Fluxo da ordem</h2>
        ${renderTimeline(STATUS_FLOW, order.current_status)}
      </section>

      <section class="report-section">
        <h2>Defeito relatado</h2>
        <p>${escapeHtml(order.reported_issue)}</p>
      </section>

      <section class="grid split-grid">
        <div class="report-section">
          <h2>Diagnóstico</h2>
          <p>${escapeHtml(order.diagnosis || 'Diagnóstico ainda não registrado.')}</p>
        </div>
        <div class="report-section">
          <h2>Moto</h2>
          <p>${escapeHtml(
            `${order.motorcycle.brand} ${order.motorcycle.model} ${order.motorcycle.year} • ${order.motorcycle.plate}`
          )}</p>
        </div>
      </section>

      <section class="report-section">
        <h2>Histórico</h2>
        <div class="timeline" data-testid="history-list">
          ${order.history
            .map(
              (item) => `
                <div class="timeline-item active">
                  <strong>${escapeHtml(item.new_status || order.current_status)}</strong>
                  <p>${escapeHtml(item.note || 'Atualização registrada.')}</p>
                  <small>${escapeHtml(`${item.actor_name} • ${formatDateTime(item.created_at)}`)}</small>
                </div>
              `
            )
            .join('')}
        </div>
      </section>

      <section class="grid split-grid">
        <div class="report-section">
          <h2>Peças</h2>
          ${renderPartsTable(order.parts)}
        </div>
        <div class="report-section">
          <h2>Mão de obra</h2>
          ${renderLaborTable(order.labor_entries)}
        </div>
      </section>

      ${user.role === 'employee' ? renderEmployeeActions(order) : renderClientActions(order)}
    </div>
  `;
}

function renderPartsTable(parts) {
  if (!parts.length) {
    return '<p class="empty-state">Nenhuma peça vinculada.</p>';
  }

  return `
    <div class="table-shell">
      <table>
        <thead>
          <tr><th>Peça</th><th>Qtd</th><th>Valor</th></tr>
        </thead>
        <tbody>
          ${parts
            .map(
              (part) => `
                <tr>
                  <td>${escapeHtml(part.name)}</td>
                  <td>${part.quantity}</td>
                  <td>${formatCurrency(part.line_total)}</td>
                </tr>
              `
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderLaborTable(entries) {
  if (!entries.length) {
    return '<p class="empty-state">Nenhuma mão de obra registrada.</p>';
  }

  return `
    <div class="table-shell">
      <table>
        <thead>
          <tr><th>Descrição</th><th>Horas</th><th>Total</th></tr>
        </thead>
        <tbody>
          ${entries
            .map(
              (entry) => `
                <tr>
                  <td>${escapeHtml(entry.description)}</td>
                  <td>${entry.hours}</td>
                  <td>${formatCurrency(entry.total_price)}</td>
                </tr>
              `
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderCreateForm() {
  return `
    <div class="section-head">
      <h2>Nova solicitação</h2>
      <span class="subtle-label">Cliente</span>
    </div>
    <form id="createRequestForm" class="form-grid">
      <div class="form-group">
        <label for="brand">Marca</label>
        <input id="brand" name="brand" required />
      </div>
      <div class="form-group">
        <label for="model">Modelo</label>
        <input id="model" name="model" required />
      </div>
      <div class="form-group">
        <label for="year">Ano</label>
        <input id="year" name="year" type="number" min="1990" required />
      </div>
      <div class="form-group">
        <label for="plate">Placa</label>
        <input id="plate" name="plate" required />
      </div>
      <div class="form-group full">
        <label for="preferred_date">Data preferencial</label>
        <input id="preferred_date" name="preferred_date" type="datetime-local" required />
      </div>
      <div class="form-group full">
        <label for="reported_issue">Defeito relatado</label>
        <textarea id="reported_issue" name="reported_issue" required></textarea>
      </div>
      <div class="form-group full">
        <button class="btn btn-primary" type="submit">Abrir solicitação</button>
      </div>
      <p id="createRequestFeedback" class="feedback-line form-group full"></p>
    </form>
  `;
}

function renderEmployeeGuide() {
  return `
    <div class="section-head">
      <h2>Painel técnico</h2>
      <span class="subtle-label">Funcionário</span>
    </div>
    <div class="state-block">
      Use a lista lateral para abrir uma ordem existente, atualizar status, diagnóstico,
      orçamento, peças e mão de obra.
    </div>
  `;
}

function renderEmployeeActions(order) {
  return `
    <section class="grid split-grid">
      <form id="employeeUpdateForm" class="report-section stack-lg">
        <h2>Atualização técnica</h2>
        <div class="form-group">
          <label for="diagnosis">Diagnóstico</label>
          <textarea id="diagnosis" name="diagnosis">${escapeHtml(order.diagnosis || '')}</textarea>
        </div>
        <div class="form-group">
          <label for="budget_amount">Orçamento</label>
          <input id="budget_amount" name="budget_amount" type="number" step="0.01" value="${order.budget_amount}" />
        </div>
        <div class="form-group">
          <label for="partSelector">Adicionar peça</label>
          <div class="inline-fields">
            <select id="partSelector">${state.partsCatalog
              .map(
                (part) =>
                  `<option value="${part.id}" data-price="${part.unit_price}">${escapeHtml(
                    `${part.name} • ${formatCurrency(part.unit_price)}`
                  )}</option>`
              )
              .join('')}</select>
            <input id="partQuantity" type="number" min="1" step="1" value="1" />
            <button id="addPartButton" class="btn btn-secondary" type="button">Adicionar peça</button>
          </div>
        </div>
        <div id="draftPartsTable">${renderDraftParts()}</div>
        <div class="form-group">
          <label for="laborDescription">Adicionar mão de obra</label>
          <div class="inline-fields">
            <input id="laborDescription" placeholder="Descrição" />
            <input id="laborHours" type="number" step="0.5" placeholder="Horas" />
            <input id="laborRate" type="number" step="0.01" placeholder="Valor/h" />
            <button id="addLaborButton" class="btn btn-secondary" type="button">Adicionar mão de obra</button>
          </div>
        </div>
        <div id="draftLaborTable">${renderDraftLabor()}</div>
        <div class="actions-row">
          <button class="btn btn-primary" type="submit" data-testid="save-order-button">Salvar atendimento</button>
          <p id="updateOrderFeedback" class="feedback-line"></p>
        </div>
      </form>

      <div class="stack-lg">
        <form id="statusForm" class="report-section stack-lg">
          <h2>Alterar status</h2>
          <div class="form-group">
            <label for="statusSelect">Novo status</label>
            <select id="statusSelect" name="status" data-testid="status-select">
              ${STATUS_FLOW.map(
                (status) =>
                  `<option value="${status}" ${status === order.current_status ? 'selected' : ''}>${status}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="statusNote">Observação</label>
            <textarea id="statusNote" name="note">Status atualizado pela oficina.</textarea>
          </div>
          <button class="btn btn-primary" type="submit" data-testid="status-submit">
            Atualizar status
          </button>
          <p id="statusFeedback" class="feedback-line"></p>
        </form>

        <form id="historyForm" class="report-section stack-lg">
          <h2>Adicionar histórico</h2>
          <div class="form-group">
            <label for="historyNote">Registro</label>
            <textarea id="historyNote" name="note"></textarea>
          </div>
          <button class="btn btn-secondary" type="submit">Registrar observação</button>
          <p id="historyFeedback" class="feedback-line"></p>
        </form>
      </div>
    </section>
  `;
}

function renderClientActions(order) {
  return `
    <section class="grid split-grid">
      <form id="acceptForm" class="report-section stack-lg">
        <h2>Aceite / assinatura</h2>
        <div class="form-group">
          <label for="signature_name">Nome da assinatura</label>
          <input id="signature_name" name="signature_name" value="${escapeHtml(order.signature_name || user.name)}" />
        </div>
        <div class="form-group">
          <label for="acceptance_notes">Observação</label>
          <textarea id="acceptance_notes" name="acceptance_notes"></textarea>
        </div>
        <label><input id="accepted" name="accepted" type="checkbox" /> Aprovo o orçamento e a execução</label>
        <button class="btn btn-primary" type="submit">Registrar aceite</button>
        <p id="acceptFeedback" class="feedback-line"></p>
      </form>

      <form id="historyForm" class="report-section stack-lg">
        <h2>Mensagem para a oficina</h2>
        <div class="form-group">
          <label for="historyNote">Observação</label>
          <textarea id="historyNote" name="note"></textarea>
        </div>
        <button class="btn btn-secondary" type="submit">Enviar atualização</button>
        <p id="historyFeedback" class="feedback-line"></p>
      </form>
    </section>
  `;
}

function renderDraftParts() {
  if (!state.draftParts.length) {
    return '<p class="empty-state">Nenhuma peça na edição atual.</p>';
  }

  return `
    <div class="table-shell">
      <table>
        <thead>
          <tr><th>Peça</th><th>Qtd</th><th>Valor unit.</th><th></th></tr>
        </thead>
        <tbody>
          ${state.draftParts
            .map(
              (part, index) => `
                <tr>
                  <td>${escapeHtml(part.name)}</td>
                  <td>${part.quantity}</td>
                  <td>${formatCurrency(part.unit_price)}</td>
                  <td><button class="btn btn-ghost" type="button" data-remove-part="${index}">Remover</button></td>
                </tr>
              `
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderDraftLabor() {
  if (!state.draftLabor.length) {
    return '<p class="empty-state">Nenhuma mão de obra na edição atual.</p>';
  }

  return `
    <div class="table-shell">
      <table>
        <thead>
          <tr><th>Descrição</th><th>Horas</th><th>Valor/h</th><th></th></tr>
        </thead>
        <tbody>
          ${state.draftLabor
            .map(
              (entry, index) => `
                <tr>
                  <td>${escapeHtml(entry.description)}</td>
                  <td>${entry.hours}</td>
                  <td>${formatCurrency(entry.hourly_rate)}</td>
                  <td><button class="btn btn-ghost" type="button" data-remove-labor="${index}">Remover</button></td>
                </tr>
              `
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

function bindCreateForm() {
  const form = document.getElementById('createRequestForm');
  const feedback = document.getElementById('createRequestFeedback');

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    feedback.textContent = 'Enviando solicitação...';

    const formData = new FormData(form);

    try {
      const order = await apiRequest('/api/orders', {
        method: 'POST',
        body: Object.fromEntries(formData.entries())
      });

      feedback.textContent = 'Solicitação criada com sucesso.';
      feedback.className = 'feedback-line success';
      form.reset();
      state.orders.unshift(order);
      state.selectedOrderId = order.id;
      renderOrdersList();
      await renderOrderDetail();
    } catch (error) {
      feedback.textContent = error.message;
      feedback.className = 'feedback-line error';
    }
  });
}

function bindDetailEvents(order) {
  const employeeUpdateForm = document.getElementById('employeeUpdateForm');
  const statusForm = document.getElementById('statusForm');
  const historyForm = document.getElementById('historyForm');
  const acceptForm = document.getElementById('acceptForm');

  document.getElementById('addPartButton')?.addEventListener('click', () => {
    const select = document.getElementById('partSelector');
    const selected = state.partsCatalog.find((part) => Number(part.id) === Number(select.value));
    const quantity = Number(document.getElementById('partQuantity').value || 1);

    if (!selected) {
      return;
    }

    state.draftParts.push({
      part_id: selected.id,
      name: selected.name,
      quantity,
      unit_price: Number(selected.unit_price)
    });

    document.getElementById('draftPartsTable').innerHTML = renderDraftParts();
    bindDraftRowEvents();
  });

  document.getElementById('addLaborButton')?.addEventListener('click', () => {
    const description = document.getElementById('laborDescription').value.trim();
    const hours = Number(document.getElementById('laborHours').value || 0);
    const rate = Number(document.getElementById('laborRate').value || 0);

    if (!description || !hours || !rate) {
      return;
    }

    state.draftLabor.push({
      description,
      hours,
      hourly_rate: rate
    });

    document.getElementById('laborDescription').value = '';
    document.getElementById('laborHours').value = '';
    document.getElementById('laborRate').value = '';
    document.getElementById('draftLaborTable').innerHTML = renderDraftLabor();
    bindDraftRowEvents();
  });

  bindDraftRowEvents();

  employeeUpdateForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const feedback = document.getElementById('updateOrderFeedback');
    feedback.textContent = 'Salvando atendimento...';

    try {
      await apiRequest(`/api/orders/${order.id}`, {
        method: 'PUT',
        body: {
          diagnosis: document.getElementById('diagnosis').value,
          budget_amount: document.getElementById('budget_amount').value,
          parts: state.draftParts,
          labor_entries: state.draftLabor
        }
      });

      feedback.textContent = 'Atendimento atualizado.';
      feedback.className = 'feedback-line success';
      await refreshOrders();
    } catch (error) {
      feedback.textContent = error.message;
      feedback.className = 'feedback-line error';
    }
  });

  statusForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const feedback = document.getElementById('statusFeedback');
    feedback.textContent = 'Atualizando status...';

    try {
      await apiRequest(`/api/orders/${order.id}/status`, {
        method: 'PATCH',
        body: {
          status: document.getElementById('statusSelect').value,
          note: document.getElementById('statusNote').value
        }
      });

      feedback.textContent = 'Status atualizado.';
      feedback.className = 'feedback-line success';
      await refreshOrders();
    } catch (error) {
      feedback.textContent = error.message;
      feedback.className = 'feedback-line error';
    }
  });

  historyForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const feedback = document.getElementById('historyFeedback');
    feedback.textContent = 'Registrando histórico...';

    try {
      await apiRequest(`/api/orders/${order.id}/history`, {
        method: 'POST',
        body: {
          note: document.getElementById('historyNote').value
        }
      });

      feedback.textContent = 'Histórico atualizado.';
      feedback.className = 'feedback-line success';
      await refreshOrders();
    } catch (error) {
      feedback.textContent = error.message;
      feedback.className = 'feedback-line error';
    }
  });

  acceptForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const feedback = document.getElementById('acceptFeedback');
    feedback.textContent = 'Registrando aceite...';

    try {
      await apiRequest(`/api/orders/${order.id}`, {
        method: 'PUT',
        body: {
          signature_name: document.getElementById('signature_name').value,
          acceptance_notes: document.getElementById('acceptance_notes').value,
          accepted: document.getElementById('accepted').checked
        }
      });

      feedback.textContent = 'Aceite registrado.';
      feedback.className = 'feedback-line success';
      await refreshOrders();
    } catch (error) {
      feedback.textContent = error.message;
      feedback.className = 'feedback-line error';
    }
  });
}

function bindDraftRowEvents() {
  document.querySelectorAll('[data-remove-part]').forEach((button) => {
    button.addEventListener('click', () => {
      state.draftParts.splice(Number(button.dataset.removePart), 1);
      document.getElementById('draftPartsTable').innerHTML = renderDraftParts();
      bindDraftRowEvents();
    });
  });

  document.querySelectorAll('[data-remove-labor]').forEach((button) => {
    button.addEventListener('click', () => {
      state.draftLabor.splice(Number(button.dataset.removeLabor), 1);
      document.getElementById('draftLaborTable').innerHTML = renderDraftLabor();
      bindDraftRowEvents();
    });
  });
}

async function refreshOrders() {
  state.orders = await apiRequest('/api/orders');
  renderOrdersList();
  await renderOrderDetail();
}
