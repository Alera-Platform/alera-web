import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from '../auth/AuthContext.js';
import type {
  SensorReadingEvent,
  AlarmEvent,
  DeviceStatusEvent,
} from '../types/index.js';

type EventHandler<T> = (payload: T) => void;

interface SocketContextValue {
  connected: boolean;
  onSensorReading: (handler: EventHandler<SensorReadingEvent>) => () => void;
  onAlarmNew: (handler: EventHandler<AlarmEvent>) => () => void;
  onAlarmUpdated: (handler: EventHandler<AlarmEvent>) => () => void;
  onDeviceStatus: (handler: EventHandler<DeviceStatusEvent>) => () => void;
  subscribeDevice: (deviceId: string) => void;
  unsubscribeDevice: (deviceId: string) => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

/**
 * SocketProvider - JWT ile authenticated Socket.IO baglantisi saglar.
 *
 * MIMARI NOT (canli guncelleme bug fix):
 * Socket instance'i useRef yerine useState'te tutulur. Bunun nedeni:
 * tuketici bilesenler (Dashboard vb.) socket hazir OLMADAN mount olur.
 * Eger subscribe fonksiyonlari socketRef.current'a baksaydi, mount aninda
 * ref null oldugu icin dinleyici sessizce hic baglanmazdi - ve socket
 * sonradan baglandiginda abonelik tetiklenmezdi. Bu yuzden canli veri
 * gelmiyor, yalnizca sayfa yenilenince (REST fetch) guncelleniyordu.
 *
 * Cozum: socket'i state'te tutarak, baglanti kuruldugunda context value'su
 * degisir -> subscribe fonksiyonlari yeni referans alir -> tuketicilerin
 * useEffect'leri yeniden calisir -> dinleyiciler GERCEK socket'e baglanir.
 */
export function SocketProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) {
      setSocket(null);
      setConnected(false);
      return;
    }

    const newSocket = io({
      auth: { token: `Bearer ${token}` },
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => setConnected(true));
    newSocket.on('disconnect', () => setConnected(false));
    newSocket.on('connect_error', () => setConnected(false));

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [token]);

  // Generic event abonelik yardimcisi - `socket` state'ine bagimli.
  // socket degisince (null -> bagli) bu fonksiyon yeni referans alir,
  // tuketicilerin useEffect'leri yeniden calisip gercek socket'e baglanir.
  const subscribe = useCallback(
    <T,>(event: string, handler: EventHandler<T>): (() => void) => {
      if (!socket) return () => {};
      socket.on(event, handler as (...args: unknown[]) => void);
      return () => {
        socket.off(event, handler as (...args: unknown[]) => void);
      };
    },
    [socket],
  );

  const onSensorReading = useCallback(
    (h: EventHandler<SensorReadingEvent>) =>
      subscribe<SensorReadingEvent>('sensor:reading', h),
    [subscribe],
  );

  const onAlarmNew = useCallback(
    (h: EventHandler<AlarmEvent>) => subscribe<AlarmEvent>('alarm:new', h),
    [subscribe],
  );

  const onAlarmUpdated = useCallback(
    (h: EventHandler<AlarmEvent>) =>
      subscribe<AlarmEvent>('alarm:updated', h),
    [subscribe],
  );

  const onDeviceStatus = useCallback(
    (h: EventHandler<DeviceStatusEvent>) =>
      subscribe<DeviceStatusEvent>('device:status', h),
    [subscribe],
  );

  const subscribeDevice = useCallback(
    (deviceId: string) => {
      socket?.emit('device:subscribe', { deviceId });
    },
    [socket],
  );

  const unsubscribeDevice = useCallback(
    (deviceId: string) => {
      socket?.emit('device:unsubscribe', { deviceId });
    },
    [socket],
  );

  return (
    <SocketContext.Provider
      value={{
        connected,
        onSensorReading,
        onAlarmNew,
        onAlarmUpdated,
        onDeviceStatus,
        subscribeDevice,
        unsubscribeDevice,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return ctx;
}
