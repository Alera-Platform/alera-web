import type {
  AlarmSeverity,
  AlarmStatus,
  AlarmType,
} from '../types/index.js';

const SEVERITY_CONFIG: Record<
  AlarmSeverity,
  { label: string; color: string }
> = {
  low: { label: 'Düşük', color: 'var(--sev-low)' },
  medium: { label: 'Orta', color: 'var(--sev-medium)' },
  high: { label: 'Yüksek', color: 'var(--sev-high)' },
  critical: { label: 'Kritik', color: 'var(--sev-critical)' },
};

export function SeverityBadge({ severity }: { severity: AlarmSeverity }) {
  const cfg = SEVERITY_CONFIG[severity];
  return (
    <span
      className="badge"
      style={{
        color: cfg.color,
        background: `color-mix(in srgb, ${cfg.color} 14%, transparent)`,
        border: `1px solid color-mix(in srgb, ${cfg.color} 35%, transparent)`,
      }}
    >
      {cfg.label}
    </span>
  );
}

const STATUS_CONFIG: Record<AlarmStatus, { label: string; color: string }> = {
  open: { label: 'Açık', color: 'var(--status-crit)' },
  acknowledged: { label: 'Onaylandı', color: 'var(--status-warn)' },
  resolved: { label: 'Çözüldü', color: 'var(--status-ok)' },
};

export function StatusBadge({ status }: { status: AlarmStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className="badge"
      style={{
        color: cfg.color,
        background: `color-mix(in srgb, ${cfg.color} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${cfg.color} 30%, transparent)`,
      }}
    >
      {cfg.label}
    </span>
  );
}

const TYPE_LABELS: Record<AlarmType, string> = {
  fall: 'DÜŞME',
  inactivity: 'HAREKETSİZLİK',
  anomaly: 'ANOMALİ',
};

export function alarmTypeLabel(type: AlarmType): string {
  return TYPE_LABELS[type];
}
