'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';

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
      // Connected to chat namespace
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
