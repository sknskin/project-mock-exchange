/**
 * @file 토스트 스토어
 * @description 전역 토스트 알림 상태를 관리하는 Zustand 스토어
 *
 * @file Toast Store
 * @description Zustand store for managing global toast notification state
 */
import { create } from 'zustand';

// 토스트 유형 / Toast type
export type ToastType = 'default' | 'info' | 'error' | 'success';

// 개별 토스트 데이터 / Individual toast data
interface Toast {
  /** 고유 ID / Unique ID */
  id: number;
  /** 표시 메시지 / Display message */
  message: string;
  /** 토스트 유형 (색상 결정) / Toast type (determines color) */
  type: ToastType;
}

// 토스트 상태 인터페이스 / Toast state interface
interface ToastState {
  /** 현재 표시 중인 토스트 목록 / Currently displayed toasts */
  toasts: Toast[];
  /** 토스트 추가 (3초 후 자동 제거) / Add toast (auto-removed after 3s) */
  addToast: (message: string, type?: ToastType) => void;
  /** 토스트 수동 제거 / Manually remove toast */
  removeToast: (id: number) => void;
}

// 모듈 레벨 ID 카운터 — 컴포넌트 리렌더링에 영향받지 않는 고유 ID 생성
// Module-level ID counter — generates unique IDs unaffected by component re-renders
let nextId = 0;

/**
 * 전역 토스트 알림 상태를 관리하는 Zustand 스토어
 * addToast()로 추가된 토스트는 3초 후 자동으로 제거됩니다.
 * 컴포넌트 외부에서도 useToastStore.getState().addToast()로 직접 호출 가능합니다.
 *
 * Zustand store for managing global toast notification state.
 * Toasts added via addToast() are automatically removed after 3 seconds.
 * Can also be called directly outside components via useToastStore.getState().addToast().
 */
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, type = 'default') => {
    const id = ++nextId;
    // 토스트 배열에 추가 / Append to toast array
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    // 3초 후 자동 제거 — setTimeout으로 비동기 처리
    // Auto-remove after 3 seconds — async via setTimeout
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },
  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));
