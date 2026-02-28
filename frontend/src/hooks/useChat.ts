'use client';

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import type { ChatRoom, ChatMessage, ChatUserSearchResult } from '@/types';

export function useChatRooms() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['chat-rooms'],
    queryFn: async () => {
      const { data } = await api.get('/api/chat/rooms');
      return data.data as ChatRoom[];
    },
    refetchInterval: 30000,
    enabled: isAuthenticated,
  });
}

export function useChatMessages(roomId: string | null) {
  return useInfiniteQuery({
    queryKey: ['chat-messages', roomId],
    queryFn: async ({ pageParam }) => {
      const params: Record<string, string> = { limit: '30' };
      if (pageParam) params.cursor = pageParam;
      const { data } = await api.get(`/api/chat/rooms/${roomId}/messages`, { params });
      return data.data as { items: ChatMessage[]; nextCursor: string | null };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!roomId,
    retry: 2,
  });
}

export function useCreateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      type: 'DM' | 'GROUP';
      name?: string;
      participantIds: string[];
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

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ roomId, content }: { roomId: string; content: string }) => {
      const { data } = await api.post(`/api/chat/rooms/${roomId}/messages`, { content });
      return data.data as ChatMessage;
    },
    onSuccess: (newMessage, variables) => {
      // 전체 리페치 대신 캐시에 직접 추가하여 스크롤 위치 유지
      // (Append to cache instead of full refetch to preserve scroll position)
      type MessagesCache = { pages: { items: ChatMessage[]; nextCursor: string | null }[]; pageParams: unknown[] };
      qc.setQueryData<MessagesCache>(['chat-messages', variables.roomId], (old) => {
        if (!old?.pages?.length) return old;
        const pages = [...old.pages];
        pages[0] = { ...pages[0], items: [...pages[0].items, newMessage] };
        return { ...old, pages };
      });
      qc.invalidateQueries({ queryKey: ['chat-rooms'] });
    },
    onError: () => {
      useToastStore.getState().addToast('메시지 전송에 실패했습니다', 'error');
    },
  });
}

export function useMarkRoomRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (roomId: string) => {
      const { data } = await api.post(`/api/chat/rooms/${roomId}/read`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-rooms'] });
    },
  });
}

export function useInviteToRoom() {
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
  });
}

export function useLeaveRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (roomId: string) => {
      const { data } = await api.post(`/api/chat/rooms/${roomId}/leave`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-rooms'] });
    },
  });
}

export function useKickFromRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ roomId, targetUserId }: { roomId: string; targetUserId: string }) => {
      const { data } = await api.post(`/api/chat/rooms/${roomId}/kick`, { targetUserId });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-rooms'] });
    },
  });
}

export function useRenameRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ roomId, name }: { roomId: string; name: string }) => {
      const { data } = await api.post(`/api/chat/rooms/${roomId}/rename`, { name });
      return data.data as { id: string; name: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-rooms'] });
    },
  });
}

export function useDeleteRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (roomId: string) => {
      const { data } = await api.delete(`/api/chat/rooms/${roomId}`);
      return data.data as { success: boolean; deletedRoomId: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-rooms'] });
    },
  });
}

export function useDeleteMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ roomId, messageId }: { roomId: string; messageId: string }) => {
      const { data } = await api.delete(`/api/chat/rooms/${roomId}/messages/${messageId}`);
      return data.data as { success: boolean; deletedMessageId: string };
    },
    onSuccess: (result, variables) => {
      // 캐시에서 삭제된 메시지 제거 (Remove deleted message from cache)
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

export function useSearchUsers(query: string, excludeIds?: string[]) {
  return useQuery({
    queryKey: ['chat-user-search', query, excludeIds],
    queryFn: async () => {
      const { data } = await api.get('/api/chat/users/search', {
        params: {
          q: query || '',
          excludeIds: excludeIds?.join(',') || undefined,
        },
      });
      return data.data as ChatUserSearchResult[];
    },
  });
}
