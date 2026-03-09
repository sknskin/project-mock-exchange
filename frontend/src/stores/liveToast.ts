/**
 * @file 실시간 토스트 스토어
 * @description WebSocket 이벤트 기반 실시간 토스트 알림 상태 관리 (최대 5개, 4초 자동 해제)
 *
 * @file Live Toast Store
 * @description Manages real-time toast notifications from WebSocket events (max 5, auto-dismiss 4s)
 */
import { create } from 'zustand';

// 실시간 토스트 카테고리 / Live toast category
export type LiveToastCategory =
  | 'chat-message'
  | 'chat-invited'
  | 'chat-kicked'
  | 'trade'
  | 'price-alert'
  | 'announcement-new'
  | 'announcement-updated'
  | 'registration-approved'
  | 'registration-rejected'
  | 'registration-request';

// 실시간 토스트 데이터 / Live toast data
export interface LiveToast {
  /** 고유 ID
   * Unique ID */
  id: number;
  /** 토스트 카테고리 (아이콘/색상 결정)
   * Toast category (determines icon/color) */
  category: LiveToastCategory;
  /** 토스트 제목
   * Toast title */
  title: string;
  /** 토스트 메시지
   * Toast message */
  message: string;
  /** 클릭 시 이동할 경로
   * Path to navigate on click */
  navigateTo?: string;
  /** 클릭 시 열 채팅방 ID
   * Chat room ID to open on click */
  chatRoomId?: string;
}

interface LiveToastState {
  toasts: LiveToast[];
  addToast: (toast: Omit<LiveToast, 'id'>) => void;
  removeToast: (id: number) => void;
}

// 최대 동시 표시 수 / Maximum simultaneous display count
const MAX_TOASTS = 5;
// 자동 해제 시간(ms) / Auto-dismiss time (ms)
const AUTO_DISMISS_MS = 4000;
// 자동 증가 ID / Auto-incrementing ID
let nextId = 0;

export const useLiveToastStore = create<LiveToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = ++nextId;
    set((s) => ({
      toasts: [...s.toasts.slice(-(MAX_TOASTS - 1)), { ...toast, id }],
    }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, AUTO_DISMISS_MS);
  },
  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));
