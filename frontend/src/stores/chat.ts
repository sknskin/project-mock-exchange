import { create } from 'zustand';

type ChatView = 'room-list' | 'room-view' | 'create-room';

interface ChatPosition {
  x: number;
  y: number;
}

interface ChatSize {
  width: number;
  height: number;
}

const STORAGE_KEY = 'virtuex-chat-panel';
const DEFAULT_W = 380;
const DEFAULT_H = 560;
const MIN_W = 320;
const MIN_H = 400;

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

function savePanelLayout(position: ChatPosition | null, size: ChatSize) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ position, size }));
  } catch { /* ignore */ }
}

interface ChatState {
  isOpen: boolean;
  isPinned: boolean;
  activeRoomId: string | null;
  view: ChatView;
  position: ChatPosition | null;
  size: ChatSize;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  openRoom: (roomId: string) => void;
  backToList: () => void;
  setView: (view: ChatView) => void;
  setPosition: (pos: ChatPosition) => void;
  setSize: (size: ChatSize) => void;
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
