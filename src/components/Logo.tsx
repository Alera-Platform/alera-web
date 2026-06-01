import { useTheme } from '../theme/ThemeContext.js';

/**
 * Alera Logo — tema-duyarlı.
 *
 * Aktif temaya göre doğru logo varyantını seçer:
 *  - light tema → koyu metinli logo (açık zemin için)
 *  - dark tema  → açık metinli + koyu kutulu logo
 *
 * `variant="mark"` yalnızca sembolü (wordmark'sız) gösterir; dar alanlar için.
 */
interface LogoProps {
  /** Yükseklik (px). Genişlik orana göre otomatik. */
  height?: number;
  /** 'full' = sembol + wordmark, 'mark' = yalnızca sembol. */
  variant?: 'full' | 'mark';
  className?: string;
}

export function Logo({ height = 32, variant = 'full', className }: LogoProps) {
  const { theme } = useTheme();
  const src =
    theme === 'dark' ? '/alera-logo-dark.svg' : '/alera-logo-light.svg';

  // Tam logo 280×64 (oran 4.375). Yalnızca sembol için kare oran.
  const aspect = variant === 'full' ? 280 / 64 : 64 / 64;

  return (
    <img
      src={src}
      alt="Alera"
      className={className}
      style={{
        height,
        width: height * aspect,
        objectFit: 'contain',
        objectPosition: 'left center',
        display: 'block',
      }}
    />
  );
}
