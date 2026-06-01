import type { ReactNode } from 'react';
import styles from './Badge.module.css';

/**
 * Badge Primitive
 *
 * Status/severity göstergeleri için. İkon + metin desteği.
 * Renk-körü kullanıcılar için ikon zorunlu (sadece renge güvenmiyoruz).
 */

type BadgeVariant =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'accent';

interface BadgeProps {
  variant?: BadgeVariant;
  icon?: ReactNode;
  children: ReactNode;
  size?: 'sm' | 'md';
}

export function Badge({
  variant = 'neutral',
  icon,
  children,
  size = 'sm',
}: BadgeProps) {
  return (
    <span
      className={`${styles.badge} ${styles[`variant_${variant}`]} ${styles[`size_${size}`]}`}
    >
      {icon && (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </span>
  );
}
