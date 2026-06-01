import axios, { AxiosError } from 'axios';

/**
 * Merkezi Axios instance.
 *
 * - baseURL: Vite proxy sayesinde relative '/api'
 * - Request interceptor: localStorage'daki token'ı otomatik ekler
 * - Response interceptor: 401 durumunda token'ı temizler
 */
export const apiClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

const TOKEN_KEY = 'alera_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// Request: token ekle
apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response: 401'de token temizle (oturum geçersiz)
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      clearStoredToken();
      // Login sayfası dışındaysak yönlendir
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

/**
 * API hatasından okunabilir mesaj çıkar.
 */
export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { error?: { message?: string } }
      | undefined;
    return data?.error?.message ?? error.message ?? 'Bilinmeyen hata';
  }
  if (error instanceof Error) return error.message;
  return 'Bilinmeyen hata';
}
