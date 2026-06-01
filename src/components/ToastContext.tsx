import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import styles from './ToastContext.module.css';

/**
 * Toast Bildirim Sistemi
 *
 * "Sessizce hata yut" anti-pattern'ini çözer. Backend hatası, ağ kopması
 * veya başarılı işlemler kullanıcıya görünür, geçici bir bildirimle iletilir.
 *
 * Kullanım:
 *   const { showError, showSuccess } = useToast();
 *   showError('Cihaz silinemedi');
 */

type ToastVariant = 'error' | 'success' | 'info';

interface Toast {
  id: number;
  variant: ToastVariant;
  message: string;
}

interface ToastContextValue {
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
  showInfo: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Toast otomatik kaybolma süresi (ms). */
const TOAST_DURATION = 4500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idCounter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (variant: ToastVariant, message: string) => {
      const id = ++idCounter.current;
      setToasts((prev) => [...prev, { id, variant, message }]);
      // Otomatik kaybolma
      setTimeout(() => dismiss(id), TOAST_DURATION);
    },
    [dismiss],
  );

  const showError = useCallback(
    (msg: string) => push('error', msg),
    [push],
  );
  const showSuccess = useCallback(
    (msg: string) => push('success', msg),
    [push],
  );
  const showInfo = useCallback((msg: string) => push('info', msg), [push]);

  return (
    <ToastContext.Provider value={{ showError, showSuccess, showInfo }}>
      {children}
      <div className={styles.container} role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`${styles.toast} ${styles[toast.variant]}`}
            onClick={() => dismiss(toast.id)}
          >
            <span className={styles.icon}>
              {toast.variant === 'error'
                ? '!'
                : toast.variant === 'success'
                  ? '✓'
                  : 'i'}
            </span>
            <span className={styles.message}>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
