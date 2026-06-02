import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Konfigürasyonu
 *
 * Bu konfigürasyon:
 *  - E2E testleri tests/e2e/ klasöründen alır
 *  - Frontend'i otomatik başlatır (npm run dev)
 *  - Backend'in 3000 portunda çalıştığını varsayar (manuel başlatılmalı)
 *
 * Çalıştırma:
 *   1. docker compose up -d         # backend + mongodb
 *   2. docker compose run --rm seed-test-data
 *   3. npm run test:e2e:install     # ilk seferde browser indir
 *   4. npm run test:e2e
 *
 * Backend ve seed olmadan testler çoğu yerde 401/500 alır.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // Tek tek koşsun — UI state'i izolasyonsuz olabilir
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Vite dev server'ı otomatik başlat (testler bitince kapanır)
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    // Vite'ın WebSocket proxy uyarıları (ECONNABORTED) test sonuçlarını
    // etkilemez — Playwright Page kapanırken WebSocket'lerin TCP-level
    // abort olmasının doğal sonucudur. stdout'u 'pipe' yaparak sadece
    // gerçek hataları ve test çıktısını ön planda tutuyoruz.
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
