/**
 * @file WebSocket 훅
 * @description Socket.IO로 실시간 가격 업데이트를 구독합니다.
 *
 * @file WebSocket Hook
 * @description Subscribes to real-time price updates via Socket.IO.
 */
'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth';
import type { PriceUpdate } from '@/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';

export function useWebSocket(
  symbols: string[],
  onPriceUpdate: (update: PriceUpdate) => void,
) {
  const callbackRef = useRef(onPriceUpdate);
  callbackRef.current = onPriceUpdate;
  const symbolsRef = useRef(symbols);
  symbolsRef.current = symbols;

  const socketRef = useRef<Socket | null>(null);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // 소켓 연결 — accessToken이 바뀔 때만 재생성
  // Socket connection — only recreate when accessToken changes
  useEffect(() => {
    // 인증된 사용자인데 토큰이 아직 없으면 대기
    // Wait if authenticated but token not yet recovered
    if (isAuthenticated && !accessToken) return;

    const socket: Socket = io(`${WS_URL}/prices`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      randomizationFactor: 0.5,
      reconnectionAttempts: Infinity,
      auth: accessToken ? { token: accessToken } : undefined,
    });

    socket.on('connect', () => {
      // 연결 시 최신 symbols로 구독 — ref에서 읽어 항상 최신 값 사용
      // Subscribe with latest symbols on connect — reads from ref for freshest value
      const syms = symbolsRef.current;
      if (syms.length > 0) {
        socket.emit('subscribe', { symbols: syms });
      }
    });

    socket.on('price:update', (raw: Record<string, unknown>) => {
      const tick = (raw.data && typeof raw.data === 'object' && 'symbol' in (raw.data as object))
        ? raw.data as Record<string, unknown>
        : raw;
      if (!tick.symbol) return;
      callbackRef.current({
        symbol: tick.symbol as string,
        price: Number(tick.price ?? 0),
        changePercent: Number(tick.changePercent ?? tick.changePercent24h ?? 0),
        changeAmount: Number(tick.changeAmount ?? tick.change24h ?? 0),
        volume: Number(tick.volume ?? 0),
        high24h: Number(tick.high24h ?? 0),
        low24h: Number(tick.low24h ?? 0),
        timestamp: Number(tick.timestamp ?? Date.now()),
      });
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // symbols를 의존성에서 제외 — ref로 참조하므로 토큰 변경 시에만 재연결
    // Exclude symbols from deps — accessed via ref, so only reconnect on token change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, isAuthenticated]);

  // symbols가 변경되면 이미 연결된 소켓에 구독 업데이트
  // When symbols change, update subscriptions on existing connected socket
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    if (socket.connected && symbols.length > 0) {
      socket.emit('subscribe', { symbols });
    }
  }, [symbols]);
}
