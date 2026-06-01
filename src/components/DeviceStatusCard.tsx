import { Link } from 'react-router-dom';
import type {
  DeviceStatusSummary,
  ConnectivityState,
  OverallHealth,
} from '../types/index.js';
import { formatRelativeTime } from '../utils/sensorMath.js';
import styles from './DeviceStatusCard.module.css';

/**
 * Cihaz Durum Kartı
 *
 * Bir cihazın YORUMLANMIŞ durumunu gösterir — ham sensör verisi değil.
 * Backend'in deviceStatus servisinden gelen özeti görselleştirir:
 *  - Genel sağlık (kart kenarlık rengi)
 *  - Bağlantı durumu (online/idle/offline)
 *  - Aktivite durumu (hareketli/durağan)
 *  - Açık alarm sayısı
 *
 * Bu kart, "panel ham veri değil anlam göstersin" hedefinin merkezinde.
 */

const CONNECTIVITY_LABEL: Record<ConnectivityState, string> = {
  online: 'Çevrimiçi',
  idle: 'Beklemede',
  offline: 'Çevrimdışı',
};

const OVERALL_LABEL: Record<OverallHealth, string> = {
  ok: 'Normal',
  attention: 'Dikkat',
  critical: 'Kritik',
  'no-data': 'Veri Yok',
};

export function DeviceStatusCard({
  status,
}: {
  status: DeviceStatusSummary;
}) {
  const { connectivity, activity, alarms, overall } = status;

  return (
    <Link
      to={`/devices/${status.deviceId}`}
      className={`panel ${styles.card} ${styles[`overall_${overall}`]}`}
    >
      {/* Üst satır: cihaz adı + genel sağlık rozeti */}
      <div className={styles.head}>
        <div className={styles.nameWrap}>
          <span
            className={`pulse-dot ${connectivityDotClass(connectivity.state)}`}
            aria-hidden
          />
          <span className={styles.name}>{status.deviceName}</span>
        </div>
        <span className={`${styles.healthBadge} ${styles[`badge_${overall}`]}`}>
          {OVERALL_LABEL[overall]}
        </span>
      </div>

      {/* Durum satırları */}
      <div className={styles.rows}>
        <StatusRow
          label="Bağlantı"
          value={CONNECTIVITY_LABEL[connectivity.state]}
          detail={
            connectivity.lastSeenAt
              ? formatRelativeTime(connectivity.lastSeenAt)
              : undefined
          }
        />
        <StatusRow
          label="Hareket"
          value={
            activity.state === 'active'
              ? 'Hareketli'
              : activity.state === 'still'
                ? 'Durağan'
                : 'Bilinmiyor'
          }
          detail={
            activity.averageMagnitude !== null
              ? `${activity.averageMagnitude.toFixed(1)} m/s²`
              : undefined
          }
        />
        <StatusRow
          label="Açık Alarm"
          value={alarms.open === 0 ? 'Yok' : String(alarms.open)}
          highlight={alarms.open > 0}
        />
      </div>

      {/* Aktivite açıklaması — yorumlanmış metin */}
      <p className={styles.description}>{activity.description}</p>
    </Link>
  );
}

function StatusRow({
  label,
  value,
  detail,
  highlight,
}: {
  label: string;
  value: string;
  detail?: string;
  highlight?: boolean;
}) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <span
        className={`${styles.rowValue} ${highlight ? styles.rowHighlight : ''}`}
      >
        {value}
        {detail && <span className={styles.rowDetail}> · {detail}</span>}
      </span>
    </div>
  );
}

function connectivityDotClass(state: ConnectivityState): string {
  if (state === 'online') return '';
  if (state === 'idle') return 'warn';
  return 'offline';
}
