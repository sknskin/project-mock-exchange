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

// WebSocket 서버 URL (환경 변수 또는 기본값) / WebSocket server URL (env variable or default)
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';

/** 하트비트 간격 (ms) — 30초마다 ping 전송 (Heartbeat interval — send ping every 30s) */
const HEARTBEAT_INTERVAL = 30_000;

/** pong 응답 대기 시간 (ms) — 5초 안에 pong이 없으면 연결 끊김으로 판단 (Pong timeout — reconnect if no pong within 5s) */
const PONG_TIMEOUT = 5_000;

/**
 * 실시간 가격 업데이트를 구독하는 WebSocket 훅
 * Socket.IO /prices 네임스페이스에 연결하여 price:update 이벤트를 수신합니다.
 * 자체 ping/pong 하트비트로 연결 상태를 모니터링하고, 끊김 감지 시 자동 재연결합니다.
 *
 * WebSocket hook that subscribes to real-time price updates.
 * Connects to Socket.IO /prices namespace and listens for price:update events.
 * Monitors connection health via custom ping/pong heartbeat; auto-reconnects on disconnection.
 *
 * @param symbols - 구독할 종목 심볼 배열 / Array of asset symbols to subscribe to
 * @param onPriceUpdate - 가격 업데이트 수신 콜백 / Callback for receiving price updates
 */
export function useWebSocket(
  symbols: string[],
  onPriceUpdate: (update: PriceUpdate) => void,
) {
  const socketRef = useRef<Socket | null>(null);
  // 콜백을 ref에 저장하여 useEffect 재실행 없이 최신 콜백 참조 유지
  // Store callback in ref to maintain latest reference without re-running useEffect
  const callbackRef = useRef(onPriceUpdate);
  callbackRef.current = onPriceUpdate;
  // symbols를 ref에 저장하여 connect 콜백 내에서 최신 값 참조
  // Store symbols in ref for access to latest value inside connect callback
  const symbolsRef = useRef(symbols);
  symbolsRef.current = symbols;
  // 인증 토큰 — 토큰 변경 시 소켓을 재연결하여 새 토큰으로 인증
  // Auth token — reconnect socket on token change for re-authentication
  const accessToken = useAuthStore((s) => s.accessToken);

  // 하트비트 타이머 참조 / Heartbeat timer references
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

  /**
   * Socket.IO 연결을 생성하는 함수
   * accessToken이 변경될 때마다 기존 소켓을 정리하고 새로 연결합니다.
   *
   * Creates a Socket.IO connection.
   * Cleans up existing socket and reconnects whenever accessToken changes.
   */
  const connect = useCallback(() => {
    // 토큰 변경 시 기존 소켓 정리 후 재연결 (Cleanup and reconnect on token change)
    if (socketRef.current) {
      clearHeartbeat();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Socket.IO /prices 네임스페이스에 WebSocket 전용 연결
    // Connect to Socket.IO /prices namespace with WebSocket-only transport
    const socket = io(`${WS_URL}/prices`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      // 인증 토큰 전달 (있는 경우) / Pass auth token if available
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

  // 컴포넌트 마운트 시 연결, 언마운트 시 정리
  // Connect on mount, cleanup on unmount
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

  // 이전 심볼 목록을 추적하여 diff 기반 구독/구독해제 수행
  // Track previous symbols for diff-based subscribe/unsubscribe
  const prevSymbolsRef = useRef<string[]>([]);

  // symbols 배열이 변경될 때 구독 목록을 업데이트
  // Update subscriptions when the symbols array changes
  useEffect(() => {
    if (socketRef.current?.connected) {
      // 제거된 심볼만 선택적으로 구독 해제 (효율적 diff)
      // Selectively unsubscribe only removed symbols (efficient diff)
      const removed = prevSymbolsRef.current.filter((s) => !symbols.includes(s));
      if (removed.length > 0) {
        for (const symbol of removed) {
          socketRef.current.emit('unsubscribe', { channel: `prices:${symbol}` });
        }
      }
      // 새 심볼 구독 — 서버에서 중복 구독을 자동 처리함
      // Subscribe to new symbols — server handles duplicate subscriptions automatically
      if (symbols.length > 0) {
        socketRef.current.emit('subscribe', { symbols });
      }
    }
    prevSymbolsRef.current = symbols;
  }, [symbols]);
}
