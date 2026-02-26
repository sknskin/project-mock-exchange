'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import { usePresenceStore } from '@/stores/presence';
import { useLiveToastStore } from '@/stores/liveToast';
import { useSettingsStore } from '@/stores/settings';
import { t } from '@/lib/i18n';

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
      const locale = useSettingsStore.getState().locale;
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
      const locale = useSettingsStore.getState().locale;
      useLiveToastStore.getState().addToast({
        category: 'chat-invited',
        title: t('liveToast.chatInvited', locale),
        message: t('liveToast.chatInvitedMsg', locale),
        chatRoomId: data.roomId,
      });
    });

    // 채팅방 퇴장 (Kicked from chat room)
    socket.on('chat:kicked', () => {
      qc.invalidateQueries({ queryKey: ['chat-rooms'] });
      const locale = useSettingsStore.getState().locale;
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
      const locale = useSettingsStore.getState().locale;
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
      const locale = useSettingsStore.getState().locale;
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
      const locale = useSettingsStore.getState().locale;
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
      const locale = useSettingsStore.getState().locale;
      useLiveToastStore.getState().addToast({
        category: 'announcement-updated',
        title: t('liveToast.announcementUpdated', locale),
        message: data.title || '',
        navigateTo: data.announcementId ? `/announcements/${data.announcementId}` : '/announcements',
      });
    });

    // 가입 승인 (Registration approved)
    socket.on('notification:registration-approved', () => {
      const locale = useSettingsStore.getState().locale;
      useLiveToastStore.getState().addToast({
        category: 'registration-approved',
        title: t('liveToast.registrationApproved', locale),
        message: t('liveToast.registrationApprovedMsg', locale),
        navigateTo: '/dashboard',
      });
    });

    // 가입 반려 (Registration rejected)
    socket.on('notification:registration-rejected', (data: { reason?: string }) => {
      const locale = useSettingsStore.getState().locale;
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
      const locale = useSettingsStore.getState().locale;
      useLiveToastStore.getState().addToast({
        category: 'registration-request',
        title: t('liveToast.registrationRequest', locale),
        message: data.name || data.username || '',
        navigateTo: '/admin',
      });
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
