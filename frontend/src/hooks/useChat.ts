'use client';

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
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
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['chat-messages', variables.roomId] });
      qc.invalidateQueries({ queryKey: ['chat-rooms'] });
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
    }: {
      roomId: string;
      userIds: string[];
      usernames: Record<string, string>;
    }) => {
      const { data } = await api.post(`/api/chat/rooms/${roomId}/invite`, {
        userIds,
        usernames,
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

export function useSearchUsers(query: string) {
  return useQuery({
    queryKey: ['chat-user-search', query],
    queryFn: async () => {
      const { data } = await api.get('/api/chat/users/search', {
        params: { q: query || '' },
      });
      return data.data as ChatUserSearchResult[];
    },
  });
}
