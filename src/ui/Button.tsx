import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';

/**
 * Button Primitive
 *
 * Tüm uygulamada tek bir buton sözleşmesi. Varyantlar ve boyutlar
 * yalnızca prop ile değişir — utility class çorbası yok.
 *
 * Varyantlar:
 *  - primary:   ana CTA (mavi)
 *  - secondary: ikincil aksiyon (nötr)
 *  - ghost:     iconly veya zayıf vurgu
 *  - danger:    destruktif aksiyon (silme vs)
 *
 * Boyutlar: sm | md | lg
 */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  disabled,
  iconLeft,
  iconRight,
  fullWidth,
  children,
  className = '',
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = [
    styles.btn,
    styles[`variant_${variant}`],
    styles[`size_${size}`],
    fullWidth ? styles.fullWidth : '',
    loading ? styles.loading : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <span className={styles.spinner} aria-hidden="true" />}
      {!loading && iconLeft && (
        <span className={styles.icon} aria-hidden="true">
          {iconLeft}
        </span>
      )}
      <span className={styles.label}>{children}</span>
      {!loading && iconRight && (
        <span className={styles.icon} aria-hidden="true">
          {iconRight}
        </span>
      )}
    </button>
  );
}
