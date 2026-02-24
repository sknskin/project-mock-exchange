'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { useChatStore } from '@/stores/chat';
import { useLeaveRoom } from '@/hooks/useChat';
import { useChatSocket } from '@/hooks/useChatSocket';
import { cn } from '@/lib/format';
import RoomList from './RoomList';
import MessageArea from './MessageArea';
import CreateRoomModal from './CreateRoomModal';

const PANEL_W = 380;
const PANEL_H = 560;

export default function ChatPanel() {
  const { isOpen, isPinned, view, activeRoomId, position, closeChat, backToList, setPosition } = useChatStore();
  const leaveRoom = useLeaveRoom();
  const { joinRoom, leaveRoom: leaveSocketRoom } = useChatSocket();

  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  // ESC 키로 닫기 (Close on ESC)
  useEffect(() => {
    if (!isOpen || isPinned) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeChat();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, isPinned, closeChat]);

  // 드래그 핸들러 (Drag handlers)
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (isPinned) return;
    const pos = position || { x: window.innerWidth - PANEL_W - 16, y: 76 };
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
    };
    setDragging(true);
    e.preventDefault();
  }, [isPinned, position]);

  useEffect(() => {
    if (!dragging) return;

    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const newX = Math.max(0, Math.min(window.innerWidth - PANEL_W, dragRef.current.origX + dx));
      const newY = Math.max(0, Math.min(window.innerHeight - 100, dragRef.current.origY + dy));
      setPosition({ x: newX, y: newY });
    };

    const onMouseUp = () => {
      dragRef.current = null;
      setDragging(false);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragging, setPosition]);

  if (!isOpen) return null;

  const handleLeaveRoom = async () => {
    if (!activeRoomId) return;
    await leaveRoom.mutateAsync(activeRoomId);
    backToList();
  };

  // 고정 모드: 레이아웃에서 렌더링, 여기서는 렌더링하지 않음 (Pinned mode: rendered by layout, not here)
  if (isPinned) return null;

  // 뷰포트 내로 위치 제한 (Clamp position within viewport)
  const pos = position || { x: window.innerWidth - PANEL_W - 16, y: 76 };
  const clampedX = Math.max(0, Math.min(pos.x, window.innerWidth - PANEL_W));
  const clampedY = Math.max(0, Math.min(pos.y, window.innerHeight - 100));

  const content = (
    <>
      {/* 모바일에서만 배경 오버레이 (Backdrop on mobile only) */}
      <div
        className="fixed inset-0 z-[59] bg-black/40 lg:hidden"
        onClick={closeChat}
      />
      <div
        ref={panelRef}
        style={{
          left: clampedX,
          top: clampedY,
          width: PANEL_W,
          height: PANEL_H,
        }}
        className={cn(
          'fixed z-[60] flex flex-col bg-bg-primary border border-border shadow-2xl overflow-hidden rounded-2xl',
          'max-lg:!inset-0 max-lg:!w-auto max-lg:!h-auto max-lg:rounded-none',
          dragging && 'select-none',
        )}
      >
        {/* 드래그 핸들 (Drag handle) */}
        <div
          onMouseDown={onMouseDown}
          className={cn(
            'hidden lg:flex items-center justify-center h-3 shrink-0 cursor-grab border-b border-border/50',
            dragging && 'cursor-grabbing',
          )}
        >
          <div className="w-8 h-1 rounded-full bg-border" />
        </div>

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
    </>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}
