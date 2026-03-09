/**
 * @file 채팅 UI 상태 스토어
 * @description 채팅 패널 열기/닫기, 고정, 위치/크기, 뷰 전환을 관리하는 Zustand 스토어
 *
 * @file Chat UI State Store
 * @description Zustand store managing chat panel open/close, pin, position/size, and view transitions
 */
import { create } from 'zustand';

// 채팅 패널 뷰 타입 / Chat panel view type
type ChatView = 'room-list' | 'room-view' | 'create-room';

// 패널 위치 (px) / Panel position (px)
interface ChatPosition {
  x: number;
  y: number;
}

// 패널 크기 (px) / Panel size (px)
interface ChatSize {
  width: number;
  height: number;
}

// localStorage 키 및 크기 제한 상수 / localStorage key and size constraint constants
const STORAGE_KEY = 'virtuex-chat-panel';
const DEFAULT_W = 380;
const DEFAULT_H = 560;
const MIN_W = 320;
const MIN_H = 400;

// localStorage에서 패널 위치/크기 복원 / Load panel position/size from localStorage
function loadPanelLayout(): { position: ChatPosition | null; size: ChatSize } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        position: parsed.position || null,
        size: parsed.size || { width: DEFAULT_W, height: DEFAULT_H },
      };
    }
  } catch { /* ignore */ }
  return { position: null, size: { width: DEFAULT_W, height: DEFAULT_H } };
}

// localStorage에 패널 위치/크기 저장 / Save panel position/size to localStorage
function savePanelLayout(position: ChatPosition | null, size: ChatSize) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ position, size }));
  } catch { /* ignore */ }
}

// 채팅 상태 인터페이스 / Chat state interface
interface ChatState {
  /** 패널 열림 여부
   * Whether panel is open */
  isOpen: boolean;
  /** 사이드바 고정 여부
   * Whether pinned to sidebar */
  isPinned: boolean;
  /** 현재 활성 채팅방 ID
   * Currently active room ID */
  activeRoomId: string | null;
  /** 현재 뷰 (방목록/채팅/생성)
   * Current view (room list/chat/create) */
  view: ChatView;
  /** 플로팅 패널 위치
   * Floating panel position */
  position: ChatPosition | null;
  /** 플로팅 패널 크기
   * Floating panel size */
  size: ChatSize;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  openRoom: (roomId: string) => void;
  backToList: () => void;
  setView: (view: ChatView) => void;
  setPosition: (pos: ChatPosition) => void;
  setSize: (size: ChatSize) => void;
  /** 고정/해제 토글 — 고정 시 position null, 해제 시 복원
   * Toggle pin — null position when pinned, restore when unpinned */
  togglePin: () => void;
  unpin: () => void;
}

const saved = typeof window !== 'undefined' ? loadPanelLayout() : { position: null, size: { width: DEFAULT_W, height: DEFAULT_H } };

export const useChatStore = create<ChatState>()((set, get) => ({
  isOpen: false,
  isPinned: false,
  activeRoomId: null,
  view: 'room-list',
  position: saved.position,
  size: saved.size,
  openChat: () => set({ isOpen: true }),
  closeChat: () => set({ isOpen: false, activeRoomId: null, view: 'room-list' }),
  toggleChat: () =>
    set((state) => ({
      isOpen: !state.isOpen,
      ...(state.isOpen ? { activeRoomId: null, view: 'room-list' as ChatView } : {}),
    })),
  openRoom: (roomId: string) => set({ activeRoomId: roomId, view: 'room-view' }),
  backToList: () => set({ activeRoomId: null, view: 'room-list' }),
  setView: (view: ChatView) => set({ view }),
  setPosition: (pos: ChatPosition) => {
    set({ position: pos });
    savePanelLayout(pos, get().size);
  },
  setSize: (size: ChatSize) => {
    const clamped = { width: Math.max(MIN_W, size.width), height: Math.max(MIN_H, size.height) };
    set({ size: clamped });
    savePanelLayout(get().position, clamped);
  },
  togglePin: () =>
    set((state) => {
      const willPin = !state.isPinned;
      if (willPin) {
        return { isPinned: true, isOpen: true, position: null };
      }
      const saved = loadPanelLayout();
      const pos = saved.position || { x: window.innerWidth - state.size.width - 8, y: 76 };
      return { isPinned: false, isOpen: state.isOpen, position: pos };
    }),
  unpin: () => set({ isPinned: false }),
}));

// 모바일 뷰포트(lg 미만, 1024px)에서 자동으로 사이드바 고정 해제
if (typeof window !== 'undefined') {
  const mql = window.matchMedia('(min-width: 1024px)');
  const handler = (e: MediaQueryListEvent) => {
    if (!e.matches) {
      useChatStore.getState().unpin();
    }
  };
  mql.addEventListener('change', handler);
}
