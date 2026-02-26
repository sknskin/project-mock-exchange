/**
 * @file 토스트 스토어
 * @description 전역 토스트 알림 상태를 관리하는 Zustand 스토어
 *
 * @file Toast Store
 * @description Zustand store for managing global toast notification state
 */
import { create } from 'zustand';

export type ToastType = 'default' | 'info' | 'error' | 'success';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastState {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: number) => void;
}

let nextId = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, type = 'default') => {
    const id = ++nextId;
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },
  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));
