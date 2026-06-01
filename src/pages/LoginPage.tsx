import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.js';
import { Button, Card, Input, FormField } from '../ui/index.js';
import { Logo } from '../components/Logo.js';
import { extractErrorMessage } from '../api/client.js';
import styles from './LoginPage.module.css';

/**
 * LoginPage — modern enterprise login.
 *
 * Sade, ortalanmış kart düzeni. Login ↔ Register tek sayfa tab.
 * Tüm form'lar primitive component'leri kullanır.
 */
export function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(username, email, password);
      }
      navigate('/');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Logo + slogan */}
        <div className={styles.brand}>
          <Logo height={48} className={styles.brandLogo} />
          <p className={styles.tagline}>
            Mobil güvenlik ve davranış analiz platformu
          </p>
        </div>

        <Card padded>
          {/* Tab switcher */}
          <div className={styles.tabs} role="tablist">
            <button
              type="button"
              className={`${styles.tab} ${mode === 'login' ? styles.tabActive : ''}`}
              onClick={() => setMode('login')}
              role="tab"
              aria-selected={mode === 'login'}
            >
              Giriş Yap
            </button>
            <button
              type="button"
              className={`${styles.tab} ${mode === 'register' ? styles.tabActive : ''}`}
              onClick={() => setMode('register')}
              role="tab"
              aria-selected={mode === 'register'}
            >
              Hesap Oluştur
            </button>
          </div>

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            {mode === 'register' && (
              <FormField label="Kullanıcı adı" required>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="kullanici_adi"
                  autoComplete="username"
                  required
                  autoFocus
                />
              </FormField>
            )}

            <FormField label="E-posta" required>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@btu.edu.tr"
                autoComplete="email"
                required
                autoFocus={mode === 'login'}
              />
            </FormField>

            <FormField
              label="Parola"
              required
              hint={
                mode === 'register'
                  ? 'En az 8 karakter, 1 büyük harf, 1 sayı'
                  : undefined
              }
            >
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={
                  mode === 'login' ? 'current-password' : 'new-password'
                }
                required
                iconRight={
                  <button
                    type="button"
                    className={styles.eyeBtn}
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Parolayı gizle' : 'Parolayı göster'}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                }
              />
            </FormField>

            {error && (
              <div className={styles.errorBox} role="alert">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={busy}
            >
              {mode === 'login' ? 'Giriş Yap' : 'Hesap Oluştur'}
            </Button>
          </form>
        </Card>

        <p className={styles.footer}>
          {mode === 'login' ? 'Hesabınız yok mu? ' : 'Hesabınız var mı? '}
          <button
            type="button"
            className={styles.linkBtn}
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? 'Kayıt olun' : 'Giriş yapın'}
          </button>
        </p>
      </div>
    </div>
  );
}

// İkonlar
function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
