import type { ReactNode } from 'react';
import styles from './StateViews.module.css';

/**
 * Tutarlı Durum Görünümleri
 *
 * Tüm sayfalar yükleniyor / boş / hata durumlarını bu bileşenlerle gösterir.
 * Daha önce her sayfa kendi versiyonunu yapıyordu — artık tek desen.
 */

/** Yükleniyor — ortalanmış spinner. */
export function LoadingState({ label }: { label?: string }) {
  return (
    <div className={styles.wrap}>
      <div className="spinner" />
      {label && <p className={styles.text}>{label}</p>}
    </div>
  );
}

/** Boş durum — veri yokken gösterilir. */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className={`panel ${styles.wrap}`}>
      {icon && <div className={styles.icon}>{icon}</div>}
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.text}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}

/** Hata durumu — yükleme başarısız olduğunda, tekrar dene seçeneğiyle. */
export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className={`panel ${styles.wrap} ${styles.errorWrap}`}>
      <div className={`${styles.icon} ${styles.errorIcon}`}>!</div>
      <h3 className={styles.title}>Bir sorun oluştu</h3>
      <p className={styles.text}>{message}</p>
      {onRetry && (
        <button className="btn" onClick={onRetry}>
          Tekrar Dene
        </button>
      )}
    </div>
  );
}
