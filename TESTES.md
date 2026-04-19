# TESTES.md

## Instalação

```bash
npm install
```

## Inicialização do banco SQLite

Banco principal:

```bash
npm run db:reset
```

Banco isolado para API:

```bash
npm run db:reset:test:api
```

Banco isolado para interface:

```bash
npm run db:reset:test:e2e
```

## Execução do servidor

```bash
npm start
```

Abra:

```text
http://localhost:3000/login
```

## Execução dos testes de API

```bash
npm run test:api
```

Cobertura implementada:

- login com credenciais válidas
- login com senha inválida
- acesso negado sem autenticação
- cliente cria solicitação
- cliente visualiza apenas suas ordens
- funcionário atualiza status
- funcionário registra diagnóstico e orçamento
- fornecedor acessa apenas recursos permitidos
- histórico é criado em mudança de status
- cálculo de valor total com peças + mão de obra

## Execução dos testes de interface

```bash
npm run test:e2e
```

Cobertura implementada:

- fluxo de login
- redirecionamento após login
- cliente visualiza status da ordem
- funcionário altera status pela interface
- histórico aparece na tela
- botão de gerar PDF funciona
- modo escuro aplicado
- páginas principais carregam sem erro crítico

## Checklist manual de validação

1. Entrar com `cliente@oficina.local / Cliente@123`.
2. Acessar `Ordens` e conferir o status da ordem `OS-0001`.
3. Criar uma nova solicitação com data preferencial.
4. Ir em `Agenda` e verificar o novo agendamento.
5. Entrar com `funcionario@oficina.local / Oficina@123`.
6. Abrir `Ordens`, alterar diagnóstico, orçamento e status.
7. Confirmar se o histórico foi atualizado.
8. Abrir o relatório da ordem e gerar o PDF.
9. Entrar com `fornecedor@oficina.local / Fornecedor@123`.
10. Validar que a área do fornecedor mostra apenas peças e ordens vinculadas.

## Credenciais seed

- Cliente: `cliente@oficina.local` / `Cliente@123`
- Cliente 2: `cliente2@oficina.local` / `Cliente2@123`
- Funcionário: `funcionario@oficina.local` / `Oficina@123`
- Admin: `admin@oficina.local` / `Admin@123`
- Fornecedor: `fornecedor@oficina.local` / `Fornecedor@123`
