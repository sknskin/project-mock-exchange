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
  const symbolsRef = useRef(symbols);
  symbolsRef.current = symbols;
  const accessToken = useAuthStore((s) => s.accessToken);

  const connect = useCallback(() => {
    // 토큰 변경 시 기존 소켓 정리 후 재연결 (Cleanup and reconnect on token change)
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const socket = io(`${WS_URL}/prices`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      auth: accessToken ? { token: accessToken } : undefined,
    });

    socket.on('connect', () => {
      if (symbolsRef.current.length > 0) {
        socket.emit('subscribe', { symbols: symbolsRef.current });
      }
    });

    socket.on('price:update', (data: PriceUpdate) => {
      callbackRef.current(data);
    });

    socketRef.current = socket;
  }, [accessToken]);

  useEffect(() => {
    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [connect]);

  const prevSymbolsRef = useRef<string[]>([]);

  useEffect(() => {
    if (socketRef.current?.connected) {
      // 이전 심볼 구독 해제 (Unsubscribe from previous symbols)
      const removed = prevSymbolsRef.current.filter((s) => !symbols.includes(s));
      if (removed.length > 0) {
        for (const symbol of removed) {
          socketRef.current.emit('unsubscribe', { channel: `prices:${symbol}` });
        }
      }
      // 새 심볼 구독 (Subscribe to new symbols)
      if (symbols.length > 0) {
        socketRef.current.emit('subscribe', { symbols });
      }
    }
    prevSymbolsRef.current = symbols;
  }, [symbols]);
}
