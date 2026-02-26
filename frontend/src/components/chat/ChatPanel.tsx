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

const MIN_W = 320;
const MIN_H = 400;

type DragMode = 'move' | 'resize-se' | 'resize-sw' | 'resize-ne' | 'resize-nw' | 'resize-e' | 'resize-w' | 'resize-s' | 'resize-n';

export default function ChatPanel() {
  const { isOpen, isPinned, view, activeRoomId, position, size, closeChat, backToList, setPosition, setSize } = useChatStore();
  const leaveRoom = useLeaveRoom();
  const { joinRoom, leaveRoom: leaveSocketRoom } = useChatSocket();

  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    mode: DragMode;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  } | null>(null);
  const [interacting, setInteracting] = useState(false);

  // ESC 키로 닫기 (Close on ESC)
  useEffect(() => {
    if (!isOpen || isPinned) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeChat();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, isPinned, closeChat]);

  // 드래그/리사이즈 시작 (Start drag/resize)
  const onPointerDown = useCallback((mode: DragMode, e: React.MouseEvent) => {
    if (isPinned) return;
    const pos = position || { x: window.innerWidth - size.width - 16, y: 76 };
    dragRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
      origW: size.width,
      origH: size.height,
    };
    setInteracting(true);
    e.preventDefault();
  }, [isPinned, position, size]);

  useEffect(() => {
    if (!interacting) return;

    const onMouseMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;

      if (d.mode === 'move') {
        const newX = Math.max(0, Math.min(window.innerWidth - size.width, d.origX + dx));
        const newY = Math.max(0, Math.min(window.innerHeight - 100, d.origY + dy));
        setPosition({ x: newX, y: newY });
      } else {
        let newW = d.origW;
        let newH = d.origH;
        let newX = d.origX;
        let newY = d.origY;

        if (d.mode.includes('e')) newW = Math.max(MIN_W, d.origW + dx);
        if (d.mode.includes('w')) {
          const dw = Math.min(dx, d.origW - MIN_W);
          newW = d.origW - dw;
          newX = d.origX + dw;
        }
        if (d.mode.includes('s')) newH = Math.max(MIN_H, d.origH + dy);
        if (d.mode.includes('n')) {
          const dh = Math.min(dy, d.origH - MIN_H);
          newH = d.origH - dh;
          newY = d.origY + dh;
        }

        // 뷰포트 클램프 (Viewport clamp)
        newX = Math.max(0, newX);
        newY = Math.max(0, newY);

        setSize({ width: newW, height: newH });
        setPosition({ x: newX, y: newY });
      }
    };

    const onMouseUp = () => {
      dragRef.current = null;
      setInteracting(false);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [interacting, size, setPosition, setSize]);

  if (!isOpen) return null;

  const handleLeaveRoom = async () => {
    if (!activeRoomId) return;
    await leaveRoom.mutateAsync(activeRoomId);
    backToList();
  };

  // 고정 모드: 레이아웃에서 렌더링, 여기서는 렌더링하지 않음 (Pinned mode: rendered by layout, not here)
  if (isPinned) return null;

  // 뷰포트 내로 위치 제한 (Clamp position within viewport)
  const pos = position || { x: window.innerWidth - size.width - 16, y: 76 };
  const clampedX = Math.max(0, Math.min(pos.x, window.innerWidth - size.width));
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
          width: size.width,
          height: size.height,
        }}
        className={cn(
          'fixed z-[60] flex flex-col bg-bg-primary border border-border shadow-2xl overflow-hidden rounded-2xl overscroll-contain',
          'max-lg:!inset-0 max-lg:!w-auto max-lg:!h-auto max-lg:rounded-none max-lg:!top-[60px] max-lg:!bottom-[52px]',
          'animate-chat-panel-in',
          interacting && 'select-none',
        )}
      >
        {/* 드래그 핸들 (Drag handle) */}
        <div
          onMouseDown={(e) => onPointerDown('move', e)}
          className={cn(
            'hidden lg:flex items-center justify-center h-3 shrink-0 cursor-grab border-b border-border/50',
            interacting && dragRef.current?.mode === 'move' && 'cursor-grabbing',
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

        {/* 리사이즈 핸들 — 데스크톱만 (Resize handles — desktop only) */}
        {/* 모서리 (Corners) */}
        <div onMouseDown={(e) => onPointerDown('resize-se', e)} className="hidden lg:block absolute bottom-0 right-0 w-3 h-3 cursor-se-resize z-10" />
        <div onMouseDown={(e) => onPointerDown('resize-sw', e)} className="hidden lg:block absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize z-10" />
        <div onMouseDown={(e) => onPointerDown('resize-ne', e)} className="hidden lg:block absolute top-0 right-0 w-3 h-3 cursor-ne-resize z-10" />
        <div onMouseDown={(e) => onPointerDown('resize-nw', e)} className="hidden lg:block absolute top-0 left-0 w-3 h-3 cursor-nw-resize z-10" />
        {/* 변 (Edges) */}
        <div onMouseDown={(e) => onPointerDown('resize-e', e)} className="hidden lg:block absolute top-3 bottom-3 right-0 w-1.5 cursor-e-resize z-10" />
        <div onMouseDown={(e) => onPointerDown('resize-w', e)} className="hidden lg:block absolute top-3 bottom-3 left-0 w-1.5 cursor-w-resize z-10" />
        <div onMouseDown={(e) => onPointerDown('resize-s', e)} className="hidden lg:block absolute bottom-0 left-3 right-3 h-1.5 cursor-s-resize z-10" />
        <div onMouseDown={(e) => onPointerDown('resize-n', e)} className="hidden lg:block absolute top-0 left-3 right-3 h-1.5 cursor-n-resize z-10" />
      </div>
    </>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}
