import { create } from 'zustand';

type ChatView = 'room-list' | 'room-view' | 'create-room';

interface ChatPosition {
  x: number;
  y: number;
}

interface ChatState {
  isOpen: boolean;
  isPinned: boolean;
  activeRoomId: string | null;
  view: ChatView;
  position: ChatPosition | null;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  openRoom: (roomId: string) => void;
  backToList: () => void;
  setView: (view: ChatView) => void;
  setPosition: (pos: ChatPosition) => void;
  togglePin: () => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  isOpen: false,
  isPinned: false,
  activeRoomId: null,
  view: 'room-list',
  position: null,
  openChat: () => set({ isOpen: true }),
  closeChat: () => set({ isOpen: false, activeRoomId: null, view: 'room-list', position: null }),
  toggleChat: () =>
    set((state) => ({
      isOpen: !state.isOpen,
      ...(state.isOpen ? { activeRoomId: null, view: 'room-list' as ChatView, position: null } : {}),
    })),
  openRoom: (roomId: string) => set({ activeRoomId: roomId, view: 'room-view' }),
  backToList: () => set({ activeRoomId: null, view: 'room-list' }),
  setView: (view: ChatView) => set({ view }),
  setPosition: (pos: ChatPosition) => set({ position: pos }),
  togglePin: () =>
    set((state) => ({
      isPinned: !state.isPinned,
      isOpen: !state.isPinned ? true : state.isOpen,
      position: null,
    })),
}));
