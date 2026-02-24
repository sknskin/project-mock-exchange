'use client';

import { MessageCircle } from 'lucide-react';
import { useChatStore } from '@/stores/chat';
import { useChatRooms } from '@/hooks/useChat';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/format';

export default function ChatButton() {
  const { t } = useTranslation();
  const toggleChat = useChatStore((s) => s.toggleChat);
  const { data: rooms } = useChatRooms();

  const totalUnread = rooms?.reduce((sum, r) => sum + r.unreadCount, 0) ?? 0;

  return (
    <button
      onClick={toggleChat}
      className={cn(
        'relative p-2.5 rounded-lg transition-colors',
        'text-text-tertiary hover:text-text-primary hover:bg-bg-secondary',
      )}
      aria-label={t('chat.title')}
    >
      <MessageCircle className="w-[18px] h-[18px]" />
      {totalUnread > 0 && (
        <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
          {totalUnread > 99 ? '99+' : totalUnread}
        </span>
      )}
    </button>
  );
}
