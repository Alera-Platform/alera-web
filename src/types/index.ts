/**
 * Backend API ve Socket.IO ile uyumlu tip tanımları.
 * Bu tipler backend'deki src/types/ ile aynı sözleşmeyi yansıtır.
 */

export type Role = 'admin' | 'user';

export interface User {
  id: string;
  username: string;
  email: string;
  role: Role;
  createdAt?: string;
}

export interface AuthResult {
  user: User;
  token: string;
}

export type SensorType = 'accelerometer' | 'gyroscope' | 'gps' | 'battery';

export type DevicePlatform = 'android' | 'ios' | 'other';

export interface Device {
  id: string;
  ownerId: string;
  name: string;
  platform: DevicePlatform;
  model?: string;
  lastSeenAt?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SensorReading {
  id: string;
  timestamp: string;
  meta: {
    deviceId: string;
    userId: string;
    sensorType: SensorType;
  };
  data: Record<string, number>;
}

export type AlarmType = 'fall' | 'inactivity' | 'anomaly';
export type AlarmSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlarmStatus = 'open' | 'acknowledged' | 'resolved';

export interface Alarm {
  id: string;
  type: AlarmType;
  severity: AlarmSeverity;
  status: AlarmStatus;
  deviceId: string;
  userId: string;
  triggeredAt: string;
  resolvedAt?: string;
  acknowledgedAt?: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

/** Sayfalama meta bilgisi — backend apiResponse.ts ile birebir aynı. */
export interface PaginationMeta {
  total: number;
  count: number;
  limit: number;
  skip: number;
  hasMore: boolean;
}

/** API standart yanıt zarfı */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  /** Liste uçlarında sayfalama meta'sı; tekil uçlarda bulunmaz. */
  meta?: Partial<PaginationMeta> & { count?: number };
}

export interface ApiError {
  success: false;
  error: {
    message: string;
    code: string;
    details?: unknown;
  };
}

/** Socket.IO event payload'ları */
export interface SensorReadingEvent {
  deviceId: string;
  userId: string;
  sensorType: SensorType;
  timestamp: string;
  data: Record<string, number>;
  readingId?: string;
}

export interface AlarmEvent {
  id: string;
  type: AlarmType;
  severity: AlarmSeverity;
  status: AlarmStatus;
  deviceId: string;
  userId: string;
  triggeredAt: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface DeviceStatusEvent {
  deviceId: string;
  online: boolean;
  lastSeenAt: string;
}

/**
 * Cihaz Durum Özeti
 *
 * Backend'deki deviceStatus.service.ts → DeviceStatusSummary ile birebir aynı.
 * Ham sensör verisinin yorumlanmış halini taşır.
 */
export type ConnectivityState = 'online' | 'idle' | 'offline';
export type ActivityState = 'active' | 'still' | 'unknown';
export type OverallHealth = 'ok' | 'attention' | 'critical' | 'no-data';

export interface DeviceStatusSummary {
  deviceId: string;
  deviceName: string;
  enabled: boolean;
  connectivity: {
    state: ConnectivityState;
    lastSeenAt: string | null;
    secondsSinceLastReading: number | null;
  };
  activity: {
    state: ActivityState;
    averageMagnitude: number | null;
    movementVariance: number | null;
    description: string;
  };
  alarms: {
    open: number;
    highestSeverity: AlarmSeverity | null;
  };
  overall: OverallHealth;
}
