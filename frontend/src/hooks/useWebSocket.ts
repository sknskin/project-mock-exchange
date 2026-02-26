/**
 * @file WebSocket 훅
 * @description Socket.IO로 실시간 가격 업데이트를 구독합니다
 *
 * @file WebSocket Hook
 * @description Subscribes to real-time price updates via Socket.IO
 */
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth';
import type { PriceUpdate } from '@/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';

export function useWebSocket(
  symbols: string[],
  onPriceUpdate: (update: PriceUpdate) => void,
) {
  const socketRef = useRef<Socket | null>(null);
  const callbackRef = useRef(onPriceUpdate);
  callbackRef.current = onPriceUpdate;
  const accessToken = useAuthStore((s) => s.accessToken);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socket = io(`${WS_URL}/prices`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      auth: accessToken ? { token: accessToken } : undefined,
    });

    socket.on('connect', () => {
      if (symbols.length > 0) {
        socket.emit('subscribe', { symbols });
      }
    });

    socket.on('price:update', (data: PriceUpdate) => {
      callbackRef.current(data);
    });

    socketRef.current = socket;
  }, [symbols]);

  useEffect(() => {
    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [connect]);

  useEffect(() => {
    if (socketRef.current?.connected && symbols.length > 0) {
      socketRef.current.emit('subscribe', { symbols });
    }
  }, [symbols]);
}
