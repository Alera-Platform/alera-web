import { apiClient } from './client.js';
import type {
  AuthResult,
  User,
  Device,
  SensorReading,
  Alarm,
  ApiResponse,
  AlarmStatus,
  PaginationMeta,
  DeviceStatusSummary,
} from '../types/index.js';

/**
 * Tüm backend endpoint'lerinin tipli wrapper'ları.
 * Bileşenler doğrudan axios çağırmaz; bu fonksiyonları kullanır.
 */

/** Sayfalı liste sonucu — meta backend'den olduğu gibi taşınır. */
export interface PagedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

/** Eksik meta alanlarını güvenli varsayılanlarla doldur. */
function normalizeMeta(
  meta: ApiResponse<unknown>['meta'],
  itemCount: number,
): PaginationMeta {
  return {
    total: meta?.total ?? itemCount,
    count: meta?.count ?? itemCount,
    limit: meta?.limit ?? itemCount,
    skip: meta?.skip ?? 0,
    hasMore: meta?.hasMore ?? false,
  };
}

// ==================== AUTH ====================
export const authApi = {
  async register(
    username: string,
    email: string,
    password: string,
  ): Promise<AuthResult> {
    const { data } = await apiClient.post<ApiResponse<AuthResult>>(
      '/auth/register',
      { username, email, password },
    );
    return data.data;
  },

  async login(email: string, password: string): Promise<AuthResult> {
    const { data } = await apiClient.post<ApiResponse<AuthResult>>(
      '/auth/login',
      { email, password },
    );
    return data.data;
  },

  async me(): Promise<User> {
    const { data } = await apiClient.get<ApiResponse<User>>('/auth/me');
    return data.data;
  },
};

// ==================== DEVICES ====================
export const deviceApi = {
  async list(): Promise<Device[]> {
    const { data } = await apiClient.get<ApiResponse<Device[]>>('/devices');
    return data.data;
  },

  async get(id: string): Promise<Device> {
    const { data } = await apiClient.get<ApiResponse<Device>>(
      `/devices/${id}`,
    );
    return data.data;
  },

  async create(input: {
    name: string;
    platform?: string;
    model?: string;
  }): Promise<Device> {
    const { data } = await apiClient.post<ApiResponse<Device>>(
      '/devices',
      input,
    );
    return data.data;
  },

  async update(
    id: string,
    input: Partial<{
      name: string;
      platform: string;
      model: string;
      active: boolean;
    }>,
  ): Promise<Device> {
    const { data } = await apiClient.patch<ApiResponse<Device>>(
      `/devices/${id}`,
      input,
    );
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/devices/${id}`);
  },

  /**
   * Tek cihazın yorumlanmış durum özeti.
   * Ham sensör verisi yerine anlamlı durum (bağlantı, aktivite, sağlık).
   */
  async getStatus(id: string): Promise<DeviceStatusSummary> {
    const { data } = await apiClient.get<ApiResponse<DeviceStatusSummary>>(
      `/devices/${id}/status`,
    );
    return data.data;
  },

  /**
   * Tüm cihazların durum özeti — dashboard filo görünümü için.
   */
  async getFleetStatus(): Promise<DeviceStatusSummary[]> {
    const { data } = await apiClient.get<ApiResponse<DeviceStatusSummary[]>>(
      '/devices/status/fleet',
    );
    return data.data;
  },
};

// ==================== SENSOR READINGS ====================
export const sensorApi = {
  async list(params: {
    deviceId?: string;
    sensorType?: string;
    from?: string;
    to?: string;
    limit?: number;
    order?: 'asc' | 'desc';
  }): Promise<SensorReading[]> {
    const { data } = await apiClient.get<ApiResponse<SensorReading[]>>(
      '/sensor-readings',
      { params },
    );
    return data.data;
  },

  async latestForDevice(
    deviceId: string,
    limit = 50,
  ): Promise<SensorReading[]> {
    const { data } = await apiClient.get<ApiResponse<SensorReading[]>>(
      `/sensor-readings/devices/${deviceId}/latest`,
      { params: { limit } },
    );
    return data.data;
  },
};

// ==================== ALARMS ====================
export const alarmApi = {
  async list(params: {
    status?: string;
    type?: string;
    severity?: string;
    deviceId?: string;
    limit?: number;
    skip?: number;
  }): Promise<PagedResult<Alarm>> {
    const { data } = await apiClient.get<ApiResponse<Alarm[]>>('/alarms', {
      params,
    });
    return {
      items: data.data,
      meta: normalizeMeta(data.meta, data.data.length),
    };
  },

  async get(id: string): Promise<Alarm> {
    const { data } = await apiClient.get<ApiResponse<Alarm>>(`/alarms/${id}`);
    return data.data;
  },

  async updateStatus(
    id: string,
    status: Exclude<AlarmStatus, 'open'>,
  ): Promise<Alarm> {
    const { data } = await apiClient.patch<ApiResponse<Alarm>>(
      `/alarms/${id}/status`,
      { status },
    );
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/alarms/${id}`);
  },
};
