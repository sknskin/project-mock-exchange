/**
 * @file WebSocket 훅
 * @description Socket.IO로 실시간 가격 업데이트를 구독합니다. ping/pong 하트비트로 연결 상태를 감시합니다.
 *
 * @file WebSocket Hook
 * @description Subscribes to real-time price updates via Socket.IO. Monitors connection health via ping/pong heartbeat.
 */
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth';
import type { PriceUpdate } from '@/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';

/** 하트비트 간격 (ms) — 30초마다 ping 전송 (Heartbeat interval — send ping every 30s) */
const HEARTBEAT_INTERVAL = 30_000;

/** pong 응답 대기 시간 (ms) — 5초 안에 pong이 없으면 연결 끊김으로 판단 (Pong timeout — reconnect if no pong within 5s) */
const PONG_TIMEOUT = 5_000;

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

  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pongTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** 하트비트 타이머 정리 (Clear all heartbeat timers) */
  const clearHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (pongTimeoutRef.current) {
      clearTimeout(pongTimeoutRef.current);
      pongTimeoutRef.current = null;
    }
  }, []);

  /** 하트비트 시작 (Start heartbeat ping/pong cycle) */
  const startHeartbeat = useCallback(
    (socket: Socket) => {
      clearHeartbeat();

      heartbeatIntervalRef.current = setInterval(() => {
        if (!socket.connected) return;

        // pong 대기 타이머 설정 (Set pong timeout — reconnect if no response)
        pongTimeoutRef.current = setTimeout(() => {
          // pong 미수신 — 소켓 끊고 재연결 유도
          // No pong received — disconnect to trigger Socket.IO reconnection
          socket.disconnect();
        }, PONG_TIMEOUT);

        socket.emit('ping');
      }, HEARTBEAT_INTERVAL);
    },
    [clearHeartbeat],
  );

  const connect = useCallback(() => {
    // 토큰 변경 시 기존 소켓 정리 후 재연결 (Cleanup and reconnect on token change)
    if (socketRef.current) {
      clearHeartbeat();
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
      // 연결 성공 시 하트비트 시작 (Start heartbeat on successful connection)
      startHeartbeat(socket);
    });

    socket.on('disconnect', () => {
      // 연결 해제 시 하트비트 정리 (Clear heartbeat on disconnect)
      clearHeartbeat();
    });

    // pong 수신 시 타임아웃 해제 (Clear pong timeout when pong received)
    socket.on('pong', () => {
      if (pongTimeoutRef.current) {
        clearTimeout(pongTimeoutRef.current);
        pongTimeoutRef.current = null;
      }
    });

    socket.on('price:update', (data: PriceUpdate) => {
      callbackRef.current(data);
    });

    socketRef.current = socket;
  }, [accessToken, startHeartbeat, clearHeartbeat]);

  useEffect(() => {
    connect();

    return () => {
      clearHeartbeat();
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [connect, clearHeartbeat]);

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
