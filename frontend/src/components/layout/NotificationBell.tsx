/**
 * @file 알림 벨 드롭다운 컴포넌트
 * @description 헤더용 알림 벨 아이콘 + 드롭다운 패널
 *
 * @file Notification Bell Dropdown Component
 * @description Notification bell icon with dropdown panel for header
 */
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
} from '@/hooks/useAdmin';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/format';
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
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { data: unreadCount = 0 } = useUnreadCount();
  const { data: notificationsData, refetch } = useNotifications({ page: 1, limit: DROPDOWN_LIMIT });
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const notifications: NotificationItem[] = notificationsData?.items ?? [];

  // Close on click outside
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
      {/* Bell button */}
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

      {/* Dropdown panel */}
      {open && (
        <div
          className={cn(
            'absolute right-0 top-full mt-2 w-[360px] max-h-[480px]',
            'bg-bg-primary border border-border rounded-xl shadow-2xl',
            'flex flex-col z-50 overflow-hidden',
          )}
        >
          {/* Header row */}
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

          {/* Notification list */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-[14px] text-text-tertiary">
                {t('notification.empty')}
              </div>
            ) : (
              <ul>
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        'w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors',
                        'hover:bg-bg-secondary border-b border-border last:border-b-0',
                        !notification.isRead && 'bg-bg-secondary/50',
                      )}
                    >
                      {/* Unread indicator dot */}
                      <span className="shrink-0 mt-1.5">
                        {!notification.isRead ? (
                          <span className="block w-2 h-2 rounded-full bg-blue-500" />
                        ) : (
                          <span className="block w-2 h-2 rounded-full bg-transparent" />
                        )}
                      </span>

                      {/* Content */}
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
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
