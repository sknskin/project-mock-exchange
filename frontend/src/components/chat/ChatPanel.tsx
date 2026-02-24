'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useChatStore } from '@/stores/chat';
import { useLeaveRoom } from '@/hooks/useChat';
import { useChatSocket } from '@/hooks/useChatSocket';
import { cn } from '@/lib/format';
import RoomList from './RoomList';
import MessageArea from './MessageArea';
import CreateRoomModal from './CreateRoomModal';

export default function ChatPanel() {
  const { isOpen, view, activeRoomId, closeChat, backToList } = useChatStore();
  const leaveRoom = useLeaveRoom();
  const { joinRoom, leaveRoom: leaveSocketRoom } = useChatSocket();

  // Close on ESC
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeChat();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, closeChat]);

  if (!isOpen) return null;

  const handleLeaveRoom = async () => {
    if (!activeRoomId) return;
    await leaveRoom.mutateAsync(activeRoomId);
    backToList();
  };

  const content = (
    <div
      className={cn(
        'fixed z-50 flex flex-col bg-bg-primary border border-border shadow-2xl overflow-hidden',
        // Desktop: floating panel
        'max-lg:inset-0 max-lg:z-[60]',
        // Mobile: fullscreen
        'lg:bottom-4 lg:right-4 lg:w-[380px] lg:h-[560px] lg:rounded-2xl',
      )}
    >
      <div className="relative flex-1 flex flex-col overflow-hidden">
        {view === 'room-list' && <RoomList />}
        {view === 'room-view' && activeRoomId && (
          <MessageArea
            roomId={activeRoomId}
            joinRoom={joinRoom}
            leaveSocketRoom={leaveSocketRoom}
            onLeaveRoom={handleLeaveRoom}
          />
        )}
        {view === 'create-room' && <CreateRoomModal />}
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}
