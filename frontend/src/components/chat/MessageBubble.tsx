'use client';

import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/format';
import { useDeleteMessage } from '@/hooks/useChat';
import { useTranslation } from '@/hooks/useTranslation';
import type { ChatMessage } from '@/types';

interface MessageBubbleProps {
  message: ChatMessage;
  isMine: boolean;
  showSender: boolean;
  locale: string;
  isAdmin?: boolean;
}

function formatTime(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessageBubble({ message, isMine, showSender, locale, isAdmin }: MessageBubbleProps) {
  const { t } = useTranslation();
  const deleteMessage = useDeleteMessage();
  const canDelete = isMine || isAdmin;

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteMessage.mutateAsync({ roomId: message.roomId, messageId: message.id });
  };

  return (
    <div className={cn('group flex mb-1.5', isMine ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[75%] flex flex-col', isMine ? 'items-end' : 'items-start')}>
        {showSender && !isMine && (
          <span className="text-[11px] text-text-tertiary mb-0.5 px-1">
            {message.senderName || message.senderUsername}
          </span>
        )}
        <div className={cn('flex items-end gap-1.5', isMine ? 'flex-row-reverse' : 'flex-row')}>
          <div className="relative">
            <div
              className={cn(
                'px-3 py-2 rounded-2xl text-[13px] leading-relaxed break-words whitespace-pre-wrap',
                isMine
                  ? 'bg-accent text-white rounded-br-md'
                  : 'bg-bg-secondary text-text-primary rounded-bl-md',
              )}
            >
              {message.content}
            </div>
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={deleteMessage.isPending}
                title={t('chat.deleteMessage')}
                className={cn(
                  'absolute -top-1.5 opacity-0 group-hover:opacity-100 transition-opacity',
                  'w-5 h-5 flex items-center justify-center rounded-full bg-bg-elevated border border-border shadow-sm',
                  'text-text-tertiary hover:text-red-400 hover:border-red-400/50',
                  isMine ? '-left-1.5' : '-right-1.5',
                )}
              >
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
          <div className="flex flex-col items-center gap-0.5 shrink-0">
            {isMine && message.unreadCount > 0 && (
              <span className="text-[10px] text-accent font-bold">
                {message.unreadCount}
              </span>
            )}
            <span className="text-[10px] text-text-quaternary">
              {formatTime(message.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
