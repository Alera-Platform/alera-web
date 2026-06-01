import type { CSSProperties } from 'react';
import styles from './Skeleton.module.css';

/**
 * Skeleton Primitive
 *
 * Spinner yerine içerik şeklini koruyan loading state.
 * Algılanan hızı artırır — kullanıcı sayfanın geleceğini "görür".
 */

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'rect' | 'circle' | 'text';
  className?: string;
}

export function Skeleton({
  width,
  height,
  variant = 'rect',
  className = '',
}: SkeletonProps) {
  const style: CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };
  return (
    <span
      className={`${styles.skeleton} ${styles[`variant_${variant}`]} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}
