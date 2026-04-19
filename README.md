# Oficina Prime Motos

Sistema web MVC para agenda, solicitações e ordens de serviço de uma oficina especializada em conserto e manutenção de motos. O projeto usa front-end em HTML/CSS/JavaScript puro, back-end em Node.js + Express, banco SQLite, autenticação por sessão com cookie `httpOnly` e geração de PDF no client-side com `jsPDF`.

## Visão geral do sistema

O sistema atende três perfis:

- Cliente: abre solicitação, acompanha status, histórico, agenda e aceite.
- Funcionário: atualiza diagnóstico, orçamento, peças, mão de obra, agenda e status.
- Fornecedor: consulta peças próprias e pedidos vinculados às ordens.

Funcionalidades principais:

- Login, sessão persistente e logout.
- Controle de acesso por perfil.
- Ordens de serviço com fluxo obrigatório:
  `Recebido`, `Em diagnóstico`, `Aguardando aprovação`, `Aguardando peças`, `Em manutenção`, `Finalizado`, `Entregue`.
- Histórico de atualizações por ordem.
- Agenda integrada com data preferencial e reagendamento.
- Relatório de ordem com exportação PDF no navegador.
- Dashboard técnico em modo escuro, responsivo e orientado à operação interna.
- Testes automatizados com Jest + Supertest e Playwright.

## Stack usada

- Front-end: HTML, CSS e JavaScript puro
- Back-end: Node.js + Express
- Banco de dados: SQLite
- Arquitetura: MVC
- Autenticação: `express-session`
- Hash de senha: `bcryptjs`
- PDF client-side: `jsPDF`
- Testes de API: Jest + Supertest
- Testes E2E: Playwright

## Estrutura de pastas

```text
.
├── package.json
├── package-lock.json
├── server.js
├── README.md
├── TESTES.md
├── progression.txt
├── jest.config.js
├── playwright.config.js
├── public
│   ├── appointments.html
│   ├── dashboard.html
│   ├── login.html
│   ├── report.html
│   ├── requests.html
│   ├── supplier.html
│   ├── css
│   │   └── style.css
│   └── js
│       ├── api.js
│       ├── appointments.js
│       ├── auth.js
│       ├── common.js
│       ├── dashboard.js
│       ├── report.js
│       ├── requests.js
│       └── supplier.js
├── src
│   ├── app.js
│   ├── config
│   │   └── db.js
│   ├── controllers
│   ├── database
│   │   ├── .gitkeep
│   │   ├── init.js
│   │   └── reset.js
│   ├── middlewares
│   ├── models
│   ├── routes
│   ├── services
│   ├── utils
│   ├── schema.sql
│   └── seed.sql
└── tests
    ├── api
    │   └── auth-orders.test.js
    └── e2e
        └── app.spec.js
```

## Schema do banco

Tabelas implementadas:

- `users`
- `clients`
- `employees`
- `suppliers`
- `motorcycles`
- `service_orders`
- `service_order_history`
- `parts`
- `service_order_parts`
- `labor_entries`
- `appointments`
- `approvals_or_signatures`

Pontos do schema:

- Chaves primárias e estrangeiras.
- `CHECK` para perfis e status válidos.
- `timestamps` com `CURRENT_TIMESTAMP`.
- Totais da ordem persistidos em `parts_total`, `labor_total` e `total_amount`.
- Seeds iniciais para cliente, funcionário, administrador e fornecedor.

O schema completo está em [src/schema.sql](/C:/Users/Rafael/Documents/Programação/Estudo/openclaude%20Test/src/schema.sql) e as seeds em [src/seed.sql](/C:/Users/Rafael/Documents/Programação/Estudo/openclaude%20Test/src/seed.sql).

## Como instalar

```bash
npm install
```

## Como rodar

1. Reinicialize e popule o banco:

```bash
npm run db:reset
```

2. Suba o servidor:

```bash
npm start
```

3. Acesse:

```text
http://localhost:3000/login
```

## Como popular o banco

As seeds são aplicadas pelo script de reset. Para recriar o banco do zero:

```bash
npm run db:reset
```

## Credenciais seed

- Cliente principal: `cliente@oficina.local` / `Cliente@123`
- Cliente secundário: `cliente2@oficina.local` / `Cliente2@123`
- Funcionário: `funcionario@oficina.local` / `Oficina@123`
- Funcionário admin: `admin@oficina.local` / `Admin@123`
- Fornecedor: `fornecedor@oficina.local` / `Fornecedor@123`

## Como executar testes

API:

```bash
npm run test:api
```

Interface:

```bash
npm run test:e2e
```

Todos:

```bash
npm test
```

## Endpoints principais

### Auth

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Usuários

- `POST /api/users`
- `GET /api/users/:id`
- `PUT /api/users/:id`

### Ordens

- `GET /api/orders`
- `GET /api/orders/:id`
- `POST /api/orders`
- `PUT /api/orders/:id`
- `PATCH /api/orders/:id/status`
- `POST /api/orders/:id/history`

### Agenda

- `GET /api/appointments`
- `POST /api/appointments`
- `PUT /api/appointments/:id`

### Peças / fornecimento

- `GET /api/parts`
- `POST /api/parts`
- `GET /api/suppliers/orders`

### Relatórios

- `GET /api/reports/orders`
- `GET /api/reports/orders/:id`

## Observações de segurança

- Senhas ficam em hash com `bcryptjs`.
- Sessão usa cookie `httpOnly` e `sameSite=lax`.
- Rotas internas exigem autenticação.
- Regras de autorização por perfil são aplicadas via middleware.
- Sanitização mínima e mensagens de erro consistentes foram adicionadas no back-end.
