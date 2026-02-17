'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { PriceUpdate } from '@/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';

export function useWebSocket(
  symbols: string[],
  onPriceUpdate: (update: PriceUpdate) => void,
) {
  const socketRef = useRef<Socket | null>(null);
  const callbackRef = useRef(onPriceUpdate);
  callbackRef.current = onPriceUpdate;

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socket = io(`${WS_URL}/prices`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
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
