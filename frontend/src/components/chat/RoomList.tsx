'use client';

import { X, Plus, PanelRightOpen } from 'lucide-react';
import { useChatStore } from '@/stores/chat';
import { useChatRooms } from '@/hooks/useChat';
import { useAuthStore } from '@/stores/auth';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/format';

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

export default function RoomList() {
  const { t, locale } = useTranslation();
  const { closeChat, openRoom, setView, togglePin, isPinned } = useChatStore();
  const user = useAuthStore((s) => s.user);
  const { data: rooms, isLoading } = useChatRooms();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <h2 className="text-[15px] font-bold text-text-primary">{t('chat.title')}</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setView('create-room')}
            className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors"
            aria-label={t('chat.newChat')}
          >
            <Plus className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={togglePin}
            className={cn(
              'hidden lg:block p-2 rounded-lg transition-colors',
              isPinned
                ? 'text-accent bg-accent/10 hover:bg-accent/20'
                : 'text-text-tertiary hover:text-text-primary hover:bg-bg-secondary',
            )}
            aria-label="Pin chat"
          >
            <PanelRightOpen className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={closeChat}
            className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors"
          >
            <X className="w-4.5 h-4.5" />
          </button>
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
                  ? room.participants.find((p) => p.userId !== user?.id)?.username ?? '?'
                  : room.name || room.participants.filter((p) => p.userId !== user?.id).map((p) => p.username).join(', ') || '?';

              const preview = room.lastMessage
                ? room.lastMessage.senderId === user?.id
                  ? `${t('chat.you')}: ${room.lastMessage.content}`
                  : room.type === 'GROUP'
                    ? `${room.lastMessage.senderUsername}: ${room.lastMessage.content}`
                    : room.lastMessage.content
                : '';

              const time = room.lastMessage
                ? formatRelativeTime(room.lastMessage.createdAt, locale)
                : formatRelativeTime(room.createdAt, locale);

              return (
                <li key={room.id}>
                  <button
                    onClick={() => openRoom(room.id)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-bg-secondary transition-colors border-b border-border last:border-b-0"
                  >
                    {/* Avatar */}
                    <div className="shrink-0 w-10 h-10 rounded-full bg-bg-tertiary flex items-center justify-center text-[14px] font-bold text-text-tertiary">
                      {displayName.charAt(0).toUpperCase()}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-bold text-text-primary truncate">
                          {displayName}
                          {room.type === 'GROUP' && (
                            <span className="text-text-quaternary font-normal ml-1">
                              {room.participants.length}
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-text-quaternary shrink-0">{time}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className="text-[12px] text-text-tertiary truncate">{preview || '\u00A0'}</p>
                        {room.unreadCount > 0 && (
                          <span className="shrink-0 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
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
    </div>
  );
}
