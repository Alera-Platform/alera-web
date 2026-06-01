import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
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
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { deviceApi, sensorApi, alarmApi } from '../api/endpoints.js';
import { extractErrorMessage } from '../api/client.js';
import { useSocket } from '../socket/SocketContext.js';
import { FALL_THRESHOLD } from '../utils/sensorMath.js';
import { useAccelerationChart } from '../hooks/useAccelerationChart.js';
import {
  SeverityBadge,
  StatusBadge,
  alarmTypeLabel,
} from '../components/Badges.js';
import type { Device, SensorReading, Alarm } from '../types/index.js';
import styles from './DeviceDetailPage.module.css';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Leaflet varsayılan ikon yolu düzeltmesi (Vite ile bundle uyumu)
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

/**
 * Cihaz detay sayfası.
 *
 * - Cihaz bilgileri
 * - Geçmiş + canlı ivme grafiği (Dashboard ile ortak hook)
 * - Son GPS konumu haritada
 */
export function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { onSensorReading, onAlarmNew, subscribeDevice, unsubscribeDevice } =
    useSocket();

  const [device, setDevice] = useState<Device | null>(null);
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [lastGps, setLastGps] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // İvme grafiği — Dashboard ile AYNI hook (tutarlı davranış + downsampling).
  // Geçmiş yükleme + canlı downsampling + peak-preserving hook içinde.
  const { chartData } = useAccelerationChart(id ?? null);

  // İlk yükleme: cihaz + cihaza özel alarmlar + son konum
  useEffect(() => {
    if (!id) return;
    setLoading(true);

    Promise.all([
      deviceApi.get(id),
      alarmApi.list({ deviceId: id, limit: 50 }),
      // KONUM AYRI ÇEKİLİR: GPS çok daha seyrek toplanır (hareket olmadıkça
      // neredeyse hiç). Karışık "son N okuma" içinde GPS kaybolabilir; bu
      // yüzden son GPS okumasını sensorType filtresiyle HEDEFLİ sorguluyoruz.
      sensorApi
        .list({ deviceId: id, sensorType: 'gps', limit: 1, order: 'desc' })
        .catch(() => [] as SensorReading[]),
    ])
      .then(([dev, alarmRes, gpsReadings]) => {
        setDevice(dev);
        setAlarms(alarmRes.items);

        const lastGpsReading = gpsReadings[0];
        if (lastGpsReading) {
          const { lat, lng } = lastGpsReading.data;
          if (typeof lat === 'number' && typeof lng === 'number') {
            setLastGps({ lat, lng });
          }
        }
      })
      .catch((e) => setError(extractErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [id]);

  // Cihaz room'una abone ol
  useEffect(() => {
    if (!id) return;
    subscribeDevice(id);
    return () => unsubscribeDevice(id);
  }, [id, subscribeDevice, unsubscribeDevice]);

  // Canlı GPS — grafik hook'tan geldiği için burada yalnızca konumu izliyoruz
  useEffect(() => {
    if (!id) return;
    const cleanup = onSensorReading((event) => {
      if (event.deviceId !== id) return;
      if (event.sensorType === 'gps') {
        const { lat, lng } = event.data;
        if (typeof lat === 'number' && typeof lng === 'number') {
          setLastGps({ lat, lng });
        }
      }
    });
    return cleanup;
  }, [id, onSensorReading]);

  // Canlı: bu cihaza yeni alarm gelirse listeye ekle
  useEffect(() => {
    if (!id) return;
    const cleanup = onAlarmNew((event) => {
      if (event.deviceId !== id) return;
      setAlarms((prev) => [{ ...event } as Alarm, ...prev]);
    });
    return cleanup;
  }, [id, onAlarmNew]);

  if (loading) {
    return (
      <div className={styles.loadingWrap}>
        <div className="spinner" />
      </div>
    );
  }

  if (error || !device) {
    return (
      <div className={styles.page}>
        <Link to="/devices" className={styles.back}>
          ← Cihazlara dön
        </Link>
        <div className={`panel ${styles.errorPanel}`}>
          {error ?? 'Cihaz bulunamadı'}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Link to="/devices" className={styles.back}>
        ← Cihazlar
      </Link>

      <header className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>{device.name}</h1>
        </div>
        <span
          className={device.active ? styles.activeBadge : styles.inactiveBadge}
        >
          {device.active ? 'Aktif' : 'Pasif'}
        </span>
      </header>

      {/* Bilgi şeridi */}
      <div className={styles.infoStrip}>
        <InfoItem label="Platform" value={device.platform} />
        <InfoItem label="Model" value={device.model || '—'} />
        <InfoItem
          label="Son Veri"
          value={
            device.lastSeenAt
              ? new Date(device.lastSeenAt).toLocaleString('tr-TR')
              : 'Hiç'
          }
        />
        <InfoItem
          label="Kayıt"
          value={new Date(device.createdAt).toLocaleDateString('tr-TR')}
        />
      </div>

      <div className={styles.contentGrid}>
        {/* Grafik */}
        <section className={`panel ${styles.chartPanel}`}>
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>İvme Büyüklüğü Geçmişi</h2>
            <span className={styles.panelMeta}>m/s² · canlı</span>
          </div>
          <div className={styles.chartBody}>
            {chartData.length === 0 ? (
              <div className={styles.emptyChart}>
                <p>Bu cihazdan henüz ivme verisi yok</p>
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
                    interval="preserveEnd"
                  />
                  <YAxis
                    stroke="var(--text-dim)"
                    tick={{ fontSize: 10 }}
                    width={36}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-panel-raised)',
                      border: '1px solid var(--border-default)',
                      borderRadius: '4px',
                      fontSize: 12,
                    }}
                  />
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
        </section>

        {/* Harita */}
        <section className={`panel ${styles.mapPanel}`}>
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>Son Konum</h2>
            <span className={styles.panelMeta}>GPS</span>
          </div>
          <div className={styles.mapBody}>
            {lastGps ? (
              <MapContainer
                center={[lastGps.lat, lastGps.lng]}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
                key={`${lastGps.lat},${lastGps.lng}`}
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[lastGps.lat, lastGps.lng]}>
                  <Popup>{device.name}</Popup>
                </Marker>
              </MapContainer>
            ) : (
              <div className={styles.emptyMap}>
                <p>GPS verisi yok</p>
                <span>Bu cihaz konum bilgisi göndermedi</span>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Cihaza özel alarmlar (Bug 1) */}
      <section className={`panel ${styles.alarmsPanel}`}>
        <div className={styles.panelHead}>
          <h2 className={styles.panelTitle}>Bu Cihazın Alarmları</h2>
          <span className={styles.panelMeta}>{alarms.length} kayıt</span>
        </div>
        {alarms.length === 0 ? (
          <div className={styles.emptyAlarms}>
            <p>Bu cihaz için alarm kaydı yok</p>
          </div>
        ) : (
          <div className={styles.alarmList}>
            {alarms.map((alarm) => (
              <button
                key={alarm.id}
                className={styles.alarmRow}
                onClick={() =>
                  navigate(`/alarms?deviceId=${id}`)
                }
                title="Alarmlar sayfasında bu cihazın alarmlarını gör"
              >
                <div className={styles.alarmRowMain}>
                  <span className={styles.alarmType}>
                    {alarmTypeLabel(alarm.type)}
                  </span>
                  <SeverityBadge severity={alarm.severity} />
                  <StatusBadge status={alarm.status} />
                </div>
                <p className={styles.alarmDesc}>{alarm.description}</p>
                <span className={styles.alarmTime}>
                  {new Date(alarm.triggeredAt).toLocaleString('tr-TR')}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.infoItem}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={styles.infoValue}>{value}</span>
    </div>
  );
}
