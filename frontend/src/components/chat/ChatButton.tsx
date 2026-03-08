/**
 * @file 채팅 버튼 컴포넌트
 * @description 헤더에 위치하며 채팅 패널 토글 및 읽지 않은 메시지 배지를 표시
 *
 * @file Chat Button Component
 * @description Located in header; toggles chat panel and shows unread message badge
 */
'use client';

import { useRef, useCallback } from 'react';
import { MessageCircle } from 'lucide-react';
import { useChatStore } from '@/stores/chat';
import { useChatRooms } from '@/hooks/useChat';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettingsStore } from '@/stores/settings';
import { cn } from '@/lib/format';

export default function ChatButton() {
  const { t } = useTranslation();
  const toggleChat = useChatStore((s) => s.toggleChat);
  const setPosition = useChatStore((s) => s.setPosition);
  const isOpen = useChatStore((s) => s.isOpen);
  const isPinned = useChatStore((s) => s.isPinned);
  const { data: rooms } = useChatRooms();
  const chatBadgeEnabled = useSettingsStore((s) => s.notificationPrefs.chatBadge);
  const btnRef = useRef<HTMLButtonElement>(null);

  // 뱃지 설정이 꺼져있으면 0으로 표시 / Show 0 if badge preference is disabled
  const totalUnread = chatBadgeEnabled
    ? (rooms?.reduce((sum, r) => sum + r.unreadCount, 0) ?? 0)
    : 0;

  const handleClick = useCallback(() => {
    if (!isOpen && btnRef.current && !isPinned) {
      const rect = btnRef.current.getBoundingClientRect();
      // 버튼 아래에 위치, 오른쪽 정렬 (8px 여백) (Position below the button, flush right with 8px margin)
      setPosition({
        x: window.innerWidth - 380 - 8,
        y: rect.bottom + 8,
      });
    }
    toggleChat();
  }, [isOpen, isPinned, toggleChat, setPosition]);

  return (
    <button
      ref={btnRef}
      onClick={handleClick}
      className={cn(
        'relative p-2.5 rounded-lg transition-colors -translate-y-[1px] sm:translate-x-0 translate-x-[2px]',
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
