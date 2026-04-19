INSERT INTO users (id, name, email, password_hash, role, phone, is_admin) VALUES
  (1, 'Ana Silva', 'cliente@oficina.local', '__CLIENT_ANA_HASH__', 'client', '(11) 98888-1001', 0),
  (2, 'Bruno Lima', 'cliente2@oficina.local', '__CLIENT_BRUNO_HASH__', 'client', '(11) 98888-1002', 0),
  (3, 'Carlos Souza', 'funcionario@oficina.local', '__EMPLOYEE_HASH__', 'employee', '(11) 98888-2001', 0),
  (4, 'Marta Rocha', 'admin@oficina.local', '__ADMIN_HASH__', 'employee', '(11) 98888-2002', 1),
  (5, 'Moto Peças Alpha', 'fornecedor@oficina.local', '__SUPPLIER_HASH__', 'supplier', '(11) 98888-3001', 0);

INSERT INTO clients (id, user_id, document, address) VALUES
  (1, 1, '123.456.789-10', 'Rua das Oficinas, 100'),
  (2, 2, '987.654.321-00', 'Av. dos Mecânicos, 45');

INSERT INTO employees (id, user_id, position) VALUES
  (1, 3, 'Técnico de Manutenção'),
  (2, 4, 'Supervisor de Oficina');

INSERT INTO suppliers (id, user_id, company_name) VALUES
  (1, 5, 'Moto Peças Alpha');

INSERT INTO motorcycles (id, client_id, brand, model, year, plate, color, notes) VALUES
  (1, 1, 'Yamaha', 'Fazer 250', 2021, 'ABC1D23', 'Azul', 'Revisão programada e ruído no freio dianteiro'),
  (2, 2, 'Honda', 'CG 160', 2020, 'XYZ9K87', 'Preta', 'Falha de partida e troca de relação');

INSERT INTO service_orders (
  id,
  code,
  client_id,
  motorcycle_id,
  assigned_employee_id,
  preferred_date,
  scheduled_date,
  reported_issue,
  diagnosis,
  current_status,
  budget_amount,
  parts_total,
  labor_total,
  total_amount,
  signature_name,
  signature_accepted_at
) VALUES
  (
    1,
    'OS-0001',
    1,
    1,
    1,
    '2026-04-21T09:00:00.000Z',
    '2026-04-21T10:00:00.000Z',
    'Cliente relata ruído metálico na dianteira e revisão dos 10 mil km.',
    'Pastilhas dianteiras gastas e necessidade de alinhamento da pinça.',
    'Aguardando aprovação',
    380.00,
    180.00,
    120.00,
    300.00,
    NULL,
    NULL
  ),
  (
    2,
    'OS-0002',
    2,
    2,
    1,
    '2026-04-22T13:30:00.000Z',
    '2026-04-22T15:00:00.000Z',
    'Moto não liga pela manhã e cliente pede troca de relação.',
    'Bateria no fim da vida útil e kit relação com desgaste excessivo.',
    'Em manutenção',
    560.00,
    360.00,
    150.00,
    510.00,
    'Bruno Lima',
    '2026-04-18T16:00:00.000Z'
  );

INSERT INTO service_order_history (service_order_id, user_id, previous_status, new_status, note) VALUES
  (1, 1, NULL, 'Recebido', 'Solicitação criada pelo cliente no portal.'),
  (1, 3, 'Recebido', 'Em diagnóstico', 'Moto recebida e triagem iniciada.'),
  (1, 3, 'Em diagnóstico', 'Aguardando aprovação', 'Diagnóstico concluído e orçamento enviado.'),
  (2, 2, NULL, 'Recebido', 'Solicitação criada pelo cliente.'),
  (2, 3, 'Recebido', 'Em diagnóstico', 'Avaliação elétrica iniciada.'),
  (2, 3, 'Em diagnóstico', 'Aguardando peças', 'Peças solicitadas ao fornecedor.'),
  (2, 3, 'Aguardando peças', 'Em manutenção', 'Peças recebidas e serviço iniciado.');

INSERT INTO parts (id, supplier_id, name, sku, unit_price, stock_quantity) VALUES
  (1, 1, 'Pastilha de freio dianteira', 'PFD-001', 90.00, 12),
  (2, 1, 'Bateria 12V selada', 'BAT-160', 190.00, 6),
  (3, 1, 'Kit relação CG 160', 'KRCG-160', 170.00, 4);

INSERT INTO service_order_parts (service_order_id, part_id, quantity, unit_price, line_total) VALUES
  (1, 1, 2, 90.00, 180.00),
  (2, 2, 1, 190.00, 190.00),
  (2, 3, 1, 170.00, 170.00);

INSERT INTO labor_entries (service_order_id, employee_id, description, hours, hourly_rate, total_price) VALUES
  (1, 1, 'Revisão geral e alinhamento da pinça', 2, 60.00, 120.00),
  (2, 1, 'Troca de bateria, kit relação e regulagens', 2.5, 60.00, 150.00);

INSERT INTO appointments (
  id,
  service_order_id,
  client_id,
  preferred_date,
  scheduled_date,
  status,
  notes,
  created_by_user_id,
  updated_by_user_id
) VALUES
  (1, 1, 1, '2026-04-21T09:00:00.000Z', '2026-04-21T10:00:00.000Z', 'Confirmado', 'Atendimento de revisão com inspeção de freio.', 1, 3),
  (2, 2, 2, '2026-04-22T13:30:00.000Z', '2026-04-22T15:00:00.000Z', 'Confirmado', 'Veículo ficará na oficina para execução do serviço.', 2, 3);

INSERT INTO approvals_or_signatures (service_order_id, accepted, signed_by, signed_at, notes) VALUES
  (1, 0, NULL, NULL, 'Aguardando aceite do cliente.'),
  (2, 1, 'Bruno Lima', '2026-04-18T16:00:00.000Z', 'Cliente aprovou troca das peças principais.');
