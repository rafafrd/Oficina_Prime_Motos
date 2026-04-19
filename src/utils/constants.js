const ORDER_STATUS_FLOW = [
  'Recebido',
  'Em diagnóstico',
  'Aguardando aprovação',
  'Aguardando peças',
  'Em manutenção',
  'Finalizado',
  'Entregue'
];

const USER_ROLES = ['client', 'employee', 'supplier'];
const APPOINTMENT_STATUSES = ['Solicitado', 'Confirmado', 'Reagendado', 'Concluído'];

module.exports = {
  ORDER_STATUS_FLOW,
  USER_ROLES,
  APPOINTMENT_STATUSES
};
