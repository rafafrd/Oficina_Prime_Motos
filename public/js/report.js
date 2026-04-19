import { apiRequest, escapeHtml, formatCurrency, formatDateTime, getQueryParam } from './api.js';
import { initializeProtectedPage, stateBlock, statusPill } from './common.js';

const user = await initializeProtectedPage({
  page: 'report',
  title: 'Relatório da Ordem',
  allowedRoles: ['client', 'employee', 'supplier']
});

let currentReport = null;

if (user) {
  await loadReport();
}

async function loadReport() {
  const reportId = getQueryParam('id');
  const container = document.getElementById('reportContainer');

  if (!reportId) {
    container.innerHTML = stateBlock('Informe o ID da ordem na URL.', 'error');
    return;
  }

  container.innerHTML = stateBlock('Carregando relatório...');

  try {
    currentReport = await apiRequest(`/api/reports/orders/${reportId}`);
    container.innerHTML = renderReport(currentReport);
    document.getElementById('generatePdfButton')?.addEventListener('click', generatePdf);
  } catch (error) {
    container.innerHTML = stateBlock(error.message, 'error');
  }
}

function renderReport(order) {
  return `
    <div class="report-layout" id="reportPrintSurface">
      <header class="report-head">
        <div>
          <div class="eyebrow">Ordem de serviço</div>
          <h1 class="report-title">${escapeHtml(order.code)}</h1>
          <p>${statusPill(order.current_status)}</p>
        </div>
        <div class="summary-list">
          <li><strong>Cliente</strong>${escapeHtml(order.client_name)}</li>
          <li><strong>Moto</strong>${escapeHtml(`${order.motorcycle.brand} ${order.motorcycle.model}`)}</li>
          <li><strong>Agenda</strong>${formatDateTime(order.scheduled_date)}</li>
        </div>
      </header>

      <section class="report-section">
        <h2>Defeito relatado</h2>
        <pre>${escapeHtml(order.reported_issue)}</pre>
      </section>

      <section class="report-section">
        <h2>Diagnóstico</h2>
        <pre>${escapeHtml(order.diagnosis || 'Diagnóstico não registrado.')}</pre>
      </section>

      <section class="grid split-grid">
        <div class="report-section">
          <h2>Peças usadas</h2>
          <pre>${escapeHtml(
            order.parts.length
              ? order.parts.map((part) => `${part.name} • ${part.quantity}x • ${formatCurrency(part.line_total)}`).join('\n')
              : 'Nenhuma peça registrada.'
          )}</pre>
        </div>
        <div class="report-section">
          <h2>Mão de obra</h2>
          <pre>${escapeHtml(
            order.labor_entries.length
              ? order.labor_entries
                  .map((entry) => `${entry.description} • ${entry.hours}h • ${formatCurrency(entry.total_price)}`)
                  .join('\n')
              : 'Nenhuma mão de obra registrada.'
          )}</pre>
        </div>
      </section>

      <section class="report-section">
        <h2>Financeiro</h2>
        <pre>${escapeHtml(
          [
            `Orçamento: ${formatCurrency(order.budget_amount)}`,
            `Peças: ${formatCurrency(order.parts_total)}`,
            `Mão de obra: ${formatCurrency(order.labor_total)}`,
            `Valor total: ${formatCurrency(order.total_amount)}`
          ].join('\n')
        )}</pre>
      </section>

      <section class="report-section">
        <h2>Histórico de atualização</h2>
        <pre>${escapeHtml(
          order.history
            .map(
              (item) =>
                `${formatDateTime(item.created_at)} • ${item.actor_name} • ${item.new_status || order.current_status}\n${item.note || ''}`
            )
            .join('\n\n')
        )}</pre>
      </section>

      <section class="report-section">
        <h2>Assinatura / aceite</h2>
        <pre>${escapeHtml(
          order.approval?.signed_by
            ? `${order.approval.signed_by} • ${formatDateTime(order.approval.signed_at)}\n${order.approval.notes || ''}`
            : 'Sem assinatura registrada.'
        )}</pre>
      </section>
    </div>
  `;
}

function generatePdf() {
  if (!currentReport || !window.jspdf?.jsPDF) {
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const lines = buildPdfLines(currentReport);
  const maxWidth = 180;
  let y = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(`Relatorio ${currentReport.code}`, 14, y);
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);

  lines.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, maxWidth);

    if (y + wrapped.length * 6 > 280) {
      doc.addPage();
      y = 20;
    }

    doc.text(wrapped, 14, y);
    y += wrapped.length * 6 + 3;
  });

  doc.save(`${currentReport.code}.pdf`);
}

function buildPdfLines(order) {
  const lines = [
    `Status atual: ${order.current_status}`,
    `Cliente: ${order.client_name}`,
    `Moto: ${order.motorcycle.brand} ${order.motorcycle.model} ${order.motorcycle.year} - ${order.motorcycle.plate}`,
    `Defeito relatado: ${order.reported_issue}`,
    `Diagnostico: ${order.diagnosis || 'Nao informado'}`,
    `Orcamento: ${formatCurrency(order.budget_amount)}`,
    `Pecas total: ${formatCurrency(order.parts_total)}`,
    `Mao de obra total: ${formatCurrency(order.labor_total)}`,
    `Valor total: ${formatCurrency(order.total_amount)}`,
    '',
    'Pecas usadas:'
  ];

  if (order.parts.length) {
    order.parts.forEach((part) => {
      lines.push(`- ${part.name} | ${part.quantity}x | ${formatCurrency(part.line_total)}`);
    });
  } else {
    lines.push('- Nenhuma peca registrada');
  }

  lines.push('', 'Mao de obra:');

  if (order.labor_entries.length) {
    order.labor_entries.forEach((entry) => {
      lines.push(`- ${entry.description} | ${entry.hours}h | ${formatCurrency(entry.total_price)}`);
    });
  } else {
    lines.push('- Nenhuma mao de obra registrada');
  }

  lines.push('', 'Historico:');
  order.history.forEach((item) => {
    lines.push(`- ${formatDateTime(item.created_at)} | ${item.actor_name} | ${item.new_status || order.current_status}`);
    lines.push(`  ${item.note || 'Sem observacao'}`);
  });

  lines.push('', 'Aceite / assinatura:');
  lines.push(
    order.approval?.signed_by
      ? `${order.approval.signed_by} em ${formatDateTime(order.approval.signed_at)}`
      : 'Sem assinatura registrada'
  );

  return lines;
}
