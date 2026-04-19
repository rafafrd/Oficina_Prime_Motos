const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true
  },
  webServer: {
    command: 'npm run db:reset:test:e2e && npm run start:test:e2e',
    url: 'http://127.0.0.1:4173/login',
    reuseExistingServer: false,
    timeout: 120000
  }
});
