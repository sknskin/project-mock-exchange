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

// WebSocket 서버 URL / WebSocket server URL
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';

/* ── 모듈 레벨 싱글턴 / Module-level singleton ──
 * 여러 컴포넌트에서 useChatSocket()을 호출해도 단일 소켓 연결만 유지합니다.
 * refCount로 참조 수를 관리하여, 마지막 사용처가 언마운트될 때 소켓을 종료합니다.
 *
 * Maintains a single socket connection even when useChatSocket() is called from multiple components.
 * Uses refCount to manage references; disconnects when the last consumer unmounts.
 */
let sharedSocket: Socket | null = null;
/** 현재 연결에 사용 중인 토큰 — 토큰 변경 감지에 사용
 * Token for current connection — used for change detection */
let activeToken: string | null = null;
/** 활성 구독자 수
 * Active subscriber count */
let refCount = 0;

/* ── 타이핑 상태 관리 / Typing state management ──
 * 모듈 레벨 Map으로 방별 타이핑 중인 사용자를 추적합니다.
 * 3초간 새 타이핑 이벤트가 없으면 자동으로 타이핑 상태를 제거합니다.
 *
 * Tracks typing users per room via module-level Map.
 * Automatically removes typing status after 3 seconds without new typing events.
 */
// roomId → (userId → { username, autoRemoveTimer }) 이중 맵 구조
// Double Map structure: roomId → (userId → { username, autoRemoveTimer })
const typingMap = new Map<string, Map<string, { username: string; timer: ReturnType<typeof setTimeout> }>>();
// 타이핑 상태 변경을 구독하는 리스너 집합 / Set of listeners subscribing to typing state changes
const typingListeners = new Set<() => void>();

/**
 * 특정 방에서 사용자의 타이핑 상태를 설정하는 함수
 * 3초 후 자동으로 타이핑 상태가 제거됩니다.
 *
 * Sets a user's typing status in a specific room.
 * Typing status is automatically removed after 3 seconds.
 *
 * @param roomId - 채팅방 ID / Chat room ID
 * @param userId - 타이핑 중인 사용자 ID / Typing user ID
 * @param username - 표시할 사용자명 / Display username
 */
function setTypingUser(roomId: string, userId: string, username: string) {
  if (!typingMap.has(roomId)) typingMap.set(roomId, new Map());
  const room = typingMap.get(roomId)!;
  // 기존 타이머가 있으면 초기화 (타이핑 지속 시 만료 연장)
  // Reset existing timer if present (extends expiry while typing continues)
  const existing = room.get(userId);
  if (existing) clearTimeout(existing.timer);
  // 3초 후 타이핑 상태 자동 제거 / Auto-remove typing status after 3 seconds
  const timer = setTimeout(() => {
    room.delete(userId);
    if (room.size === 0) typingMap.delete(roomId);
    typingListeners.forEach((cb) => cb());
  }, 3000);
  room.set(userId, { username, timer });
  // 모든 리스너에게 변경 알림 / Notify all listeners of the change
  typingListeners.forEach((cb) => cb());
}

/**
 * 특정 방에서 현재 타이핑 중인 사용자 이름 목록을 반환
 * Returns list of usernames currently typing in a specific room
 *
 * @param roomId - 채팅방 ID / Chat room ID
 * @returns 타이핑 중인 사용자 이름 배열 / Array of typing usernames
 */
function getTypingUsers(roomId: string): string[] {
  const room = typingMap.get(roomId);
  if (!room) return [];
  return Array.from(room.values()).map((v) => v.username);
}

/**
 * 특정 채팅방의 타이핑 중인 사용자 목록을 구독하는 훅
 * 모듈 레벨 typingMap 변경 시 리렌더링됩니다.
 * 불필요한 리렌더링을 방지하기 위해 shallow 비교를 수행합니다.
 *
 * Hook that subscribes to typing users in a specific chat room.
 * Re-renders when module-level typingMap changes.
 * Performs shallow comparison to prevent unnecessary re-renders.
 *
 * @param roomId - 채팅방 ID / Chat room ID
 * @returns 타이핑 중인 사용자 이름 배열 / Array of typing usernames
 */
export function useTypingUsers(roomId: string): string[] {
  const [users, setUsers] = useState<string[]>([]);

  useEffect(() => {
    const cb = () => {
      const next = getTypingUsers(roomId);
      setUsers((prev) => {
        // shallow 비교로 동일하면 이전 참조 유지 (불필요한 리렌더링 방지)
        // Keep previous reference if shallow-equal (prevents unnecessary re-renders)
        if (prev.length === next.length && prev.every((u, i) => u === next[i])) return prev;
        return next;
      });
    };
    typingListeners.add(cb);
    // 초기 상태 동기화 / Sync initial state
    cb();
    return () => { typingListeners.delete(cb); };
  }, [roomId]);

  return users;
}

/**
 * Socket.IO 이벤트 리스너를 바인딩하는 함수
 * 접속 상태, 채팅, 알림 등 모든 실시간 이벤트를 처리합니다.
 * 각 이벤트 수신 시 관련 TanStack Query 캐시를 무효화하고, 필요하면 라이브 토스트를 표시합니다.
 *
 * Binds all Socket.IO event listeners.
 * Handles presence, chat, and notification real-time events.
 * Invalidates relevant TanStack Query caches and shows live toasts when appropriate.
 *
 * @param socket - Socket.IO 소켓 인스턴스 / Socket.IO socket instance
 * @param qc - TanStack QueryClient 인스턴스 / TanStack QueryClient instance
 */
function bindListeners(socket: Socket, qc: QueryClient) {
  // 연결 시 현재 온라인 사용자 목록 요청 / Request online user list on connect
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
    type?: string;
  }) => {
    // 채팅방 삭제 알림 (Room deleted notification)
    if (data.type === 'room-deleted') {
      qc.invalidateQueries({ queryKey: ['chat-rooms'] });
      const { locale, notificationPrefs: prefs } = useSettingsStore.getState();
      if (!prefs.chat) return;
      useLiveToastStore.getState().addToast({
        category: 'chat-kicked',
        title: t('liveToast.chatRoomDeleted', locale),
        message: t('liveToast.chatRoomDeletedMsg', locale),
      });
      return;
    }

    qc.invalidateQueries({ queryKey: ['chat-messages'] });
    qc.invalidateQueries({ queryKey: ['chat-rooms'] });
    const me = useAuthStore.getState().user;
    if (data.senderId && me?.id === data.senderId) return;

    // 시스템 메시지 (초대/퇴장/강퇴) — 별도 토스트가 이미 존재하므로 스킵
    // System messages (invite/leave/kick) — skip toast since separate events handle them
    const SYSTEM_SENDER_ID = '00000000-0000-0000-0000-000000000000';
    if (data.senderId === SYSTEM_SENDER_ID) return;

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
  socket.on('notification:trade', (data: {
    title?: string; message?: string;
    side?: string; symbol?: string; quantity?: number; price?: number; filledStatus?: string;
  }) => {
    qc.invalidateQueries({ queryKey: ['notifications'] });
    qc.invalidateQueries({ queryKey: ['unread-count'] });
    qc.invalidateQueries({ queryKey: ['orders'] });
    qc.invalidateQueries({ queryKey: ['portfolio-valuation'] });
    const { locale, notificationPrefs: prefs } = useSettingsStore.getState();
    if (!prefs.trade) return;

    let title = data.title || t('liveToast.trade', locale);
    let message = data.message || '';

    // 구조화된 데이터가 있으면 로케일에 맞게 포맷 (Format with locale if structured data)
    if (data.side && data.symbol) {
      const sideText = data.side === 'BUY' ? t('liveToast.tradeBuy', locale) : t('liveToast.tradeSell', locale);
      title = `${sideText} ${data.symbol}`;
      const qty = data.quantity ?? 0;
      const price = data.price ?? 0;
      const statusText = data.filledStatus === 'FILLED'
        ? t('liveToast.tradeFilled', locale)
        : t('liveToast.tradePartiallyFilled', locale);
      message = `${qty} @ ${price.toFixed(2)} — ${statusText}`;
    }

    useLiveToastStore.getState().addToast({
      category: 'trade',
      title,
      message,
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

/**
 * 필요한 경우에만 싱글턴 소켓을 연결하는 함수
 * 토큰이 같고 소켓이 이미 연결되어 있으면 재사용합니다.
 * 토큰이 변경되었으면 기존 소켓을 정리하고 새로 연결합니다.
 *
 * Connects the singleton socket only when needed.
 * Reuses existing socket if token matches and socket is connected.
 * Cleans up and reconnects when the token changes.
 *
 * @param token - JWT 액세스 토큰 / JWT access token
 * @param qc - TanStack QueryClient 인스턴스 / TanStack QueryClient instance
 */
function connectIfNeeded(token: string, qc: QueryClient) {
  // 토큰이 같고 소켓이 이미 연결되어 있으면 재사용 / Reuse if token matches and socket is connected
  if (sharedSocket && activeToken === token && sharedSocket.connected) return;

  // 기존 소켓 정리 — 리스너 누적 방지를 위해 removeAllListeners 호출
  // Clean up existing socket — call removeAllListeners to prevent listener accumulation
  if (sharedSocket) {
    sharedSocket.removeAllListeners();
    sharedSocket.disconnect();
  }

  activeToken = token;

  // /chat 네임스페이스로 WebSocket 전용 연결
  // Connect to /chat namespace with WebSocket-only transport
  const s = io(`${WS_URL}/chat`, {
    transports: ['websocket'],
    auth: { token },
    reconnection: true,
    // 재연결 시 2초 대기 (서버 부하 방지) / Wait 2s before reconnection (prevents server overload)
    reconnectionDelay: 2000,
    reconnectionAttempts: 10,
  });

  bindListeners(s, qc);
  sharedSocket = s;
}

/**
 * 모든 구독자가 언마운트되면 소켓을 종료하는 함수
 * Disconnects the socket when all subscribers have unmounted
 */
function disconnectIfIdle() {
  if (refCount <= 0 && sharedSocket) {
    sharedSocket.removeAllListeners();
    sharedSocket.disconnect();
    sharedSocket = null;
    activeToken = null;
  }
}

/**
 * 채팅 WebSocket 연결을 관리하는 메인 훅
 * 싱글턴 소켓의 참조 카운트를 관리하고, 방 입퇴장 및 타이핑 이벤트 전송 함수를 제공합니다.
 *
 * Main hook for managing the chat WebSocket connection.
 * Manages reference counting of the singleton socket and provides
 * room join/leave and typing event emission functions.
 *
 * @returns {{ joinRoom, leaveRoom, emitTyping }} - 채팅방 제어 함수 / Chat room control functions
 */
export function useChatSocket() {
  const qc = useQueryClient();
  const token = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    // 토큰이 없으면 연결하지 않음 (미인증 상태)
    // Don't connect without a token (unauthenticated state)
    if (!token) return;

    // 참조 카운트 증가 및 소켓 연결 / Increment ref count and connect socket
    refCount++;
    connectIfNeeded(token, qc);

    return () => {
      // 참조 카운트 감소 및 유휴 시 소켓 종료 / Decrement ref count and disconnect if idle
      refCount--;
      disconnectIfIdle();
    };
  }, [token, qc]);

  /** 채팅방에 입장 (서버에 join 이벤트 전송)
   * Join a chat room (emit join event to server) */
  const joinRoom = useCallback((roomId: string) => {
    sharedSocket?.emit('chat:join-room', { roomId });
  }, []);

  /** 채팅방에서 퇴장 (서버에 leave 이벤트 전송)
   * Leave a chat room (emit leave event to server) */
  const leaveRoom = useCallback((roomId: string) => {
    sharedSocket?.emit('chat:leave-room', { roomId });
  }, []);

  /** 타이핑 인디케이터 이벤트 전송
   * Emit typing indicator event */
  const emitTyping = useCallback((roomId: string) => {
    sharedSocket?.emit('chat:typing', { roomId });
  }, []);

  return { joinRoom, leaveRoom, emitTyping };
}
