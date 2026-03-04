/**
 * @file 고정 채팅 패널 컴포넌트
 * @description 데스크톱(lg+)에서 우측 사이드바로 고정되는 채팅 패널 — translate 애니메이션으로 열고 닫음
 *
 * @file Pinned Chat Panel Component
 * @description Chat panel pinned to right sidebar on desktop (lg+) — slides in/out via translate animation
 */
'use client';

import { useChatStore } from '@/stores/chat';
import { useLeaveRoom } from '@/hooks/useChat';
import { useChatSocket } from '@/hooks/useChatSocket';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/format';
import RoomList from './RoomList';
import MessageArea from './MessageArea';
import CreateRoomModal from './CreateRoomModal';

export default function PinnedChatPanel() {
  const { isOpen, isPinned, view, activeRoomId, closeChat, backToList } = useChatStore();
  const leaveRoom = useLeaveRoom();
  const { joinRoom, leaveRoom: leaveSocketRoom, emitTyping } = useChatSocket();
  const { t } = useTranslation();

  const visible = isOpen && isPinned;

  const handleLeaveRoom = async () => {
    if (!activeRoomId) return;
    if (!window.confirm(t('chat.confirmLeaveRoom'))) return;
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
