'use client';

import { useChatStore } from '@/stores/chat';
import { useLeaveRoom } from '@/hooks/useChat';
import { useChatSocket } from '@/hooks/useChatSocket';
import { cn } from '@/lib/format';
import RoomList from './RoomList';
import MessageArea from './MessageArea';
import CreateRoomModal from './CreateRoomModal';

export default function PinnedChatPanel() {
  const { isOpen, isPinned, view, activeRoomId, closeChat, backToList } = useChatStore();
  const leaveRoom = useLeaveRoom();
  const { joinRoom, leaveRoom: leaveSocketRoom, emitTyping } = useChatSocket();

  const visible = isOpen && isPinned;

  const handleLeaveRoom = async () => {
    if (!activeRoomId) return;
    await leaveRoom.mutateAsync(activeRoomId);
    backToList();
  };

  return (
    <div
      className={cn(
        'hidden lg:flex flex-col fixed top-[60px] right-0 h-[calc(100dvh-60px)] bg-[#141517] border-l border-[#2a2a2e] overscroll-contain',
        'transition-[transform,width] duration-300 ease-in-out',
        'w-[320px] xl:w-[380px]',
        visible ? 'translate-x-0' : 'translate-x-full',
      )}
    >
      {view === 'room-list' && <RoomList />}
      {view === 'room-view' && activeRoomId && (
        <MessageArea
          roomId={activeRoomId}
          joinRoom={joinRoom}
          leaveSocketRoom={leaveSocketRoom}
          onLeaveRoom={handleLeaveRoom}
          emitTyping={emitTyping}
        />
      )}
      {view === 'create-room' && <CreateRoomModal />}
    </div>
  );
}
