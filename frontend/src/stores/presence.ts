/**
 * @file 온라인 상태 스토어
 * @description WebSocket 기반 사용자 온라인 상태를 관리합니다
 *
 * @file Presence Store
 * @description Manages user online status via WebSocket presence events
 */
import { create } from 'zustand';

// 프레즌스 상태 인터페이스 / Presence state interface
interface PresenceState {
  /** 현재 온라인 사용자 ID 집합 / Set of currently online user IDs */
  onlineUserIds: Set<string>;
  /** 전체 온라인 목록 갱신 (초기 로드) / Update full online list (initial load) */
  setOnlineList: (userIds: string[]) => void;
  /** 개별 사용자 온라인 표시 / Mark individual user as online */
  setOnline: (userId: string) => void;
  /** 개별 사용자 오프라인 표시 / Mark individual user as offline */
  setOffline: (userId: string) => void;
  /** 특정 사용자의 온라인 여부 확인 / Check if specific user is online */
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
