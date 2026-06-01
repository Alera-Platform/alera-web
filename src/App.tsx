import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './theme/ThemeContext.js';
import { AuthProvider } from './auth/AuthContext.js';
import { SocketProvider } from './socket/SocketContext.js';
import { ToastProvider } from './components/ToastContext.js';
import { ProtectedRoute } from './auth/ProtectedRoute.js';
import { Layout } from './components/Layout.js';
import { LoginPage } from './pages/LoginPage.js';
import { Dashboard } from './pages/Dashboard.js';
import { DevicesPage } from './pages/DevicesPage.js';
import { DeviceDetailPage } from './pages/DeviceDetailPage.js';
import { AlarmsPage } from './pages/AlarmsPage.js';
import { NotFoundPage } from './pages/NotFoundPage.js';

/**
 * Uygulama kökü.
 *
 * Provider sırası:
 *   ThemeProvider → en dışta (CSS değişkenleri tema bağımlı)
 *   ToastProvider → her yerden çağrılabilir
 *   AuthProvider → SocketProvider (socket auth'a bağlı)
 */
export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <SocketProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/devices" element={<DevicesPage />} />
                  <Route path="/devices/:id" element={<DeviceDetailPage />} />
                  <Route path="/alarms" element={<AlarmsPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </SocketProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
