/**
 * Sensör Verisi Yorumlama Yardımcıları
 *
 * Bu modül, ham sensör verisini kullanıcı için anlamlı bilgiye çevirir.
 * Backend'deki analysis/utils.ts ile aynı matematiği kullanır — tutarlılık
 * için tek bir doğruluk kaynağı.
 *
 * Dashboard, DeviceDetailPage gibi bileşenler magnitude hesabını
 * kendileri yapmak yerine buradan kullanır (kod tekrarı önlenir).
 */

/** Yerçekimi ivmesi (m/s²) — gForce hesaplaması için referans. */
export const GRAVITY = 9.81;

/**
 * Düşme tespit eşikleri.
 *
 * NOT: Bu değerler backend'in env varsayılanlarıyla eşleşir
 * (FALL_MAGNITUDE_THRESHOLD=25, FALL_CRITICAL_THRESHOLD=40).
 * Backend bu eşikleri değiştirirse grafiğin referans çizgisi de
 * güncellenmelidir. İdeal çözüm bunu API'den çekmektir; şimdilik
 * görsel referans amaçlı sabit tutuldu.
 */
export const FALL_THRESHOLD = 25;
export const FALL_CRITICAL_THRESHOLD = 40;

/**
 * 3 eksenli vektörün büyüklüğü: |a| = √(x² + y² + z²)
 *
 * İvmeölçer için durağan cihaz ~9.81 m/s², darbe >25 m/s².
 */
export function magnitude3D(data: {
  x?: number;
  y?: number;
  z?: number;
}): number {
  const { x = 0, y = 0, z = 0 } = data;
  return Math.sqrt(x * x + y * y + z * z);
}

/** Magnitude'u yerçekimi katına (G) çevir. */
export function toGForce(magnitude: number): number {
  return magnitude / GRAVITY;
}

/** Bir ivme okumasının tehlike seviyesi. */
export type IntensityLevel = 'normal' | 'elevated' | 'fall' | 'critical';

/**
 * İvme büyüklüğünü yorumlayıp bir tehlike seviyesi döndür.
 *
 * - normal:    durağan veya normal hareket (< ~18)
 * - elevated:  yoğun hareket, koşma/zıplama (18 – eşik)
 * - fall:      düşme şüphesi (eşik – kritik)
 * - critical:  şiddetli darbe (≥ kritik)
 */
export function classifyIntensity(magnitude: number): IntensityLevel {
  if (magnitude >= FALL_CRITICAL_THRESHOLD) return 'critical';
  if (magnitude >= FALL_THRESHOLD) return 'fall';
  if (magnitude >= 18) return 'elevated';
  return 'normal';
}

/** Tehlike seviyesinin tema rengi (CSS değişkeni). */
export function intensityColor(level: IntensityLevel): string {
  switch (level) {
    case 'critical':
      return 'var(--status-crit)';
    case 'fall':
      return 'var(--sev-high)';
    case 'elevated':
      return 'var(--status-warn)';
    default:
      return 'var(--accent)';
  }
}

/**
 * "Son görülme" zamanını insan-okunur göreli ifadeye çevir.
 * Örn: "az önce", "3 dk önce", "2 saat önce".
 */
export function formatRelativeTime(
  isoString: string | null | undefined,
): string {
  if (!isoString) return 'hiç';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const sec = Math.floor(diffMs / 1000);

  if (sec < 10) return 'az önce';
  if (sec < 60) return `${sec} sn önce`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} dk önce`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} saat önce`;
  const day = Math.floor(hr / 24);
  return `${day} gün önce`;
}

/**
 * Saniye cinsinden süreyi okunabilir ifadeye çevir.
 * Örn: 45 → "45 sn", 150 → "2 dk", 7200 → "2 saat".
 */
export function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—';
  if (seconds < 60) return `${seconds} sn`;
  const min = Math.floor(seconds / 60);
  if (min < 60) return `${min} dk`;
  const hr = Math.floor(min / 60);
  return `${hr} saat`;
}
