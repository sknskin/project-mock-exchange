import { create } from 'zustand';

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

export interface LiveToast {
  id: number;
  category: LiveToastCategory;
  title: string;
  message: string;
  navigateTo?: string;
  chatRoomId?: string;
}

interface LiveToastState {
  toasts: LiveToast[];
  addToast: (toast: Omit<LiveToast, 'id'>) => void;
  removeToast: (id: number) => void;
}

const MAX_TOASTS = 5;
const AUTO_DISMISS_MS = 4000;
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
