/**
 * @file 온라인 상태 스토어
 * @description WebSocket 기반 사용자 온라인 상태를 관리합니다
 *
 * @file Presence Store
 * @description Manages user online status via WebSocket presence events
 */
import { create } from 'zustand';

interface PresenceState {
  onlineUserIds: Set<string>;
  setOnlineList: (userIds: string[]) => void;
  setOnline: (userId: string) => void;
  setOffline: (userId: string) => void;
  isOnline: (userId: string) => boolean;
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  onlineUserIds: new Set<string>(),

  setOnlineList: (userIds) => set({ onlineUserIds: new Set(userIds) }),

  setOnline: (userId) =>
    set((state) => {
      const next = new Set(state.onlineUserIds);
      next.add(userId);
      return { onlineUserIds: next };
    }),

  setOffline: (userId) =>
    set((state) => {
      const next = new Set(state.onlineUserIds);
      next.delete(userId);
      return { onlineUserIds: next };
    }),

  isOnline: (userId) => get().onlineUserIds.has(userId),
}));
