import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { deviceApi } from '../api/endpoints.js';
import { extractErrorMessage } from '../api/client.js';
import type { Device } from '../types/index.js';
import styles from './DevicesPage.module.css';

/**
 * Cihaz yönetim sayfası — listele, ekle, durum değiştir, sil.
 */
export function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    deviceApi
      .list()
      .then(setDevices)
      .catch((e) => setError(extractErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleToggleActive = async (device: Device) => {
    try {
      await deviceApi.update(device.id, { active: !device.active });
      load();
    } catch (e) {
      setError(extractErrorMessage(e));
    }
  };

  const handleDelete = async (device: Device) => {
    if (
      !window.confirm(
        `"${device.name}" cihazını silmek istediğinize emin misiniz?`,
      )
    ) {
      return;
    }
    try {
      await deviceApi.remove(device.id);
      load();
    } catch (e) {
      setError(extractErrorMessage(e));
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <p className={styles.subtitle}>
            Tüm cihazlarınız ve durumları
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm((s) => !s)}
        >
          {showForm ? 'İptal' : '+ Yeni Cihaz'}
        </button>
      </header>

      {error && <div className={styles.error}>{error}</div>}

      {showForm && (
        <CreateDeviceForm
          onCreated={() => {
            setShowForm(false);
            load();
          }}
          onError={setError}
        />
      )}

      {loading ? (
        <div className={styles.loadingWrap}>
          <div className="spinner" />
        </div>
      ) : devices.length === 0 ? (
        <div className={`panel ${styles.empty}`}>
          <h3>Henüz cihaz yok</h3>
          <p>İzlemeye başlamak için ilk cihazınızı ekleyin.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {devices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              onToggle={() => handleToggleActive(device)}
              onDelete={() => handleDelete(device)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DeviceCard({
  device,
  onToggle,
  onDelete,
}: {
  device: Device;
  onToggle: () => void;
  onDelete: () => void;
}) {
  // "Son görülme" — 2 dk içinde veri geldiyse online say
  const isOnline =
    device.lastSeenAt &&
    Date.now() - new Date(device.lastSeenAt).getTime() < 120_000;

  return (
    <div className={`panel ${styles.card}`}>
      <div className={styles.cardHead}>
        <span
          className={`pulse-dot ${
            !device.active ? 'offline' : isOnline ? '' : 'offline'
          }`}
          aria-hidden
        />
        <div className={styles.cardName}>{device.name}</div>
        <span className={styles.platform}>{device.platform}</span>
      </div>

      <dl className={styles.specs}>
        <div>
          <dt>Model</dt>
          <dd>{device.model || '—'}</dd>
        </div>
        <div>
          <dt>Durum</dt>
          <dd className={device.active ? styles.active : styles.inactive}>
            {device.active ? 'Aktif' : 'Pasif'}
          </dd>
        </div>
        <div>
          <dt>Son veri</dt>
          <dd>
            {device.lastSeenAt
              ? new Date(device.lastSeenAt).toLocaleString('tr-TR')
              : 'Hiç'}
          </dd>
        </div>
      </dl>

      <div className={styles.cardActions}>
        <Link to={`/devices/${device.id}`} className="btn btn-sm">
          Detay
        </Link>
        <button className="btn btn-sm" onClick={onToggle}>
          {device.active ? 'Pasifleştir' : 'Aktifleştir'}
        </button>
        <button className="btn btn-sm btn-danger" onClick={onDelete}>
          Sil
        </button>
      </div>
    </div>
  );
}

function CreateDeviceForm({
  onCreated,
  onError,
}: {
  onCreated: () => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('android');
  const [model, setModel] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await deviceApi.create({
        name,
        platform,
        model: model || undefined,
      });
      onCreated();
    } catch (err) {
      onError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className={`panel ${styles.form}`} onSubmit={handleSubmit}>
      <div className={styles.formRow}>
        <div className={styles.formField}>
          <label className="field-label">Cihaz Adı</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="örn. Babaannemin Telefonu"
            required
          />
        </div>
        <div className={styles.formField}>
          <label className="field-label">Platform</label>
          <select
            className="input"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
          >
            <option value="android">Android</option>
            <option value="ios">iOS</option>
            <option value="other">Diğer</option>
          </select>
        </div>
        <div className={styles.formField}>
          <label className="field-label">Model (opsiyonel)</label>
          <input
            className="input"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="örn. Galaxy A52"
          />
        </div>
      </div>
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? <span className="spinner" /> : 'Cihazı Kaydet'}
      </button>
    </form>
  );
}
