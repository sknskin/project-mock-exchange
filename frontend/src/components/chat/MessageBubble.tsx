'use client';

import { cn } from '@/lib/format';
import type { ChatMessage } from '@/types';

interface MessageBubbleProps {
  message: ChatMessage;
  isMine: boolean;
  showSender: boolean;
  locale: string;
}

function formatTime(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessageBubble({ message, isMine, showSender, locale }: MessageBubbleProps) {
  return (
    <div className={cn('flex mb-1.5', isMine ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[75%] flex flex-col', isMine ? 'items-end' : 'items-start')}>
        {showSender && !isMine && (
          <span className="text-[11px] text-text-tertiary mb-0.5 px-1">
            {message.senderUsername}
          </span>
        )}
        <div className={cn('flex items-end gap-1.5', isMine ? 'flex-row-reverse' : 'flex-row')}>
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
