import { Link } from 'react-router-dom';
import { Button } from '../ui/index.js';
import styles from './NotFoundPage.module.css';

/**
 * 404 NotFound — bilinmeyen rotalar buraya düşer.
 * Kullanıcıyı geri yönlendirir, bağlam koruyarak.
 */
export function NotFoundPage() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.code}>404</div>
        <h1 className={styles.title}>Sayfa bulunamadı</h1>
        <p className={styles.message}>
          Aradığınız sayfa silinmiş ya da hiç var olmamış olabilir.
        </p>
        <Link to="/" className={styles.linkWrap}>
          <Button variant="primary">Ana sayfaya dön</Button>
        </Link>
      </div>
    </div>
  );
}
