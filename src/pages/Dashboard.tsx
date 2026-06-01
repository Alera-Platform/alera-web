import { useEffect, useState, useRef, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { useSocket } from '../socket/SocketContext.js';
import { useToast } from '../components/ToastContext.js';
import { deviceApi, alarmApi } from '../api/endpoints.js';
import { extractErrorMessage } from '../api/client.js';
import { SeverityBadge, alarmTypeLabel } from '../components/Badges.js';
import { DeviceStatusCard } from '../components/DeviceStatusCard.js';
import { LoadingState, ErrorState } from '../components/StateViews.js';
import {
  FALL_THRESHOLD,
  classifyIntensity,
  intensityColor,
} from '../utils/sensorMath.js';
import { useAccelerationChart } from '../hooks/useAccelerationChart.js';
import type { Alarm, AlarmEvent, DeviceStatusSummary } from '../types/index.js';
import styles from './Dashboard.module.css';

/**
 * Genel Bakış — Kontrol Merkezi
 *
 * Ham veri değil, YORUMLANMIŞ durum gösterir:
 *  - Üstte: filo özeti (kaç cihaz hangi sağlıkta)
 *  - Cihaz durum kartları (her cihazın yorumlanmış durumu)
 *  - Canlı ivme grafiği (düşme eşiği referans çizgisiyle)
 *  - Canlı alarm akışı
 *
 * Birden fazla cihaz olduğunda grafik için cihaz seçici sunar
 * (önceki sürüm tüm cihazları tek grafiğe karıştırıyordu).
 */
export function Dashboard() {
  const { onSensorReading, onAlarmNew } = useSocket();
  const { showError } = useToast();

  const [fleet, setFleet] = useState<DeviceStatusSummary[]>([]);
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const flashIdRef = useRef<string | null>(null);

  // BUG 3: Her cihazın son veri etkileşim zamanı (en yeni = en solda).
  // deviceId → timestamp(ms). Canlı sensör verisi geldikçe güncellenir.
  const [deviceActivity, setDeviceActivity] = useState<Record<string, number>>(
    {},
  );

  // BUG 3: Yatay kaydırma track referansı (wheel → horizontal)
  const trackRef = useRef<HTMLDivElement | null>(null);

  // İvme grafiği — DeviceDetailPage ile AYNI hook (tutarlılık + donma önleme).
  // Geçmiş + canlı downsampling + peak-preserving tek yerde.
  const { chartData } = useAccelerationChart(selectedDeviceId);

  // İlk veri yükleme — fleet status + son alarmlar
  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      deviceApi.getFleetStatus(),
      alarmApi.list({ limit: 20 }),
    ])
      .then(([fleetData, alarmRes]) => {
        setFleet(fleetData);
        setAlarms(alarmRes.items);
        // Grafik için varsayılan cihaz: ilk cihaz
        if (fleetData.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(fleetData[0].deviceId);
        }
      })
      .catch((err) => {
        const msg = extractErrorMessage(err);
        setError(msg);
        showError(`Panel verileri yüklenemedi: ${msg}`);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Canlı sensör verisi → cihaz aktivite zamanı (BUG 3: şerit sıralaması).
  // Grafik verisi artık useAccelerationChart hook'unda işleniyor; burada
  // yalnızca "hangi cihaz en son veri gönderdi" bilgisini izliyoruz.
  useEffect(() => {
    const cleanup = onSensorReading((event) => {
      setDeviceActivity((prev) => ({
        ...prev,
        [event.deviceId]: Date.now(),
      }));
    });
    return cleanup;
  }, [onSensorReading]);

  // Canlı alarm akışı
  useEffect(() => {
    const cleanup = onAlarmNew((event: AlarmEvent) => {
      flashIdRef.current = event.id;
      setAlarms((prev) => [{ ...event } as Alarm, ...prev].slice(0, 20));
      // Grafik, alarmı üreten cihaza geçsin — operatör olayı hemen
      // canlı ivme grafiğinde görebilsin. Cihaz değişimi grafiği
      // sıfırlar (aşağıdaki selectedDeviceId effect'i), yeni cihazın
      // verisi gelir gelmez çizilmeye başlar.
      setSelectedDeviceId(event.deviceId);
    });
    return cleanup;
  }, [onAlarmNew]);

  // BUG 3: Fare cihaz şeridinin üzerindeyken dikey wheel → yatay kaydırma.
  // Aşağı kaydır → pencereler sağa kayar (scrollLeft artar).
  // Yukarı kaydır → pencereler sola kayar (scrollLeft azalır).
  // Görünür scrollbar yok (CSS ile gizli). preventDefault için non-passive.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const handleWheel = (e: WheelEvent) => {
      // Yalnızca baskın hareket dikey ise yataya çevir
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      track.scrollLeft += e.deltaY;
    };

    track.addEventListener('wheel', handleWheel, { passive: false });
    return () => track.removeEventListener('wheel', handleWheel);
  }, [fleet.length]);

  // Filo özeti — sağlık durumuna göre sayım
  const summary = useMemo(() => {
    return {
      total: fleet.length,
      ok: fleet.filter((d) => d.overall === 'ok').length,
      attention: fleet.filter((d) => d.overall === 'attention').length,
      critical: fleet.filter((d) => d.overall === 'critical').length,
      openAlarms: fleet.reduce((sum, d) => sum + d.alarms.open, 0),
    };
  }, [fleet]);

  // BUG 3: Cihazları son etkileşim zamanına göre sırala (en yeni → en solda).
  // Aktivitesi olmayan cihazlar (hiç canlı veri gelmemiş) sona düşer,
  // kendi aralarında orijinal sırayı korur.
  const orderedFleet = useMemo(() => {
    return [...fleet].sort((a, b) => {
      const ta = deviceActivity[a.deviceId] ?? 0;
      const tb = deviceActivity[b.deviceId] ?? 0;
      return tb - ta; // büyük timestamp (daha yeni) önce
    });
  }, [fleet, deviceActivity]);

  // Grafiğin en yüksek değeri — eşik çizgisini bağlama oturtmak için
  const peakMagnitude = useMemo(() => {
    return chartData.reduce((max, p) => Math.max(max, p.magnitude), 0);
  }, [chartData]);

  if (loading) {
    return <LoadingState label="Kontrol merkezi yükleniyor…" />;
  }

  if (error && fleet.length === 0) {
    return <ErrorState message={error} onRetry={load} />;
  }

  return (
    <div className={styles.page}>
      {/* Filo özeti — anlamlı KPI'lar */}
      <div className={styles.statGrid}>
        <StatCard
          label="İzlenen Cihaz"
          value={summary.total}
          sub={`${summary.ok} normal durumda`}
          accent="var(--accent)"
        />
        <StatCard
          label="Dikkat Gerektiren"
          value={summary.attention}
          sub="izlenmeli"
          accent="var(--status-warn)"
        />
        <StatCard
          label="Kritik Durum"
          value={summary.critical}
          sub="acil müdahale"
          accent="var(--status-crit)"
        />
        <StatCard
          label="Açık Alarm"
          value={summary.openAlarms}
          sub="çözülmemiş"
          accent="var(--status-info)"
        />
      </div>

      {/* BUG 3: Canlı ivme grafiği ÜSTTE (sabit konumda, aşağı itilmez) */}
      <div className={styles.mainGrid}>
        {/* Canlı grafik */}
        <section className={`panel ${styles.chartPanel}`}>
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>Canlı İvme Büyüklüğü</h2>
            {/* F9: cihaz seçici — birden fazla cihaz varsa */}
            {fleet.length > 1 && (
              <select
                className={styles.deviceSelect}
                value={selectedDeviceId ?? ''}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
              >
                {fleet.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.deviceName}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className={styles.chartBody}>
            {chartData.length === 0 ? (
              <div className={styles.emptyChart}>
                <ChartWaitIcon />
                <p>Sensör verisi bekleniyor…</p>
                <span>
                  Seçili cihaz veri göndermeye başladığında grafik canlanacak
                </span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid
                    stroke="var(--border-subtle)"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    dataKey="t"
                    stroke="var(--text-dim)"
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                    minTickGap={40}
                  />
                  <YAxis
                    stroke="var(--text-dim)"
                    tick={{ fontSize: 10 }}
                    width={36}
                    domain={[0, (max: number) => Math.max(max, FALL_THRESHOLD + 5)]}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-panel-raised)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 12,
                    }}
                    labelStyle={{ color: 'var(--text-secondary)' }}
                    formatter={(value: number) => [
                      `${value} m/s²`,
                      'Büyüklük',
                    ]}
                  />
                  {/* F7: düşme eşiği referans çizgisi — grafik artık yorumlanabilir */}
                  <ReferenceLine
                    y={FALL_THRESHOLD}
                    stroke="var(--status-crit)"
                    strokeDasharray="5 4"
                    strokeOpacity={0.7}
                    label={{
                      value: `Düşme eşiği (${FALL_THRESHOLD})`,
                      position: 'insideTopRight',
                      fill: 'var(--status-crit)',
                      fontSize: 10,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="magnitude"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          {/* Grafik altı yorum — son tepe değeri ne anlama geliyor */}
          {chartData.length > 0 && (
            <div className={styles.chartFooter}>
              <span
                className={styles.chartReading}
                style={{ color: intensityColor(classifyIntensity(peakMagnitude)) }}
              >
                Son pencere tepesi: {peakMagnitude.toFixed(1)} m/s²
              </span>
              <span className={styles.chartHint}>
                {intensityHint(peakMagnitude)}
              </span>
            </div>
          )}
        </section>

        {/* Canlı alarm akışı */}
        <section className={`panel ${styles.alarmPanel}`}>
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>Alarm Akışı</h2>
            <span className={styles.panelMeta}>son 20</span>
          </div>
          <div className={styles.alarmFeed}>
            {alarms.length === 0 ? (
              <div className={styles.emptyFeed}>
                <p>Henüz alarm yok</p>
                <span>Sistem normal çalışıyor</span>
              </div>
            ) : (
              alarms.map((alarm) => (
                <AlarmRow
                  key={alarm.id}
                  alarm={alarm}
                  flash={flashIdRef.current === alarm.id}
                />
              ))
            )}
          </div>
        </section>
      </div>

      {/* BUG 3: Cihaz durumları — grafiğin ALTINDA, yatay şeritte.
          - Yan yana (horizontal), dikey değil
          - Fare üzerindeyken wheel → yatay kaydırma (görünür scrollbar yok)
          - En son veri etkileşimi olan cihaz en solda */}
      {orderedFleet.length > 0 && (
        <section className={styles.fleetSection}>
          <h2 className={styles.sectionTitle}>Cihaz Durumları</h2>
          <div className={styles.fleetTrack} ref={trackRef}>
            {orderedFleet.map((status) => (
              <div key={status.deviceId} className={styles.fleetItem}>
                <DeviceStatusCard status={status} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/** İvme tepe değerine göre kısa yorum metni. */
function intensityHint(magnitude: number): string {
  const level = classifyIntensity(magnitude);
  switch (level) {
    case 'critical':
      return 'Şiddetli darbe seviyesinde — kontrol önerilir';
    case 'fall':
      return 'Düşme eşiğinin üzerinde';
    case 'elevated':
      return 'Yoğun hareket — normal aktivite olabilir';
    default:
      return 'Normal aralıkta';
  }
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number;
  sub: string;
  accent: string;
}) {
  return (
    <div className={`panel ${styles.statCard}`}>
      <div className={styles.statBar} style={{ background: accent }} />
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue} style={{ color: accent }}>
        {value}
      </div>
      <div className={styles.statSub}>{sub}</div>
    </div>
  );
}

function AlarmRow({ alarm, flash }: { alarm: Alarm; flash: boolean }) {
  return (
    <div
      className={styles.alarmRow}
      style={flash ? { animation: 'flash-in 0.5s ease' } : undefined}
    >
      <div className={styles.alarmRowTop}>
        <span className={styles.alarmType}>{alarmTypeLabel(alarm.type)}</span>
        <SeverityBadge severity={alarm.severity} />
      </div>
      <p className={styles.alarmDesc}>{alarm.description}</p>
      <span className={styles.alarmTime}>
        {new Date(alarm.triggeredAt).toLocaleString('tr-TR')}
      </span>
    </div>
  );
}

function ChartWaitIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <path
        d="M4 28 L14 18 L22 24 L36 8"
        stroke="var(--border-strong)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="36" cy="8" r="3" fill="var(--accent)" />
    </svg>
  );
}
