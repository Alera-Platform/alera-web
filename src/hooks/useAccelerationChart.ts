import { useEffect, useRef, useState } from 'react';
import { sensorApi } from '../api/endpoints.js';
import { useSocket } from '../socket/SocketContext.js';
import { magnitude3D } from '../utils/sensorMath.js';
import type { SensorReading } from '../types/index.js';

/**
 * useAccelerationChart — Canlı + geçmiş ivme magnitude grafiği için
 * ortak veri mantığı. Dashboard ve DeviceDetailPage AYNI davranışı
 * paylaşsın diye tek yerde toplanmıştır (Priority 1: tutarlılık).
 *
 * TASARIM (Priority 2: donma/gecikme önleme):
 *   - Mobil ivmeölçer ~10Hz akar. Her okumada React state güncellemek
 *     saniyede 10 yeniden-render → donma/gecikme yaratır.
 *   - Çözüm: ham okumalar bir ref-buffer'a yazılır (render YOK). Sabit
 *     periyotlu (BUCKET_MS) bir interval bu pencereyi TEK noktaya indirir
 *     (peak-preserving: düşme tepeleri korunur) ve grafiğe ekler.
 *   - Render hızı veri hızından ayrıştırılır → öngörülebilir performans,
 *     sabit bellek (en fazla MAX_POINTS nokta), uzun oturumda kararlı.
 *
 * Socket dinleyicisi `deviceId`'ye bağlı yeniden bağlansa bile buffer
 * ref olduğu için veri kaybı olmaz; interval bağımsız çalışır.
 */

const BUCKET_MS = 1000; // 1 saniyelik agregasyon kovası
const MAX_POINTS = 240; // ~4 dakikalık görünür pencere
const HISTORY_LIMIT = 600; // backend latest üst sınırı (10Hz'de ~60sn)

export interface ChartPoint {
  t: string;
  magnitude: number;
}

interface UseAccelerationChartResult {
  chartData: ChartPoint[];
  /** Dışarıdan grafiği belirli bir tepe değeriyle "flash"lamak için (ops.). */
  reset: () => void;
}

export function useAccelerationChart(
  deviceId: string | null,
): UseAccelerationChartResult {
  const { onSensorReading } = useSocket();
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const sampleBufferRef = useRef<number[]>([]);

  // 1) Canlı sensör verisi → ref-buffer (render YOK, yalnızca biriktirme)
  useEffect(() => {
    if (!deviceId) return;
    const cleanup = onSensorReading((event) => {
      if (event.sensorType !== 'accelerometer') return;
      if (event.deviceId !== deviceId) return;
      sampleBufferRef.current.push(magnitude3D(event.data));
    });
    return cleanup;
  }, [deviceId, onSensorReading]);

  // 2) Downsampling interval'i — her BUCKET_MS'de buffer'ı tek noktaya indir.
  //    Veri hızından bağımsız sabit render ritmi → donma/gecikme olmaz.
  useEffect(() => {
    if (!deviceId) return;
    const interval = setInterval(() => {
      const samples = sampleBufferRef.current;
      if (samples.length === 0) return;
      const peak = Math.max(...samples);
      sampleBufferRef.current = [];
      const time = new Date().toLocaleTimeString('tr-TR');
      setChartData((prev) =>
        [...prev, { t: time, magnitude: Number(peak.toFixed(2)) }].slice(
          -MAX_POINTS,
        ),
      );
    }, BUCKET_MS);
    return () => clearInterval(interval);
  }, [deviceId]);

  // 3) Cihaz değişince geçmiş veriyi yükle (aynı bucket mantığıyla downsample)
  useEffect(() => {
    if (!deviceId) {
      setChartData([]);
      sampleBufferRef.current = [];
      return;
    }

    let cancelled = false;
    setChartData([]);
    sampleBufferRef.current = [];

    sensorApi
      .latestForDevice(deviceId, HISTORY_LIMIT)
      .then((readings: SensorReading[]) => {
        if (cancelled) return;
        const accel = [...readings]
          .reverse()
          .filter((r) => r.meta.sensorType === 'accelerometer');

        // Geçmişi de aynı BUCKET_MS kovalarına indir (canlı ile tutarlı)
        const buckets = new Map<number, { peak: number; t: string }>();
        for (const r of accel) {
          const ms = new Date(r.timestamp).getTime();
          const bucket = Math.floor(ms / BUCKET_MS);
          const mag = magnitude3D(r.data);
          const existing = buckets.get(bucket);
          if (!existing || mag > existing.peak) {
            buckets.set(bucket, {
              peak: mag,
              t: new Date(r.timestamp).toLocaleTimeString('tr-TR'),
            });
          }
        }

        const points: ChartPoint[] = [...buckets.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([, v]) => ({ t: v.t, magnitude: Number(v.peak.toFixed(2)) }));

        setChartData(points.slice(-MAX_POINTS));
      })
      .catch(() => {
        // Geçmiş yüklenemezse sessizce geç — canlı veri yine de dolar
      });

    return () => {
      cancelled = true;
    };
  }, [deviceId]);

  const reset = () => {
    setChartData([]);
    sampleBufferRef.current = [];
  };

  return { chartData, reset };
}

export { MAX_POINTS, BUCKET_MS };
