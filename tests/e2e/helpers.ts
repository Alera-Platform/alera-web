import { type Page, expect } from '@playwright/test';

/**
 * E2E Test Yardımcıları
 *
 * Backend'in seed-test-data ile başlatıldığı varsayılır:
 *   docker compose run --rm seed-test-data
 *
 * Bu, aşağıdaki test hesaplarını oluşturur.
 */

export const TEST_USERS = {
  test: {
    email: 'test@btu.edu.tr',
    password: 'Test1Pass',
  },
  admin: {
    email: 'admin@btu.edu.tr',
    password: 'Admin1Pass',
  },
};

/**
 * Bir kullanıcıyla giriş yap, dashboard'a düşmesini bekle.
 *
 * LoginPage gerçek HTML yapısı:
 *  - <label htmlFor="email">E-posta</label>
 *  - <label htmlFor="password">Parola</label>
 *  - <button type="submit">Giriş Yap</button>
 *
 * getByLabel kullanıyoruz — getByPlaceholder DEĞİL — çünkü placeholder'lar
 * gerçek değil örnek format gösterir ("ornek@btu.edu.tr", "••••••••").
 * Bu, accessibility ve UX için doğru pattern.
 */
export async function loginAs(
  page: Page,
  user: { email: string; password: string },
): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/e-?posta/i).fill(user.email);
  await page.getByLabel(/parola/i).fill(user.password);
  await page.getByRole('button', { name: /giriş yap/i }).click();
  // Dashboard'a yönlendirme bekle
  await expect(page).toHaveURL(/\/$|\/dashboard/, { timeout: 10_000 });
}

/**
 * Çıkış yap — eğer çıkış butonu varsa.
 */
export async function logout(page: Page): Promise<void> {
  const logoutBtn = page.getByRole('button', { name: /çıkış|logout/i });
  if (await logoutBtn.isVisible().catch(() => false)) {
    await logoutBtn.click();
    await expect(page).toHaveURL(/\/login/);
  }
}
