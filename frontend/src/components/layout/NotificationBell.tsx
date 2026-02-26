/**
 * @file 알림 벨 드롭다운 컴포넌트
 * @description 헤더용 알림 벨 아이콘 + 드롭다운 패널
 *
 * @file Notification Bell Dropdown Component
 * @description Notification bell icon with dropdown panel for header
 */
'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Bell, X } from 'lucide-react';
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
} from '@/hooks/useAdmin';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/format';
import { useChatStore } from '@/stores/chat';
import type { NotificationItem } from '@/types';

const DROPDOWN_LIMIT = 20;

function getRelativeTime(dateString: string, locale: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  const isKo = locale === 'ko';

  if (diffMinutes < 1) {
    return isKo ? '방금 전' : 'Just now';
  }
  if (diffMinutes < 60) {
    return isKo ? `${diffMinutes}분 전` : `${diffMinutes}m ago`;
  }
  if (diffHours < 24) {
    return isKo ? `${diffHours}시간 전` : `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return isKo ? `${diffDays}일 전` : `${diffDays}d ago`;
  }
  return date.toLocaleDateString();
}

export default function NotificationBell() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const [open, setOpen] = useState(false);
  const [modalNotification, setModalNotification] = useState<NotificationItem | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { data: unreadCount = 0 } = useUnreadCount();
  const { data: notificationsData, refetch } = useNotifications({ page: 1, limit: DROPDOWN_LIMIT });
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();

  const notifications: NotificationItem[] = notificationsData?.items ?? [];

  // 외부 클릭 시 닫기 (Close on click outside)
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  // ESC 키로 모달 닫기 (Close modal on ESC)
  useEffect(() => {
    if (!modalNotification) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalNotification(null);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [modalNotification]);

  function handleBellClick() {
    setOpen((prev) => {
      if (!prev) refetch();
      return !prev;
    });
  }

  function handleNotificationClick(notification: NotificationItem) {
    if (!notification.isRead) {
      markAsRead.mutate(notification.id);
    }

    // 승인/반려 알림은 모달로 표시
    if (notification.type === 'REGISTRATION_APPROVED' || notification.type === 'REGISTRATION_REJECTED') {
      setModalNotification(notification);
      return;
    }

    // 채팅 알림: 채팅 패널 열기
    if (notification.type === 'CHAT_MESSAGE' && notification.link?.startsWith('chat:')) {
      const roomId = notification.link.replace('chat:', '');
      setOpen(false);
      useChatStore.getState().openChat();
      useChatStore.getState().openRoom(roomId);
      return;
    }

    setOpen(false);
    if (notification.link) {
      router.push(notification.link);
    }
  }

  function handleMarkAllRead() {
    markAllAsRead.mutate();
  }

  return (
    <div ref={wrapperRef} className="relative">
      {/* 알림 벨 버튼 (Bell button) */}
      <button
        onClick={handleBellClick}
        className={cn(
          'relative p-2.5 rounded-lg transition-colors',
          'text-text-tertiary hover:text-text-primary hover:bg-bg-secondary',
        )}
        aria-label={t('notification.title')}
      >
        <Bell className="w-[18px] h-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* 드롭다운 패널 (Dropdown panel) */}
      {open && (
        <div
          className={cn(
            'fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto top-14 sm:top-full sm:mt-2 sm:w-[360px] max-h-[480px]',
            'bg-bg-primary border border-border rounded-xl shadow-2xl',
            'flex flex-col z-50 overflow-hidden animate-dropdown-in sm:origin-top-right',
          )}
        >
          {/* 헤더 행 (Header row) */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <span className="text-[15px] font-bold text-text-primary">
              {t('notification.title')}
            </span>
            <button
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0 || markAllAsRead.isPending}
              className={cn(
                'text-[12px] font-medium transition-colors',
                unreadCount === 0
                  ? 'text-text-quaternary cursor-default'
                  : 'text-accent hover:text-accent/80 cursor-pointer',
              )}
            >
              {t('notification.markAllRead')}
            </button>
          </div>

          {/* 알림 목록 (Notification list) */}
          <div className="overflow-y-auto flex-1 overscroll-contain" onWheel={(e) => e.stopPropagation()}>
            {notifications.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-[14px] text-text-tertiary">
                {t('notification.empty')}
              </div>
            ) : (
              <ul>
                {notifications.map((notification) => (
                  <li key={notification.id} className="relative group">
                    <button
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        'w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors',
                        'hover:bg-bg-secondary border-b border-border last:border-b-0',
                        !notification.isRead && 'bg-bg-secondary/50',
                      )}
                    >
                      {/* 읽지 않음 표시 점 (Unread indicator dot) */}
                      <span className="shrink-0 mt-1.5">
                        {!notification.isRead ? (
                          <span className="block w-2 h-2 rounded-full bg-blue-500" />
                        ) : (
                          <span className="block w-2 h-2 rounded-full bg-transparent" />
                        )}
                      </span>

                      {/* 내용 (Content) */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            'text-[13px] leading-snug truncate',
                            notification.isRead
                              ? 'font-normal text-text-secondary'
                              : 'font-bold text-text-primary',
                          )}
                        >
                          {notification.title}
                        </p>
                        <p className="text-[12px] text-text-tertiary mt-0.5 line-clamp-2 leading-relaxed">
                          {notification.message}
                        </p>
                        <p className="text-[11px] text-text-quaternary mt-1">
                          {getRelativeTime(notification.createdAt, locale)}
                        </p>
                      </div>
                    </button>
                    {/* 삭제 버튼 (Delete button) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification.mutate(notification.id);
                      }}
                      className="absolute top-2 right-2 p-0.5 text-text-quaternary hover:text-fall transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      {/* 승인/반려 알림 모달 — 헤더 stacking context에서 벗어나도록 portal 사용 */}
      {modalNotification && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setModalNotification(null)} />
          <div className="relative bg-bg-primary border border-border rounded-2xl p-6 w-[340px] max-w-[calc(100vw-2rem)] shadow-2xl">
            <h3 className={cn(
              'text-[16px] font-bold text-center',
              modalNotification.type === 'REGISTRATION_APPROVED' ? 'text-accent' : 'text-danger',
            )}>
              {modalNotification.title}
            </h3>
            <div className="mt-4 space-y-2">
              {(() => {
                const msg = modalNotification.message;
                // 200자 이하 짧은 메시지는 문장 단위 줄바꿈 / Split short messages by sentence
                const text = msg.length <= 200
                  ? msg.replace(/(?<=[.!?다요죠음습])\s+/g, '\n')
                  : msg;
                return text.split('\n').filter(Boolean);
              })().map((line, i) => (
                <p key={i} className={cn(
                  'text-[14px] text-center',
                  i === 0 ? 'text-text-primary font-medium' : 'text-text-secondary',
                )}>
                  {line}
                </p>
              ))}
            </div>
            <button
              onClick={() => setModalNotification(null)}
              className="w-full h-11 mt-6 rounded-xl bg-accent text-white text-[14px] font-semibold hover:bg-accent/85 transition-colors"
            >
              {t('common.confirm')}
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
