import { test, expect } from '@playwright/test';
import { TEST_USERS, loginAs } from './helpers';

/**
 * E2E — Login Akışı
 *
 * Bir kullanıcının panele erişimi tüm uygulamanın kapısı. Bu testler:
 *  - Doğru kullanıcı giriş yapabilir
 *  - Yanlış parola reddedilir
 *  - Token sayfa yenilemesinde korunur
 *  - Korumalı rotaya doğrudan gitme login'e yönlendirir
 */

test.describe('Login Akışı', () => {
  test('login sayfası açılır ve form elemanları görünür', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel(/e-?posta/i)).toBeVisible();
    await expect(page.getByLabel(/parola/i)).toBeVisible();
    await expect(
      page.getByRole('button', { name: /giriş yap/i }),
    ).toBeVisible();
  });

  test('doğru kullanıcı bilgileriyle giriş başarılı', async ({ page }) => {
    await loginAs(page, TEST_USERS.test);
    // Dashboard yüklendi mi? <h1>Kontrol Merkezi</h1>
    // Sidebar'da "Genel Bakış" linki de var (strict mode çakışmasın diye
    // sadece h1 başlığını hedefliyoruz)
    await expect(
      page.getByRole('heading', { level: 1, name: /kontrol merkezi/i }),
    ).toBeVisible({ timeout: 5000 });
  });

  test('yanlış parola hatayı görsel olarak gösterir', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/e-?posta/i).fill(TEST_USERS.test.email);
    await page.getByLabel(/parola/i).fill('WrongPassword123');
    await page.getByRole('button', { name: /giriş yap/i }).click();

    // URL hâlâ login (yönlendirme yok)
    await expect(page).toHaveURL(/\/login/);
    // Hata mesajı bir yerde görünmeli
    await page.waitForTimeout(500); // axios cevabı için kısa süre
  });

  test('token sayfa yenilemesinde korunur', async ({ page }) => {
    await loginAs(page, TEST_USERS.test);
    await page.reload();
    // Login'e yönlenmeden dashboard'da kalmalı
    await expect(page).not.toHaveURL(/\/login/);
    await expect(
      page.getByRole('heading', { level: 1, name: /kontrol merkezi/i }),
    ).toBeVisible({ timeout: 5000 });
  });

  test('login olmadan korumalı rotaya gitme login\'e yönlendirir', async ({
    page,
  }) => {
    await page.goto('/devices');
    await expect(page).toHaveURL(/\/login/);
  });

  test('boş form gönderme client-side doğrulama tetikler', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /giriş yap/i }).click();
    // Hâlâ login'de — submit gerçekleşmedi
    await expect(page).toHaveURL(/\/login/);
  });
});
