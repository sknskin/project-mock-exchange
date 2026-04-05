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
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // SEC-H-03 + WS-M-01: 쿠키 기반 인증으로 전환 — withCredentials로 httpOnly 쿠키 자동 전송
  // SEC-H-03 + WS-M-01: Switch to cookie-based auth — httpOnly cookie sent automatically via withCredentials
  // 소켓 연결 — 인증 상태 변경 시 재생성
  // Socket connection — recreate when authentication state changes
  useEffect(() => {
    // 비로그인 시 WebSocket 연결 안 함 — 서버가 쿠키 없으면 거부
    // Don't connect WebSocket when not authenticated — server rejects without cookie
    if (!isAuthenticated) return;

    // Strict Mode 이중 호출 감지용 — cleanup 시 true로 설정되어 연결 시도를 조기 중단
    // Strict Mode double-invoke guard — set to true on cleanup to abort connection attempt
    let disposed = false;

    const socket: Socket = io(`${WS_URL}/prices`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      randomizationFactor: 0.5,
      reconnectionAttempts: Infinity,
      withCredentials: true,
      autoConnect: false,
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

    // autoConnect: false이므로 수동으로 연결 시작 — disposed 체크 후
    // autoConnect: false, so manually connect — after disposed check
    if (!disposed) {
      socket.connect();
    }

    return () => {
      disposed = true;
      socket.disconnect();
      socketRef.current = null;
    };
    // SEC-H-03: 토큰 대신 인증 상태만 의존 — 쿠키는 자동 전송되므로 토큰 변경 추적 불필요
    // SEC-H-03: Depend only on auth state — cookie is sent automatically, no need to track token changes
  }, [isAuthenticated]);

  // WS-M-01: symbols 변경 시 diff만 전송 — 전체 심볼 재전송 방지
  // WS-M-01: On symbols change, compute diff and send only new symbols — prevents full re-send
  const prevSymbolsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return;

    const prevSet = prevSymbolsRef.current;
    const currentSet = new Set(symbols);
    // 새로 추가된 심볼만 구독 요청 / Only subscribe to newly added symbols
    const newSymbols = symbols.filter((s) => !prevSet.has(s));
    if (newSymbols.length > 0) {
      socket.emit('subscribe', { symbols: newSymbols });
    }
    // PERF-13-12: 제거된 심볼 구독 해제 — 불필요한 데이터 수신 방지
    // PERF-13-12: Unsubscribe removed symbols — prevents receiving unnecessary data
    const removedSymbols = [...prevSet].filter((s) => !currentSet.has(s));
    if (removedSymbols.length > 0) {
      socket.emit('unsubscribe', { symbols: removedSymbols });
    }
    prevSymbolsRef.current = currentSet;
  }, [symbols]);
}
