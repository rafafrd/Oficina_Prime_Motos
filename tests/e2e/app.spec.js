const { test, expect } = require('@playwright/test');

async function login(page, email, password) {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(password);
  await Promise.all([
    page.waitForURL(/dashboard|supplier/),
    page.getByRole('button', { name: 'Entrar no sistema' }).click()
  ]);
}

test('fluxo de login e redirecionamento funcionam', async ({ page }) => {
  await login(page, 'cliente@oficina.local', 'Cliente@123');

  await expect(page).toHaveURL(/dashboard/);
  await expect(page.getByText('Dashboard da oficina')).toBeVisible();
});

test('cliente visualiza status da ordem e o modo escuro está aplicado', async ({ page }) => {
  await login(page, 'cliente@oficina.local', 'Cliente@123');
  await page.goto('/requests');
  await expect(page.getByText('Fluxo de atendimento')).toBeVisible();

  await expect(page.locator('[data-testid="history-list"]')).toBeVisible();
  await expect(page.locator('.status-pill').first()).toContainText('Aguardando aprovação');

  const backgroundToken = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
  );

  expect(backgroundToken).toBe('#0a0d10');
});

test('funcionário altera status pela interface e histórico aparece', async ({ page }) => {
  await login(page, 'funcionario@oficina.local', 'Oficina@123');
  await page.goto('/requests');
  await expect(page.getByText('Fluxo de atendimento')).toBeVisible();

  await page.locator('[data-testid="status-select"]').selectOption('Aguardando peças');
  await page.locator('[data-testid="status-submit"]').click();

  await expect(page.locator('.status-pill').first()).toContainText('Aguardando peças');
  await expect(page.locator('[data-testid="history-list"]')).toContainText('Status atualizado pela oficina');
});

test('botão de gerar PDF funciona', async ({ page }) => {
  await login(page, 'funcionario@oficina.local', 'Oficina@123');
  await page.goto('/report?id=1');
  await expect(page.locator('[data-testid="pdf-button"]')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.locator('[data-testid="pdf-button"]').click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('OS-0001.pdf');
});

test('páginas principais carregam sem erro crítico', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await login(page, 'funcionario@oficina.local', 'Oficina@123');
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Ordens recentes' })).toBeVisible();

  await page.goto('/requests');
  await expect(page.getByText('Fluxo de atendimento')).toBeVisible();

  await page.goto('/appointments');
  await expect(page.getByText('Agenda integrada')).toBeVisible();

  expect(pageErrors).toEqual([]);
});
