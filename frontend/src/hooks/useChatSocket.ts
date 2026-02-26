'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { usePresenceStore } from '@/stores/presence';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';

export function useChatSocket() {
  const socketRef = useRef<Socket | null>(null);
  const qc = useQueryClient();
  const token = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!token) return;

    const socket = io(`${WS_URL}/chat`, {
      transports: ['websocket'],
      auth: { token },
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 10,
    });

    socket.on('connect', () => {
      // 현재 접속 중인 사용자 목록 요청 (Request current online users list)
      socket.emit('presence:get-online');
    });

    // 접속 상태 이벤트 (Presence events)
    socket.on('presence:online-list', (data: { userIds: string[] }) => {
      usePresenceStore.getState().setOnlineList(data.userIds);
    });
    socket.on('presence:online', (data: { userId: string }) => {
      usePresenceStore.getState().setOnline(data.userId);
    });
    socket.on('presence:offline', (data: { userId: string }) => {
      usePresenceStore.getState().setOffline(data.userId);
    });

    socket.on('chat:message', () => {
      qc.invalidateQueries({ queryKey: ['chat-messages'] });
      qc.invalidateQueries({ queryKey: ['chat-rooms'] });
    });

    socket.on('chat:read', () => {
      qc.invalidateQueries({ queryKey: ['chat-messages'] });
      qc.invalidateQueries({ queryKey: ['chat-rooms'] });
    });

    socket.on('chat:room-created', () => {
      qc.invalidateQueries({ queryKey: ['chat-rooms'] });
    });

    socket.on('chat:invited', () => {
      qc.invalidateQueries({ queryKey: ['chat-rooms'] });
    });

    socket.on('chat:kicked', () => {
      qc.invalidateQueries({ queryKey: ['chat-rooms'] });
      useToastStore.getState().addToast('You have been removed from a room', 'error');
    });

    // 거래 체결 알림 (Trade execution notifications)
    socket.on('notification:trade', (data: { title?: string; message?: string }) => {
      if (data.title) {
        useToastStore.getState().addToast(`${data.title}: ${data.message || ''}`);
      }
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['unread-count'] });
    });

    // 가격 알림 (Price alert notifications)
    socket.on('notification:price-alert', (data: { title?: string; message?: string; symbol?: string }) => {
      if (data.title) {
        useToastStore.getState().addToast(`${data.title}: ${data.message || ''}`);
      }
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['unread-count'] });
      qc.invalidateQueries({ queryKey: ['price-alerts'] });
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, qc]);

  const joinRoom = useCallback((roomId: string) => {
    socketRef.current?.emit('chat:join-room', { roomId });
  }, []);

  const leaveRoom = useCallback((roomId: string) => {
    socketRef.current?.emit('chat:leave-room', { roomId });
  }, []);

  const emitTyping = useCallback((roomId: string) => {
    socketRef.current?.emit('chat:typing', { roomId });
  }, []);

  return { joinRoom, leaveRoom, emitTyping };
}
