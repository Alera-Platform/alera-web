import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Card.module.css';

/**
 * Card Primitive
 *
 * Compound API:
 *   <Card>
 *     <Card.Header title="..." action={<Button />} />
 *     <Card.Body>content</Card.Body>
 *     <Card.Footer>...</Card.Footer>
 *   </Card>
 *
 * Önceki "panel" raw class'ı çok dağınıktı. Bu, tutarlı yapı sağlar.
 */

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'subtle' | 'outlined';
  padded?: boolean;
}

export function Card({
  variant = 'default',
  padded = false,
  className = '',
  children,
  ...rest
}: CardProps) {
  const classes = [
    styles.card,
    styles[`variant_${variant}`],
    padded ? styles.padded : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}

Card.Header = function CardHeader({ title, subtitle, action }: CardHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.headerText}>
        <div className={styles.title}>{title}</div>
        {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
      </div>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
};

Card.Body = function CardBody({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`${styles.body} ${className}`}>{children}</div>;
};

Card.Footer = function CardFooter({ children }: { children: ReactNode }) {
  return <div className={styles.footer}>{children}</div>;
};
