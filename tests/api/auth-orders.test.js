const request = require('supertest');

const app = require('../../src/app');
const { initializeDatabase } = require('../../src/database/init');
const { closeDb } = require('../../src/config/db');

async function loginAs(agent, email, password) {
  return agent.post('/api/auth/login').send({ email, password });
}

describe('API de autenticação e ordens', () => {
  beforeEach(async () => {
    await initializeDatabase({ force: true, seed: true });
  });

  afterAll(async () => {
    await closeDb();
  });

  test('login com credenciais válidas', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'cliente@oficina.local',
      password: 'Cliente@123'
    });

    expect(response.status).toBe(200);
    expect(response.body.data.email).toBe('cliente@oficina.local');
    expect(response.body.data.role).toBe('client');
  });

  test('login com senha inválida', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'cliente@oficina.local',
      password: 'senha-errada'
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/credenciais/i);
  });

  test('acesso negado sem autenticação', async () => {
    const response = await request(app).get('/api/orders');

    expect(response.status).toBe(401);
  });

  test('cliente consegue criar solicitação', async () => {
    const agent = request.agent(app);
    await loginAs(agent, 'cliente@oficina.local', 'Cliente@123');

    const createResponse = await agent.post('/api/orders').send({
      brand: 'Suzuki',
      model: 'V-Strom 650',
      year: 2022,
      plate: 'BRA2E19',
      preferred_date: '2026-04-23T09:30',
      reported_issue: 'Cliente relata vibração na dianteira e troca de óleo.',
      motorcycle_notes: 'Solicita revisão antes de viagem.'
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.current_status).toBe('Recebido');

    const ordersResponse = await agent.get('/api/orders');
    expect(ordersResponse.body.data).toHaveLength(2);
  });

  test('cliente só vê suas próprias ordens', async () => {
    const agent = request.agent(app);
    await loginAs(agent, 'cliente@oficina.local', 'Cliente@123');

    const ordersResponse = await agent.get('/api/orders');
    expect(ordersResponse.status).toBe(200);
    expect(ordersResponse.body.data).toHaveLength(1);
    expect(ordersResponse.body.data[0].code).toBe('OS-0001');

    const forbiddenResponse = await agent.get('/api/reports/orders/2');
    expect(forbiddenResponse.status).toBe(403);
  });

  test('funcionário consegue atualizar status', async () => {
    const agent = request.agent(app);
    await loginAs(agent, 'funcionario@oficina.local', 'Oficina@123');

    const response = await agent.patch('/api/orders/1/status').send({
      status: 'Aguardando peças',
      note: 'Aguardando chegada das peças do freio.'
    });

    expect(response.status).toBe(200);
    expect(response.body.data.current_status).toBe('Aguardando peças');
  });

  test('funcionário consegue registrar diagnóstico e orçamento', async () => {
    const agent = request.agent(app);
    await loginAs(agent, 'funcionario@oficina.local', 'Oficina@123');

    const response = await agent.put('/api/orders/1').send({
      diagnosis: 'Troca de pastilhas, limpeza do sistema e sangria.',
      budget_amount: 420,
      parts: [
        {
          part_id: 1,
          quantity: 2,
          unit_price: 90
        }
      ],
      labor_entries: [
        {
          description: 'Troca e sangria do freio',
          hours: 2,
          hourly_rate: 80
        }
      ]
    });

    expect(response.status).toBe(200);
    expect(response.body.data.diagnosis).toMatch(/Troca de pastilhas/i);
    expect(response.body.data.budget_amount).toBe(420);
  });

  test('fornecedor acessa apenas recursos permitidos', async () => {
    const agent = request.agent(app);
    await loginAs(agent, 'fornecedor@oficina.local', 'Fornecedor@123');

    const supplierOrders = await agent.get('/api/suppliers/orders');
    const forbiddenOrders = await agent.get('/api/orders');
    const parts = await agent.get('/api/parts');

    expect(supplierOrders.status).toBe(200);
    expect(parts.status).toBe(200);
    expect(forbiddenOrders.status).toBe(403);
  });

  test('histórico é criado quando status muda', async () => {
    const agent = request.agent(app);
    await loginAs(agent, 'funcionario@oficina.local', 'Oficina@123');

    await agent.patch('/api/orders/1/status').send({
      status: 'Aguardando peças',
      note: 'Dependência do fornecedor.'
    });

    const reportResponse = await agent.get('/api/reports/orders/1');

    expect(reportResponse.status).toBe(200);
    expect(reportResponse.body.data.history.some((item) => /Dependência do fornecedor/i.test(item.note))).toBe(true);
  });

  test('cálculo de valor total funciona', async () => {
    const agent = request.agent(app);
    await loginAs(agent, 'funcionario@oficina.local', 'Oficina@123');

    const response = await agent.put('/api/orders/1').send({
      diagnosis: 'Atualização financeira',
      budget_amount: 999,
      parts: [
        {
          part_id: 1,
          quantity: 1,
          unit_price: 90
        }
      ],
      labor_entries: [
        {
          description: 'Serviço técnico',
          hours: 3,
          hourly_rate: 70
        }
      ]
    });

    expect(response.status).toBe(200);
    expect(response.body.data.parts_total).toBe(90);
    expect(response.body.data.labor_total).toBe(210);
    expect(response.body.data.total_amount).toBe(300);
  });
});
