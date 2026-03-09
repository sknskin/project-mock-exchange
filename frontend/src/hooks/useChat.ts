/**
 * @file 채팅 데이터 훅
 * @description TanStack Query로 채팅방 CRUD, 메시지 조회/전송, 사용자 검색 등을 처리합니다.
 *              메시지 조회는 무한 스크롤(커서 기반 페이지네이션)을 사용합니다.
 *
 * @file Chat Data Hooks
 * @description Handles chat room CRUD, message fetching/sending, and user search via TanStack Query.
 *              Message fetching uses infinite scroll (cursor-based pagination).
 */
'use client';

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { useTranslation } from '@/hooks/useTranslation';
import type { ChatRoom, ChatMessage, ChatUserSearchResult } from '@/types';

// ===== 채팅방 조회 (Chat Room Queries) =====

/**
 * 현재 사용자의 채팅방 목록을 조회하는 훅
 * Hook that fetches the current user's chat room list
 *
 * @returns TanStack Query 결과 (ChatRoom[]) / TanStack Query result (ChatRoom[])
 */
export function useChatRooms() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['chat-rooms'],
    queryFn: async () => {
      const { data } = await api.get('/api/chat/rooms');
      return data.data as ChatRoom[];
    },
    // 30초마다 폴링 (WebSocket 이벤트와 병행하여 안정성 확보)
    // Poll every 30s (alongside WebSocket events for reliability)
    refetchInterval: 30000,
    // 인증된 사용자만 조회 / Only fetch for authenticated users
    enabled: isAuthenticated,
  });
}

/**
 * 특정 채팅방의 메시지를 커서 기반 무한 스크롤로 조회하는 훅
 * 한 페이지당 30개 메시지를 로드하며, nextCursor가 null이면 더 이상 데이터 없음
 *
 * Hook that fetches messages for a specific room with cursor-based infinite scroll.
 * Loads 30 messages per page; nextCursor=null means no more data.
 *
 * @param roomId - 채팅방 ID (null이면 비활성화) / Chat room ID (disabled if null)
 * @returns TanStack InfiniteQuery 결과 / TanStack InfiniteQuery result
 */
export function useChatMessages(roomId: string | null) {
  return useInfiniteQuery({
    queryKey: ['chat-messages', roomId],
    queryFn: async ({ pageParam }) => {
      const params: Record<string, string> = { limit: '30' };
      // pageParam이 있으면 해당 커서 이전의 메시지를 조회
      // If pageParam exists, fetch messages before that cursor
      if (pageParam) params.cursor = pageParam;
      const { data } = await api.get(`/api/chat/rooms/${roomId}/messages`, { params });
      return data.data as { items: ChatMessage[]; nextCursor: string | null };
    },
    initialPageParam: undefined as string | undefined,
    // nextCursor가 null이면 undefined를 반환하여 hasNextPage=false 처리
    // Return undefined when nextCursor is null to set hasNextPage=false
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!roomId,
    retry: 2,
  });
}

// ===== 채팅방 관리 뮤테이션 (Chat Room Management Mutations) =====

/**
 * 새 채팅방 생성 뮤테이션 훅 (DM 또는 그룹)
 * Mutation hook for creating a new chat room (DM or GROUP)
 *
 * @returns mutate 함수에 { type, name?, participantIds, participantUsernames, participantNames? } 전달
 *          Pass { type, name?, participantIds, participantUsernames, participantNames? } to mutate
 */
export function useCreateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      /** 'DM' = 1:1 대화, 'GROUP' = 그룹 채팅 / 'DM' = direct message, 'GROUP' = group chat */
      type: 'DM' | 'GROUP';
      name?: string;
      participantIds: string[];
      /** userId → username 매핑 (서버에서 참여자 표시명에 사용) / userId → username mapping (used for participant display names on server) */
      participantUsernames: Record<string, string>;
      participantNames?: Record<string, string>;
    }) => {
      const { data } = await api.post('/api/chat/rooms', body);
      return data.data as ChatRoom;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-rooms'] });
    },
  });
}

// ===== 메시지 전송 (Message Sending) =====

/**
 * 채팅 메시지 전송 뮤테이션 훅
 * 성공 시 전체 리페치 대신 캐시에 직접 새 메시지를 추가하여 스크롤 위치를 유지합니다.
 * 이는 채팅 UX에서 중요한 패턴입니다 — 리페치하면 스크롤이 최상단으로 이동하기 때문입니다.
 *
 * Mutation hook for sending a chat message.
 * On success, appends the new message directly to cache instead of full refetch to preserve scroll position.
 * This is an important UX pattern in chat — full refetch would reset scroll to top.
 *
 * @returns mutate 함수에 { roomId, content } 전달 / Pass { roomId, content } to mutate
 */
export function useSendMessage() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async ({ roomId, content }: { roomId: string; content: string }) => {
      const { data } = await api.post(`/api/chat/rooms/${roomId}/messages`, { content });
      return data.data as ChatMessage;
    },
    onSuccess: (newMessage, variables) => {
      // 낙관적 캐시 업데이트: 첫 번째 페이지의 items 배열 끝에 새 메시지 추가
      // Optimistic cache update: append new message to end of first page's items array
      type MessagesCache = { pages: { items: ChatMessage[]; nextCursor: string | null }[]; pageParams: unknown[] };
      qc.setQueryData<MessagesCache>(['chat-messages', variables.roomId], (old) => {
        if (!old?.pages?.length) return old;
        const pages = [...old.pages];
        pages[0] = { ...pages[0], items: [...pages[0].items, newMessage] };
        return { ...old, pages };
      });
      // 채팅방 목록의 최신 메시지 표시 갱신 / Update latest message display in chat rooms list
      qc.invalidateQueries({ queryKey: ['chat-rooms'] });
    },
    onError: () => {
      useToastStore.getState().addToast(t('chat.sendFailed'), 'error');
    },
  });
}

/**
 * 채팅방 읽음 처리 뮤테이션 훅
 * Mutation hook for marking a chat room as read
 *
 * @returns mutate 함수에 roomId 전달 / Pass roomId to mutate
 */
export function useMarkRoomRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (roomId: string) => {
      const { data } = await api.post(`/api/chat/rooms/${roomId}/read`);
      return data;
    },
    onSuccess: () => {
      // 읽음 상태 변경 → 채팅방 목록의 안 읽은 메시지 수 갱신
      // Read status change → refresh unread count in chat rooms list
      qc.invalidateQueries({ queryKey: ['chat-rooms'] });
    },
  });
}

/**
 * 채팅방에 사용자 초대 뮤테이션 훅
 * Mutation hook for inviting users to a chat room
 *
 * @returns mutate 함수에 { roomId, userIds, usernames, names? } 전달
 *          Pass { roomId, userIds, usernames, names? } to mutate
 */
export function useInviteToRoom() {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async ({
      roomId,
      userIds,
      usernames,
      names,
    }: {
      roomId: string;
      userIds: string[];
      usernames: Record<string, string>;
      names?: Record<string, string>;
    }) => {
      const { data } = await api.post(`/api/chat/rooms/${roomId}/invite`, {
        userIds,
        usernames,
        names: names || {},
      });
      return data;
    },
    onSuccess: () => {
      useToastStore.getState().addToast(t('toast.chatInvited'), 'success');
    },
  });
}

/**
 * 채팅방 나가기 뮤테이션 훅
 * Mutation hook for leaving a chat room
 *
 * @returns mutate 함수에 roomId 전달 / Pass roomId to mutate
 */
export function useLeaveRoom() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async (roomId: string) => {
      const { data } = await api.post(`/api/chat/rooms/${roomId}/leave`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-rooms'] });
      useToastStore.getState().addToast(t('toast.chatLeft'), 'success');
    },
  });
}

/**
 * 채팅방에서 사용자 강제 퇴장 뮤테이션 훅
 * Mutation hook for kicking a user from a chat room
 *
 * @returns mutate 함수에 { roomId, targetUserId } 전달 / Pass { roomId, targetUserId } to mutate
 */
export function useKickFromRoom() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async ({ roomId, targetUserId }: { roomId: string; targetUserId: string }) => {
      const { data } = await api.post(`/api/chat/rooms/${roomId}/kick`, { targetUserId });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-rooms'] });
      useToastStore.getState().addToast(t('toast.chatKicked'), 'success');
    },
  });
}

/**
 * 채팅방 이름 변경 뮤테이션 훅
 * Mutation hook for renaming a chat room
 *
 * @returns mutate 함수에 { roomId, name } 전달 / Pass { roomId, name } to mutate
 */
export function useRenameRoom() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async ({ roomId, name }: { roomId: string; name: string }) => {
      const { data } = await api.post(`/api/chat/rooms/${roomId}/rename`, { name });
      return data.data as { id: string; name: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-rooms'] });
      useToastStore.getState().addToast(t('toast.chatRenamed'), 'success');
    },
  });
}

/**
 * 채팅방 삭제 뮤테이션 훅
 * Mutation hook for deleting a chat room
 *
 * @returns mutate 함수에 roomId 전달 / Pass roomId to mutate
 */
export function useDeleteRoom() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async (roomId: string) => {
      const { data } = await api.delete(`/api/chat/rooms/${roomId}`);
      return data.data as { success: boolean; deletedRoomId: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-rooms'] });
      useToastStore.getState().addToast(t('toast.chatDeleted'), 'success');
    },
  });
}

// ===== 메시지 삭제 (Message Deletion) =====

/**
 * 채팅 메시지 삭제 뮤테이션 훅
 * 성공 시 전체 리페치 대신 캐시에서 직접 메시지를 제거하여 스크롤 위치를 유지합니다.
 * 모든 페이지를 순회하며 삭제된 메시지 ID에 해당하는 항목을 필터링합니다.
 *
 * Mutation hook for deleting a chat message.
 * On success, removes the message directly from cache instead of full refetch to preserve scroll position.
 * Iterates through all pages to filter out the item matching the deleted message ID.
 *
 * @returns mutate 함수에 { roomId, messageId } 전달 / Pass { roomId, messageId } to mutate
 */
export function useDeleteMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ roomId, messageId }: { roomId: string; messageId: string }) => {
      const { data } = await api.delete(`/api/chat/rooms/${roomId}/messages/${messageId}`);
      return data.data as { success: boolean; deletedMessageId: string };
    },
    onSuccess: (result, variables) => {
      // 캐시에서 삭제된 메시지를 직접 제거 (모든 페이지 순회)
      // Directly remove deleted message from cache (iterating all pages)
      type MessagesCache = { pages: { items: ChatMessage[]; nextCursor: string | null }[]; pageParams: unknown[] };
      qc.setQueryData<MessagesCache>(['chat-messages', variables.roomId], (old) => {
        if (!old?.pages?.length) return old;
        const pages = old.pages.map((page) => ({
          ...page,
          items: page.items.filter((msg) => msg.id !== result.deletedMessageId),
        }));
        return { ...old, pages };
      });
      qc.invalidateQueries({ queryKey: ['chat-rooms'] });
    },
  });
}

// ===== 사용자 검색 (User Search) =====

/**
 * 채팅 사용자 검색 훅 (채팅방 초대 시 사용)
 * Hook for searching chat users (used when inviting to a chat room)
 *
 * @param query - 검색어 (이름 또는 아이디) / Search query (name or username)
 * @param excludeIds - 검색 결과에서 제외할 사용자 ID 배열 (이미 초대된 사용자 등) / User IDs to exclude from results (e.g., already invited users)
 * @returns TanStack Query 결과 (ChatUserSearchResult[]) / TanStack Query result (ChatUserSearchResult[])
 */
export function useSearchUsers(query: string, excludeIds?: string[]) {
  return useQuery({
    queryKey: ['chat-user-search', query, excludeIds],
    enabled: query.trim().length > 0,
    queryFn: async () => {
      const { data } = await api.get('/api/chat/users/search', {
        params: {
          q: query || '',
          // 배열을 쉼표 구분 문자열로 변환하여 쿼리 파라미터로 전달
          // Convert array to comma-separated string for query parameter
          excludeIds: excludeIds?.join(',') || undefined,
        },
      });
      return data.data as ChatUserSearchResult[];
    },
  });
}
