/**
 * @file 채팅 소켓 훅
 * @description WebSocket 연결 관리 + 실시간 이벤트 수신 (싱글턴)
 *
 * @file Chat Socket Hook
 * @description WebSocket connection management + real-time event handling (singleton)
 */
'use client';

import { useEffect, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient, QueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import { usePresenceStore } from '@/stores/presence';
import { useLiveToastStore } from '@/stores/liveToast';
import { useSettingsStore } from '@/stores/settings';
import { t } from '@/lib/i18n';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';

/* ── 모듈 레벨 싱글턴 / Module-level singleton ── */
let sharedSocket: Socket | null = null;
let activeToken: string | null = null;
let refCount = 0;

/* ── 타이핑 상태 관리 / Typing state management ── */
const typingMap = new Map<string, Map<string, { username: string; timer: ReturnType<typeof setTimeout> }>>();
const typingListeners = new Set<() => void>();

function setTypingUser(roomId: string, userId: string, username: string) {
  if (!typingMap.has(roomId)) typingMap.set(roomId, new Map());
  const room = typingMap.get(roomId)!;
  const existing = room.get(userId);
  if (existing) clearTimeout(existing.timer);
  const timer = setTimeout(() => {
    room.delete(userId);
    if (room.size === 0) typingMap.delete(roomId);
    typingListeners.forEach((cb) => cb());
  }, 3000);
  room.set(userId, { username, timer });
  typingListeners.forEach((cb) => cb());
}

function getTypingUsers(roomId: string): string[] {
  const room = typingMap.get(roomId);
  if (!room) return [];
  return Array.from(room.values()).map((v) => v.username);
}

/** 특정 방의 타이핑 중인 사용자 목록 훅 (Hook: typing users for a room) */
export function useTypingUsers(roomId: string): string[] {
  const [users, setUsers] = useState<string[]>([]);

  useEffect(() => {
    const cb = () => {
      const next = getTypingUsers(roomId);
      setUsers((prev) => {
        if (prev.length === next.length && prev.every((u, i) => u === next[i])) return prev;
        return next;
      });
    };
    typingListeners.add(cb);
    cb();
    return () => { typingListeners.delete(cb); };
  }, [roomId]);

  return users;
}

function bindListeners(socket: Socket, qc: QueryClient) {
  socket.on('connect', () => {
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

  // 채팅 메시지 (Chat message)
  socket.on('chat:message', (data: {
    senderName?: string; senderUsername?: string; content?: string; roomId?: string; senderId?: string;
  }) => {
    qc.invalidateQueries({ queryKey: ['chat-messages'] });
    qc.invalidateQueries({ queryKey: ['chat-rooms'] });
    const me = useAuthStore.getState().user;
    if (data.senderId && me?.id === data.senderId) return;
    const { locale, notificationPrefs: prefs } = useSettingsStore.getState();
    if (!prefs.chat) return;
    useLiveToastStore.getState().addToast({
      category: 'chat-message',
      title: data.senderName || data.senderUsername || t('liveToast.chatMessage', locale),
      message: data.content || '',
      chatRoomId: data.roomId,
    });
  });

  socket.on('chat:read', () => {
    qc.invalidateQueries({ queryKey: ['chat-messages'] });
    qc.invalidateQueries({ queryKey: ['chat-rooms'] });
  });

  socket.on('chat:room-created', () => {
    qc.invalidateQueries({ queryKey: ['chat-rooms'] });
  });

  // 채팅방 초대 (Chat room invitation)
  socket.on('chat:invited', (data: { roomId?: string }) => {
    qc.invalidateQueries({ queryKey: ['chat-rooms'] });
    const { locale, notificationPrefs: prefs } = useSettingsStore.getState();
    if (!prefs.chat) return;
    useLiveToastStore.getState().addToast({
      category: 'chat-invited',
      title: t('liveToast.chatInvited', locale),
      message: t('liveToast.chatInvitedMsg', locale),
      chatRoomId: data.roomId,
    });
  });

  // 타이핑 인디케이터 (Typing indicator)
  socket.on('chat:typing', (data: { roomId: string; userId: string; username: string }) => {
    if (data.roomId && data.userId && data.username) {
      setTypingUser(data.roomId, data.userId, data.username);
    }
  });

  // 참여자 변경 (Participant update – invite/leave/kick)
  socket.on('chat:participant-update', () => {
    qc.invalidateQueries({ queryKey: ['chat-rooms'] });
    qc.invalidateQueries({ queryKey: ['chat-messages'] });
  });

  // 채팅방 퇴장 (Kicked from chat room)
  socket.on('chat:kicked', () => {
    qc.invalidateQueries({ queryKey: ['chat-rooms'] });
    const { locale, notificationPrefs: prefs } = useSettingsStore.getState();
    if (!prefs.chat) return;
    useLiveToastStore.getState().addToast({
      category: 'chat-kicked',
      title: t('liveToast.chatKicked', locale),
      message: t('liveToast.chatKickedMsg', locale),
    });
  });

  // 거래 체결 알림 (Trade execution)
  socket.on('notification:trade', (data: { title?: string; message?: string }) => {
    qc.invalidateQueries({ queryKey: ['notifications'] });
    qc.invalidateQueries({ queryKey: ['unread-count'] });
    const { locale, notificationPrefs: prefs } = useSettingsStore.getState();
    if (!prefs.trade) return;
    useLiveToastStore.getState().addToast({
      category: 'trade',
      title: data.title || t('liveToast.trade', locale),
      message: data.message || '',
      navigateTo: '/orders',
    });
  });

  // 가격 알림 (Price alert)
  socket.on('notification:price-alert', (data: { title?: string; message?: string; symbol?: string }) => {
    qc.invalidateQueries({ queryKey: ['notifications'] });
    qc.invalidateQueries({ queryKey: ['unread-count'] });
    qc.invalidateQueries({ queryKey: ['price-alerts'] });
    const { locale, notificationPrefs: prefs } = useSettingsStore.getState();
    if (!prefs.priceAlert) return;
    useLiveToastStore.getState().addToast({
      category: 'price-alert',
      title: data.title || t('liveToast.priceAlert', locale),
      message: data.message || '',
      navigateTo: data.symbol ? `/asset/${data.symbol}` : undefined,
    });
  });

  // 새 공지사항 (New announcement)
  socket.on('notification:announcement-new', (data: {
    title?: string; announcementId?: string; authorId?: string;
  }) => {
    const me = useAuthStore.getState().user;
    if (data.authorId && me?.id === data.authorId) return;
    const { locale, notificationPrefs: prefs } = useSettingsStore.getState();
    if (!prefs.announcement) return;
    useLiveToastStore.getState().addToast({
      category: 'announcement-new',
      title: t('liveToast.announcementNew', locale),
      message: data.title || '',
      navigateTo: data.announcementId ? `/announcements/${data.announcementId}` : '/announcements',
    });
  });

  // 공지사항 수정 (Announcement updated)
  socket.on('notification:announcement-updated', (data: {
    title?: string; announcementId?: string; authorId?: string;
  }) => {
    const me = useAuthStore.getState().user;
    if (data.authorId && me?.id === data.authorId) return;
    const { locale, notificationPrefs: prefs } = useSettingsStore.getState();
    if (!prefs.announcement) return;
    useLiveToastStore.getState().addToast({
      category: 'announcement-updated',
      title: t('liveToast.announcementUpdated', locale),
      message: data.title || '',
      navigateTo: data.announcementId ? `/announcements/${data.announcementId}` : '/announcements',
    });
  });

  // 가입 승인 (Registration approved)
  socket.on('notification:registration-approved', () => {
    const { locale, notificationPrefs: prefs } = useSettingsStore.getState();
    if (!prefs.registration) return;
    useLiveToastStore.getState().addToast({
      category: 'registration-approved',
      title: t('liveToast.registrationApproved', locale),
      message: t('liveToast.registrationApprovedMsg', locale),
      navigateTo: '/dashboard',
    });
  });

  // 가입 반려 (Registration rejected)
  socket.on('notification:registration-rejected', (data: { reason?: string }) => {
    const { locale, notificationPrefs: prefs } = useSettingsStore.getState();
    if (!prefs.registration) return;
    useLiveToastStore.getState().addToast({
      category: 'registration-rejected',
      title: t('liveToast.registrationRejected', locale),
      message: data.reason || t('liveToast.registrationRejectedMsg', locale),
    });
  });

  // 새 회원가입 요청 – ADMIN/SYSTEM만 표시 (New registration request – ADMIN/SYSTEM only)
  socket.on('notification:registration-request', (data: { username?: string; name?: string }) => {
    const me = useAuthStore.getState().user;
    if (!me || (me.role !== 'ADMIN' && me.role !== 'SYSTEM')) return;
    const { locale, notificationPrefs: prefs } = useSettingsStore.getState();
    if (!prefs.registration) return;
    useLiveToastStore.getState().addToast({
      category: 'registration-request',
      title: t('liveToast.registrationRequest', locale),
      message: data.name || data.username || '',
      navigateTo: '/admin',
    });
  });
}

function connectIfNeeded(token: string, qc: QueryClient) {
  // 토큰이 같고 소켓이 이미 존재하면 재사용 / Reuse if token matches
  if (sharedSocket && activeToken === token) return;

  // 기존 소켓 정리 / Clean up existing socket
  if (sharedSocket) {
    sharedSocket.removeAllListeners();
    sharedSocket.disconnect();
  }

  activeToken = token;

  const s = io(`${WS_URL}/chat`, {
    transports: ['websocket'],
    auth: { token },
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: 10,
  });

  bindListeners(s, qc);
  sharedSocket = s;
}

function disconnectIfIdle() {
  if (refCount <= 0 && sharedSocket) {
    sharedSocket.removeAllListeners();
    sharedSocket.disconnect();
    sharedSocket = null;
    activeToken = null;
  }
}

export function useChatSocket() {
  const qc = useQueryClient();
  const token = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!token) return;

    refCount++;
    connectIfNeeded(token, qc);

    return () => {
      refCount--;
      disconnectIfIdle();
    };
  }, [token, qc]);

  const joinRoom = useCallback((roomId: string) => {
    sharedSocket?.emit('chat:join-room', { roomId });
  }, []);

  const leaveRoom = useCallback((roomId: string) => {
    sharedSocket?.emit('chat:leave-room', { roomId });
  }, []);

  const emitTyping = useCallback((roomId: string) => {
    sharedSocket?.emit('chat:typing', { roomId });
  }, []);

  return { joinRoom, leaveRoom, emitTyping };
}
