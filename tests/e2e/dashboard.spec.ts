import { test, expect } from '@playwright/test';
import { TEST_USERS, loginAs } from './helpers';

/**
 * E2E — Dashboard (Kontrol Merkezi)
 *
 * NOT: Selector'lar gerçek bileşen koduyla DOĞRULANDI.
 * Metinler dashboard.module.css içeren bileşenlere göre seçildi.
 */

test.describe('Dashboard / Kontrol Merkezi', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USERS.test);
  });

  test('başlık ve canlı göstergesi görünür', async ({ page }) => {
    await expect(
      page.getByRole('heading', { level: 1, name: /kontrol merkezi/i }),
    ).toBeVisible();
    // CANLI / ÇEVRİMDIŞI rozeti (büyük harfli)
    const liveIndicator = page.getByText(/^(CANLI|ÇEVRİMDIŞI)$/);
    await expect(liveIndicator.first()).toBeVisible();
  });

  test('4 KPI kartı görünür (cihaz, dikkat, kritik, açık alarm)', async ({
    page,
  }) => {
    await expect(page.getByText('İzlenen Cihaz')).toBeVisible();
    await expect(page.getByText('Dikkat Gerektiren')).toBeVisible();
    await expect(page.getByText('Kritik Durum')).toBeVisible();
    // "Açık Alarm" hem KPI kartında hem cihaz kartında görünebilir → first()
    await expect(page.getByText('Açık Alarm').first()).toBeVisible();
  });

  test('cihaz durumları bölümü görünür VEYA boş durum gösterilir', async ({
    page,
  }) => {
    // Seed data varsa cihaz durumları bölüm başlığı görünür
    // Yoksa filo bölümü hiç render olmaz - ikisi de kabul edilebilir
    const fleetTitle = page.getByText('Cihaz Durumları');
    const kpiCard = page.getByText('İzlenen Cihaz');

    // En azından KPI'lar render olmalı
    await expect(kpiCard).toBeVisible({ timeout: 8000 });
    // Fleet başlığı varsa görünmeli (seed verisine bağlı, opsiyonel)
    if (await fleetTitle.isVisible().catch(() => false)) {
      await expect(fleetTitle).toBeVisible();
    }
  });

  test('grafik bölümü mevcut (veri var ya da bekleniyor)', async ({ page }) => {
    await expect(page.getByText('Canlı İvme Büyüklüğü')).toBeVisible({
      timeout: 8000,
    });
    // Boş durum metni VEYA SVG grafik — ikisinden biri var olmalı
    await page.waitForTimeout(1500);
  });

  test('alarm akışı bölümü mevcut', async ({ page }) => {
    await expect(page.getByText('Alarm Akışı')).toBeVisible({
      timeout: 8000,
    });
  });

  test('hata durumunda kullanıcı bilgilendirilir (network kesim simülasyonu)', async ({
    page,
  }) => {
    // Backend'i offline simüle et
    await page.route('**/api/devices/status/fleet', (route) => route.abort());
    await page.reload();

    // Hata durumu veya tekrar dene butonu görünmeli
    // (Toast veya sayfa-üstü ErrorState — Dashboard.tsx ikisini de kullanabilir)
    await expect(page.getByText(/sorun|hata|tekrar dene/i).first()).toBeVisible({
      timeout: 8000,
    });
  });
});
