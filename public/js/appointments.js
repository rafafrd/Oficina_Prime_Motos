import { apiRequest, escapeHtml, formatDateTime } from './api.js';
import { initializeProtectedPage, stateBlock, statusPill } from './common.js';

const user = await initializeProtectedPage({
  page: 'appointments',
  title: 'Agenda',
  allowedRoles: ['client', 'employee']
});

if (user) {
  await loadAppointments();
}

async function loadAppointments() {
  const board = document.getElementById('appointmentsBoard');
  board.innerHTML = stateBlock('Carregando agenda...');

  try {
    const appointments = await apiRequest('/api/appointments');

    if (!appointments.length) {
      board.innerHTML = stateBlock('Nenhum agendamento encontrado.', 'loading');
      return;
    }

    board.innerHTML = `
      <div class="order-list">
        ${appointments
          .map(
            (appointment) => `
              <article class="appointment-card order-card">
                <header>
                  <div>
                    <h3>${escapeHtml(appointment.order_code)}</h3>
                    <p>${escapeHtml(`${appointment.client_name} • ${appointment.motorcycle_label}`)}</p>
                  </div>
                  ${statusPill(appointment.status)}
                </header>
                <div class="key-grid">
                  <div>
                    <span>Preferência</span>
                    <strong>${formatDateTime(appointment.preferred_date)}</strong>
                  </div>
                  <div>
                    <span>Agendado</span>
                    <strong>${formatDateTime(appointment.scheduled_date)}</strong>
                  </div>
                </div>
                <p>${escapeHtml(appointment.notes || 'Sem observações.')}</p>
                ${user.role === 'employee' ? renderAppointmentForm(appointment) : ''}
              </article>
            `
          )
          .join('')}
      </div>
    `;

    if (user.role === 'employee') {
      bindAppointmentForms();
    }
  } catch (error) {
    board.innerHTML = stateBlock(error.message, 'error');
  }
}

function renderAppointmentForm(appointment) {
  return `
    <form class="stack-lg appointment-form" data-appointment-id="${appointment.id}">
      <div class="inline-fields">
        <input name="scheduled_date" type="datetime-local" value="${toLocalInputValue(appointment.scheduled_date)}" />
        <select name="status">
          ${['Solicitado', 'Confirmado', 'Reagendado', 'Concluído']
            .map(
              (status) =>
                `<option value="${status}" ${status === appointment.status ? 'selected' : ''}>${status}</option>`
            )
            .join('')}
        </select>
      </div>
      <textarea name="notes">${escapeHtml(appointment.notes || '')}</textarea>
      <div class="actions-row">
        <button class="btn btn-primary" type="submit">Salvar agendamento</button>
        <p class="feedback-line"></p>
      </div>
    </form>
  `;
}

function bindAppointmentForms() {
  document.querySelectorAll('.appointment-form').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const feedback = form.querySelector('.feedback-line');
      feedback.textContent = 'Salvando...';

      try {
        const formData = new FormData(form);
        await apiRequest(`/api/appointments/${form.dataset.appointmentId}`, {
          method: 'PUT',
          body: Object.fromEntries(formData.entries())
        });

        feedback.textContent = 'Agendamento atualizado.';
        feedback.className = 'feedback-line success';
        await loadAppointments();
      } catch (error) {
        feedback.textContent = error.message;
        feedback.className = 'feedback-line error';
      }
    });
  });
}

function toLocalInputValue(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}
