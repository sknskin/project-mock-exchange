'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Plus, PanelRightOpen, Check } from 'lucide-react';
import { useChatStore } from '@/stores/chat';
import { useChatRooms, useLeaveRoom, useRenameRoom } from '@/hooks/useChat';
import { useAuthStore } from '@/stores/auth';
import { usePresenceStore } from '@/stores/presence';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/format';
import Tooltip from '@/components/ui/Tooltip';
import type { ChatRoom } from '@/types';

function formatRelativeTime(dateString: string, locale: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  const isKo = locale === 'ko';
  if (diffMin < 1) return isKo ? '방금' : 'Now';
  if (diffMin < 60) return isKo ? `${diffMin}분` : `${diffMin}m`;
  if (diffHrs < 24) return isKo ? `${diffHrs}시간` : `${diffHrs}h`;
  if (diffDays < 7) return isKo ? `${diffDays}일` : `${diffDays}d`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

interface ContextMenu {
  x: number;
  y: number;
  roomId: string;
  roomType: 'DM' | 'GROUP';
}

export default function RoomList() {
  const { t, locale } = useTranslation();
  const { closeChat, openRoom, setView, togglePin, isPinned, backToList } = useChatStore();
  const user = useAuthStore((s) => s.user);
  const { data: rooms, isLoading } = useChatRooms();
  const onlineUserIds = usePresenceStore((s) => s.onlineUserIds);
  const leaveRoom = useLeaveRoom();
  const renameRoom = useRenameRoom();

  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [renamingRoomId, setRenamingRoomId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // 컨텍스트 메뉴 외부 클릭 시 닫기 (Close context menu on outside click)
  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [contextMenu]);

  // 이름 수정 입력 포커스 (Focus rename input)
  useEffect(() => {
    if (renamingRoomId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingRoomId]);

  const handleContextMenu = useCallback((e: React.MouseEvent, room: ChatRoom) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, roomId: room.id, roomType: room.type });
  }, []);

  const handleRename = useCallback((roomId: string, currentName: string) => {
    setContextMenu(null);
    setRenamingRoomId(roomId);
    setRenameValue(currentName);
  }, []);

  const handleRenameSubmit = useCallback(async (roomId: string) => {
    const trimmed = renameValue.trim();
    if (trimmed) {
      await renameRoom.mutateAsync({ roomId, name: trimmed });
    }
    setRenamingRoomId(null);
    setRenameValue('');
  }, [renameValue, renameRoom]);

  const handleLeave = useCallback(async (roomId: string) => {
    setContextMenu(null);
    if (!confirm(t('chat.leaveConfirm'))) return;
    await leaveRoom.mutateAsync(roomId);
    backToList();
  }, [leaveRoom, backToList, t]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <h2 className="text-[15px] font-bold text-text-primary">{t('chat.title')}</h2>
        <div className="flex items-center gap-1">
          <Tooltip label={t('chat.tooltip.newChat')}>
            <button
              onClick={() => setView('create-room')}
              className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors"
              aria-label={t('chat.newChat')}
            >
              <Plus className="w-4.5 h-4.5" />
            </button>
          </Tooltip>
          <Tooltip label={isPinned ? t('chat.tooltip.unpin') : t('chat.tooltip.pin')}>
            <button
              onClick={togglePin}
              className={cn(
                'hidden lg:block p-2 rounded-lg transition-colors',
                isPinned
                  ? 'text-accent bg-accent/10 hover:bg-accent/20'
                  : 'text-text-tertiary hover:text-text-primary hover:bg-bg-secondary',
              )}
              aria-label={isPinned ? t('chat.tooltip.unpin') : t('chat.tooltip.pin')}
            >
              <PanelRightOpen className="w-4.5 h-4.5" />
            </button>
          </Tooltip>
          <Tooltip label={t('chat.tooltip.close')}>
            <button
              onClick={closeChat}
              className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Room list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-[13px] text-text-quaternary">{t('common.loading')}</span>
          </div>
        ) : !rooms || rooms.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-[13px] text-text-tertiary">{t('chat.noRooms')}</span>
          </div>
        ) : (
          <ul>
            {rooms.map((room) => {
              const displayName =
                room.type === 'DM'
                  ? (room.participants.find((p) => p.userId !== user?.id)?.name || room.participants.find((p) => p.userId !== user?.id)?.username) ?? '?'
                  : room.name || room.participants.filter((p) => p.userId !== user?.id).map((p) => p.name || p.username).join(', ') || '?';

              const preview = room.lastMessage
                ? room.lastMessage.senderId === user?.id
                  ? `${t('chat.you')}: ${room.lastMessage.content}`
                  : room.type === 'GROUP'
                    ? `${room.lastMessage.senderName || room.lastMessage.senderUsername}: ${room.lastMessage.content}`
                    : room.lastMessage.content
                : '';

              const time = room.lastMessage
                ? formatRelativeTime(room.lastMessage.createdAt, locale)
                : formatRelativeTime(room.createdAt, locale);

              const otherParticipant = room.participants.find((p) => p.userId !== user?.id);
              const isOtherOnline = room.type === 'DM' && otherParticipant
                ? onlineUserIds.has(otherParticipant.userId)
                : room.type === 'GROUP'
                  ? room.participants.some((p) => p.userId !== user?.id && onlineUserIds.has(p.userId))
                  : false;

              return (
                <li key={room.id}>
                  <button
                    onClick={() => openRoom(room.id)}
                    onContextMenu={(e) => handleContextMenu(e, room)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-bg-secondary transition-colors border-b border-border last:border-b-0"
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-bg-tertiary flex items-center justify-center text-[14px] font-bold text-text-tertiary">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      {isOtherOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-bg-primary" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between gap-2">
                        {renamingRoomId === room.id ? (
                          <div className="flex items-center gap-1 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                            <input
                              ref={renameInputRef}
                              type="text"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameSubmit(room.id);
                                if (e.key === 'Escape') { setRenamingRoomId(null); setRenameValue(''); }
                              }}
                              onBlur={() => handleRenameSubmit(room.id)}
                              placeholder={t('chat.renamePlaceholder')}
                              className="text-[13px] font-bold text-text-primary bg-bg-tertiary border border-border rounded px-1.5 py-0.5 w-full min-w-0 outline-none focus:border-accent"
                            />
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRenameSubmit(room.id); }}
                              className="shrink-0 p-0.5 rounded text-accent hover:bg-accent/10"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[13px] font-bold text-text-primary truncate">
                            {displayName}
                            {room.type === 'GROUP' && (
                              <span className="text-text-quaternary font-normal ml-1">
                                {room.participants.length}
                              </span>
                            )}
                          </span>
                        )}
                        <span className="text-[10px] text-text-quaternary shrink-0">{time}</span>
                      </div>
                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        <p className="text-[12px] text-text-tertiary truncate">{preview || '\u00A0'}</p>
                        {room.unreadCount > 0 && (
                          <span className="shrink-0 min-w-[16px] h-[16px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
                            {room.unreadCount > 99 ? '99+' : room.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-[9999] min-w-[140px] bg-bg-elevated border border-border rounded-lg shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.roomType === 'GROUP' && (
            <button
              onClick={() => {
                const room = rooms?.find((r) => r.id === contextMenu.roomId);
                handleRename(contextMenu.roomId, room?.name || '');
              }}
              className="w-full text-left px-3 py-2 text-[13px] text-text-primary hover:bg-bg-secondary transition-colors"
            >
              {t('chat.rename')}
            </button>
          )}
          <button
            onClick={() => handleLeave(contextMenu.roomId)}
            className="w-full text-left px-3 py-2 text-[13px] text-red-400 hover:bg-bg-secondary transition-colors"
          >
            {t('chat.leaveRoom')}
          </button>
        </div>
      )}
    </div>
  );
}
