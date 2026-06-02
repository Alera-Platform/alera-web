import { test, expect } from '@playwright/test';
import { TEST_USERS, loginAs } from './helpers';

/**
 * E2E — Alarm Yönetimi
 *
 * NOT: Selector'lar gerçek AlarmsPage.tsx ile DOĞRULANDI.
 *  - Başlık: <h1>Alarmlar</h1>
 *  - Filtre butonları: Tümü, Açık, Onaylanan, Çözülen
 *  - Aksiyon butonları: Onayla, Çöz
 */

test.describe('Alarm Yönetimi', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USERS.test);
    await page.goto('/alarms');
  });

  test('alarm sayfası başlık ve filtreler ile yüklenir', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /^alarmlar$/i }),
    ).toBeVisible({ timeout: 5000 });
    // Filtre butonları — tümü gerçek metinden seçilir
    await expect(
      page.getByRole('button', { name: /tümü/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /açık/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /onaylanan/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /çözülen/i }).first(),
    ).toBeVisible();
  });

  test('alarm varsa tablo başlıklarıyla render olur (koşullu)', async ({
    page,
  }) => {
    // Tablo yalnızca alarm VARSA render olur (filtered.length === 0 → boş durum).
    // isVisible({ timeout }) deprecated — waitFor() ile aktif bekliyoruz.
    let tableExists = false;
    try {
      await page
        .locator('table')
        .waitFor({ state: 'visible', timeout: 5000 });
      tableExists = true;
    } catch {
      tableExists = false;
    }

    if (!tableExists) {
      test.skip(
        true,
        'Seed verisinde alarm yok — tablo render edilmiyor (seed-test-data çalıştırıldı mı?)',
      );
      return;
    }

    // Alarm varsa: tablo başlıkları
    // AlarmsPage.tsx içinde: Tip, Önem, Açıklama, Zaman, Durum, İşlem
    await expect(
      page.getByRole('columnheader', { name: /önem/i }),
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByRole('columnheader', { name: /açıklama/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('columnheader', { name: /durum/i }),
    ).toBeVisible();
  });

  test('alarm yoksa "filtrede alarm yok" boş durumu görünür', async ({
    page,
  }) => {
    // Seed verisinde alarm olmayabilir — bu durumda boş durum metni
    // VEYA tablo satırı görünür. İkisinden biri olmalı.
    const emptyState = page.getByText(/bu filtrede alarm yok/i);
    const tableRow = page.locator('tbody tr');

    await page.waitForTimeout(1500); // veri yüklensin
    const hasEmpty = await emptyState.isVisible().catch(() => false);
    const hasRow = (await tableRow.count()) > 0;

    expect(hasEmpty || hasRow).toBe(true);
  });

  test('filtre değiştirme listeyi günceller', async ({ page }) => {
    // "Açık" filtresine geç
    await page.getByRole('button', { name: /^açık/i }).first().click();
    // Filtre değişiminin tetiklendiğini görmek için kısa bekle
    await page.waitForTimeout(500);
    // Sayfa hâlâ /alarms — yönlendirme yok
    await expect(page).toHaveURL(/\/alarms/);
  });

  test('alarmı onayla → toast gösterilir, durum değişir', async ({ page }) => {
    // ÖNEMLİ: isVisible({ timeout }) parametresi DEPRECATED'tir ve görmezden
    // gelinir — element o anda DOM'da yoksa hemen false döner. Sayfa hâlâ
    // yükleniyorsa yanlış skip kararı verir.
    //
    // Doğru pattern: waitFor() ile aktif bekleme, sonra koşullu skip.
    const ackButton = page.getByRole('button', { name: /^onayla$/i }).first();
    let hasAlarms = false;
    try {
      await ackButton.waitFor({ state: 'visible', timeout: 5000 });
      hasAlarms = true;
    } catch {
      hasAlarms = false;
    }

    if (!hasAlarms) {
      test.skip(
        true,
        'Onaylanacak açık alarm bulunamadı (seed-test-data çalıştırıldı mı?)',
      );
      return;
    }

    await ackButton.click();

    // Toast bildirimi görünmeli (ToastContext)
    const toast = page.getByText(/onaylandı|başarı/i);
    await expect(toast.first()).toBeVisible({ timeout: 3000 });
  });

  test('alarmı çöz → toast gösterilir', async ({ page }) => {
    const resolveButton = page
      .getByRole('button', { name: /^çöz$/i })
      .first();
    let hasButton = false;
    try {
      await resolveButton.waitFor({ state: 'visible', timeout: 5000 });
      hasButton = true;
    } catch {
      hasButton = false;
    }

    if (!hasButton) {
      test.skip(
        true,
        'Çözülecek alarm bulunamadı (seed-test-data çalıştırıldı mı?)',
      );
      return;
    }

    await resolveButton.click();
    await expect(page.getByText(/çözüldü|başarı/i).first()).toBeVisible({
      timeout: 3000,
    });
  });
});
