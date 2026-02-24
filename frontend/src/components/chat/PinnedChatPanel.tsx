'use client';

import { useChatStore } from '@/stores/chat';
import { useLeaveRoom } from '@/hooks/useChat';
import { useChatSocket } from '@/hooks/useChatSocket';
import RoomList from './RoomList';
import MessageArea from './MessageArea';
import CreateRoomModal from './CreateRoomModal';

export default function PinnedChatPanel() {
  const { isOpen, isPinned, view, activeRoomId, closeChat, backToList } = useChatStore();
  const leaveRoom = useLeaveRoom();
  const { joinRoom, leaveRoom: leaveSocketRoom } = useChatSocket();

  if (!isOpen || !isPinned) return null;

  const handleLeaveRoom = async () => {
    if (!activeRoomId) return;
    await leaveRoom.mutateAsync(activeRoomId);
    backToList();
  };

  return (
    <div className="hidden lg:flex flex-col w-[380px] shrink-0 h-[calc(100vh-60px)] sticky top-[60px] bg-[#141517] border-l border-[#2a2a2e]">
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
  );
}
