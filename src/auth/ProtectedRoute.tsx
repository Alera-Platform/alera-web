import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext.js';
import type { ReactNode } from 'react';

/**
 * ProtectedRoute — sadece giriş yapmış kullanıcılar erişebilir.
 *
 * - loading sırasında spinner gösterir
 * - oturum yoksa /login'e yönlendirir
 * - requireAdmin=true ise sadece admin geçer
 */
export function ProtectedRoute({
  children,
  requireAdmin = false,
}: {
  children: ReactNode;
  requireAdmin?: boolean;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--color-bg-canvas)',
        }}
      >
        <div className="spinner" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
