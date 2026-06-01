import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type VisibilityState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { alarmApi, deviceApi } from '../api/endpoints.js';
import { extractErrorMessage } from '../api/client.js';
import { useSocket } from '../socket/SocketContext.js';
import { useToast } from '../components/ToastContext.js';
import {
  SeverityBadge,
  StatusBadge,
  alarmTypeLabel,
} from '../components/Badges.js';
import { Button } from '../ui/index.js';
import type { Alarm, AlarmStatus, Device } from '../types/index.js';
import styles from './AlarmsPage.module.css';

type StatusFilter = 'all' | AlarmStatus;

/** Tabloya beslenen zenginleştirilmiş alarm satırı (device adı dahil). */
interface AlarmRow extends Alarm {
  deviceName: string;
}

const columnHelper = createColumnHelper<AlarmRow>();

/**
 * Alarm yönetim sayfası.
 *
 * - TanStack Table: sıralama, filtreleme, sütun görünürlüğü
 * - Kaynak cihaz sütunu (tıklanınca cihaz detayına gider)
 * - URL ?deviceId= parametresiyle cihaza göre önceden filtreli açılabilir
 * - Socket.IO ile canlı güncelleme
 */
export function AlarmsPage() {
  const { onAlarmNew, onAlarmUpdated } = useSocket();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const deviceIdParam = searchParams.get('deviceId');

  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // TanStack Table state
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'triggeredAt', desc: true },
  ]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    {},
  );
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  // İlk yükleme: alarmlar + cihazlar (cihaz adı eşleştirmesi için)
  const load = () => {
    setLoading(true);
    Promise.all([alarmApi.list({ limit: 200 }), deviceApi.list()])
      .then(([alarmRes, deviceList]) => {
        setAlarms(alarmRes.items);
        setDevices(deviceList);
      })
      .catch((e) => setError(extractErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  // URL ?deviceId= geldiyse o cihazı global filtreye uygula
  useEffect(() => {
    if (deviceIdParam && devices.length > 0) {
      const dev = devices.find((d) => d.id === deviceIdParam);
      if (dev) setGlobalFilter(dev.name);
    }
  }, [deviceIdParam, devices]);

  // Canlı: yeni alarm
  useEffect(() => {
    const cleanup = onAlarmNew((event) => {
      setAlarms((prev) => [{ ...event } as Alarm, ...prev]);
    });
    return cleanup;
  }, [onAlarmNew]);

  // Canlı: alarm güncellemesi
  useEffect(() => {
    const cleanup = onAlarmUpdated((event) => {
      setAlarms((prev) =>
        prev.map((a) => (a.id === event.id ? ({ ...event } as Alarm) : a)),
      );
    });
    return cleanup;
  }, [onAlarmUpdated]);

  const handleStatusChange = async (
    alarm: Alarm,
    status: Exclude<AlarmStatus, 'open'>,
  ) => {
    try {
      const updated = await alarmApi.updateStatus(alarm.id, status);
      setAlarms((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a)),
      );
      showSuccess(
        status === 'resolved'
          ? 'Alarm çözüldü olarak işaretlendi'
          : 'Alarm onaylandı',
      );
    } catch (e) {
      const msg = extractErrorMessage(e);
      setError(msg);
      showError(`Alarm güncellenemedi: ${msg}`);
    }
  };

  // Cihaz adı eşleştirmesi (id → name map)
  const deviceNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of devices) map.set(d.id, d.name);
    return map;
  }, [devices]);

  // Alarmları zenginleştir (device adı + status filtresi)
  const rows = useMemo<AlarmRow[]>(() => {
    const enriched = alarms.map((a) => ({
      ...a,
      deviceName: deviceNameMap.get(a.deviceId) ?? 'Bilinmeyen cihaz',
    }));
    return statusFilter === 'all'
      ? enriched
      : enriched.filter((a) => a.status === statusFilter);
  }, [alarms, deviceNameMap, statusFilter]);

  // Sütun tanımları
  const columns = useMemo(
    () => [
      columnHelper.accessor('type', {
        header: 'Tip',
        cell: (info) => (
          <span className={styles.typeCell}>
            {alarmTypeLabel(info.getValue())}
          </span>
        ),
      }),
      columnHelper.accessor('deviceName', {
        header: 'Kaynak Cihaz',
        cell: (info) => (
          <button
            className={styles.deviceLink}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/devices/${info.row.original.deviceId}`);
            }}
            title="Cihaz detayına git"
          >
            {info.getValue()}
          </button>
        ),
      }),
      columnHelper.accessor('severity', {
        header: 'Önem',
        cell: (info) => <SeverityBadge severity={info.getValue()} />,
        // Severity'i mantıksal sıraya göre sırala
        sortingFn: (a, b) => {
          const order = { low: 0, medium: 1, high: 2, critical: 3 };
          return (
            (order[a.original.severity] ?? 0) -
            (order[b.original.severity] ?? 0)
          );
        },
      }),
      columnHelper.accessor('description', {
        header: 'Açıklama',
        cell: (info) => (
          <span className={styles.descCell}>{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor('triggeredAt', {
        header: 'Zaman',
        cell: (info) => (
          <span className={styles.timeCell}>
            {new Date(info.getValue()).toLocaleString('tr-TR')}
          </span>
        ),
      }),
      columnHelper.accessor('status', {
        header: 'Durum',
        cell: (info) => <StatusBadge status={info.getValue()} />,
      }),
      columnHelper.display({
        id: 'actions',
        header: 'İşlem',
        cell: (info) => {
          const alarm = info.row.original;
          return (
            <div className={styles.actions}>
              {alarm.status === 'open' && (
                <Button
                  size="sm"
                  onClick={() => handleStatusChange(alarm, 'acknowledged')}
                >
                  Onayla
                </Button>
              )}
              {alarm.status !== 'resolved' && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleStatusChange(alarm, 'resolved')}
                >
                  Çöz
                </Button>
              )}
              {alarm.status === 'resolved' && (
                <span className={styles.doneText}>—</span>
              )}
            </div>
          );
        },
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, globalFilter, columnVisibility, columnFilters },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  // Status filter sayıları
  const counts = {
    all: alarms.length,
    open: alarms.filter((a) => a.status === 'open').length,
    acknowledged: alarms.filter((a) => a.status === 'acknowledged').length,
    resolved: alarms.filter((a) => a.status === 'resolved').length,
  };

  // İnsana okunur sütun adları (column menü için)
  const columnLabels: Record<string, string> = {
    type: 'Tip',
    deviceName: 'Kaynak Cihaz',
    severity: 'Önem',
    description: 'Açıklama',
    triggeredAt: 'Zaman',
    status: 'Durum',
    actions: 'İşlem',
  };

  return (
    <div className={styles.page}>
      {error && <div className={styles.error}>{error}</div>}

      {/* Üst kontrol şeridi: status filtre + arama + sütun görünürlüğü */}
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          {(
            [
              ['all', 'Tümü'],
              ['open', 'Açık'],
              ['acknowledged', 'Onaylanan'],
              ['resolved', 'Çözülen'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              className={`${styles.filterTab} ${
                statusFilter === key ? styles.filterActive : ''
              }`}
              onClick={() => setStatusFilter(key)}
            >
              {label}
              <span className={styles.filterCount}>{counts[key]}</span>
            </button>
          ))}
        </div>

        <div className={styles.toolbarRight}>
          <input
            className={styles.search}
            type="search"
            placeholder="Alarm ara…"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            aria-label="Alarmlarda ara"
          />
          <div className={styles.columnMenuWrap}>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setShowColumnMenu((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={showColumnMenu}
            >
              Sütunlar
            </Button>
            {showColumnMenu && (
              <div className={styles.columnMenu} role="menu">
                {table.getAllLeafColumns().map((column) => (
                  <label key={column.id} className={styles.columnMenuItem}>
                    <input
                      type="checkbox"
                      checked={column.getIsVisible()}
                      onChange={column.getToggleVisibilityHandler()}
                    />
                    <span>{columnLabels[column.id] ?? column.id}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingWrap}>
          <div className="spinner" />
        </div>
      ) : rows.length === 0 ? (
        <div className={`panel ${styles.empty}`}>
          <h3>Bu filtrede alarm yok</h3>
          <p>
            {statusFilter === 'all'
              ? 'Sistem normal çalışıyor — henüz alarm oluşmadı.'
              : 'Seçili duruma uygun alarm bulunmuyor.'}
          </p>
        </div>
      ) : (
        <div className={`panel ${styles.tableWrap}`}>
          <table className={styles.table}>
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sorted = header.column.getIsSorted();
                    return (
                      <th
                        key={header.id}
                        className={canSort ? styles.sortable : ''}
                        onClick={
                          canSort
                            ? header.column.getToggleSortingHandler()
                            : undefined
                        }
                        aria-sort={
                          sorted === 'asc'
                            ? 'ascending'
                            : sorted === 'desc'
                              ? 'descending'
                              : undefined
                        }
                      >
                        <span className={styles.thContent}>
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {canSort && (
                            <span className={styles.sortIcon}>
                              {sorted === 'asc'
                                ? '▲'
                                : sorted === 'desc'
                                  ? '▼'
                                  : '⇅'}
                            </span>
                          )}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
