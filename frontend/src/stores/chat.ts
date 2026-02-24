import { create } from 'zustand';

type ChatView = 'room-list' | 'room-view' | 'create-room';

interface ChatState {
  isOpen: boolean;
  activeRoomId: string | null;
  view: ChatView;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  openRoom: (roomId: string) => void;
  backToList: () => void;
  setView: (view: ChatView) => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  isOpen: false,
  activeRoomId: null,
  view: 'room-list',
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
}));
