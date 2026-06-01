import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.js';
import { useSocket } from '../socket/SocketContext.js';
import { useTheme } from '../theme/ThemeContext.js';
import { Logo } from './Logo.js';
import styles from './Layout.module.css';

/**
 * Layout
 *
 * Modern enterprise SaaS layout:
 *   - Sol sidebar (desktop) / drawer (mobile)
 *   - Üst header bar: breadcrumb + theme toggle + user menu + canlı durum
 *   - Ana içerik alanı
 *
 * Responsive:
 *   < 768px:  drawer (overlay), hamburger ile aç/kapat
 *   ≥ 768px:  sürekli görünür sidebar
 */
export function Layout() {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Route değişince drawer kapansın
  useEffect(() => {
    setDrawerOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  // ESC ile menüler kapansın
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false);
        setUserMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', label: 'Genel Bakış', end: true, icon: HomeIcon },
    { to: '/devices', label: 'Cihazlar', icon: DeviceIcon },
    { to: '/alarms', label: 'Alarmlar', icon: AlertIcon },
  ];

  const pageTitle = getPageTitle(location.pathname);

  return (
    <div className={styles.shell}>
      {/* Overlay (mobile drawer açıkken) */}
      {drawerOpen && (
        <div
          className={styles.overlay}
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${styles.sidebar} ${drawerOpen ? styles.sidebarOpen : ''}`}
        aria-label="Ana navigasyon"
      >
        <div className={styles.brand}>
          <Logo height={34} />
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
              }
            >
              <span className={styles.navIcon} aria-hidden="true">
                <item.icon />
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Sidebar alt — bağlantı durumu */}
        <div className={styles.sidebarFooter}>
          <div className={styles.connStatus}>
            <span
              className={`${styles.connDot} ${connected ? styles.connOk : styles.connOff}`}
              aria-hidden="true"
            />
            <span className={styles.connText}>
              {connected ? 'Bağlı' : 'Bağlantı yok'}
            </span>
          </div>
        </div>
      </aside>

      {/* Ana alan */}
      <div className={styles.main}>
        {/* Header bar */}
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button
              className={styles.hamburger}
              onClick={() => setDrawerOpen(true)}
              aria-label="Menüyü aç"
            >
              <MenuIcon />
            </button>
            <h1 className={styles.pageTitle}>{pageTitle}</h1>
          </div>

          <div className={styles.topbarRight}>
            <button
              className={styles.iconButton}
              onClick={toggleTheme}
              aria-label={`${theme === 'light' ? 'Koyu' : 'Açık'} temaya geç`}
              title={`${theme === 'light' ? 'Koyu' : 'Açık'} tema`}
            >
              {theme === 'light' ? <MoonIcon /> : <SunIcon />}
            </button>

            <div className={styles.userMenuWrap}>
              <button
                className={styles.userBtn}
                onClick={() => setUserMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
              >
                <span className={styles.avatar} aria-hidden="true">
                  {user?.username?.charAt(0).toUpperCase() ?? 'U'}
                </span>
                <span className={styles.userName}>
                  {user?.username ?? 'Kullanıcı'}
                </span>
                <ChevronDownIcon />
              </button>
              {userMenuOpen && (
                <div className={styles.userMenu} role="menu">
                  <div className={styles.userMenuHeader}>
                    <div className={styles.userMenuName}>
                      {user?.username}
                    </div>
                    <div className={styles.userMenuEmail}>{user?.email}</div>
                  </div>
                  <button
                    className={styles.userMenuItem}
                    onClick={handleLogout}
                    role="menuitem"
                  >
                    <LogoutIcon />
                    <span>Çıkış yap</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main id="main-content" className={styles.content} tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/* Sayfa başlığını URL'den çıkar */
function getPageTitle(pathname: string): string {
  if (pathname === '/') return 'Kontrol Merkezi';
  if (pathname.startsWith('/devices/')) return 'Cihaz Detayı';
  if (pathname === '/devices') return 'Cihazlar';
  if (pathname === '/alarms') return 'Alarmlar';
  return '';
}

// ---------- İkonlar (inline SVG, currentColor kullanır) ----------
const iconProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function HomeIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 12L12 3l9 9M5 10v10h14V10" />
    </svg>
  );
}
function DeviceIcon() {
  return (
    <svg {...iconProps}>
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <path d="M11 18h2" />
    </svg>
  );
}
function AlertIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 9v4M12 17h.01M10.3 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  );
}
function MenuIcon() {
  return (
    <svg {...iconProps}>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg {...iconProps}>
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  );
}
function SunIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}
function ChevronDownIcon() {
  return (
    <svg {...iconProps} width={14} height={14}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg {...iconProps} width={16} height={16}>
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
