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
import { useScrollLock } from '@/hooks/useScrollLock';
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
import { useSettingsStore, type NotificationPrefs } from '@/stores/settings';
import type { NotificationItem } from '@/types';
import type { TranslationKey } from '@/lib/i18n';

const DROPDOWN_LIMIT = 50;

/** 알림 타입 → 설정 키 매핑 (Notification type → settings key mapping) */
function shouldShowNotification(type: string, prefs: NotificationPrefs): boolean {
  switch (type) {
    case 'ANNOUNCEMENT_NEW':
    case 'ANNOUNCEMENT_UPDATED':
      return prefs.announcement;
    case 'TRADE':
      return prefs.trade;
    case 'PRICE_ALERT':
      return prefs.priceAlert;
    case 'CHAT_MESSAGE':
      return prefs.chat;
    case 'REGISTRATION_APPROVED':
    case 'REGISTRATION_REJECTED':
      return prefs.registration;
    default:
      return true;
  }
}

/** 날짜를 상대 시간 문자열로 변환 (예: "5분 전")
 * Convert date to relative time string (e.g., "5m ago") */
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

/** 알림 타입별 번역된 제목 반환 (Translated title by notification type) */
const NOTIFICATION_TYPE_KEYS: Record<string, TranslationKey> = {
  TRADE: 'notification.type.TRADE',
  PRICE_ALERT: 'notification.type.PRICE_ALERT',
  ANNOUNCEMENT_NEW: 'notification.type.ANNOUNCEMENT_NEW',
  ANNOUNCEMENT_UPDATED: 'notification.type.ANNOUNCEMENT_UPDATED',
  CHAT_MESSAGE: 'notification.type.CHAT_MESSAGE',
  REGISTRATION_APPROVED: 'notification.type.REGISTRATION_APPROVED',
  REGISTRATION_REJECTED: 'notification.type.REGISTRATION_REJECTED',
};

/** 알림 메시지 번역 — 백엔드 영문 메시지를 한국어로 변환
 * Translate notification message — converts backend English to Korean */
function translateMessage(message: string, locale: string): string {
  if (locale !== 'ko') return message;
  // 매수/매도 체결 패턴 (Buy/Sell order filled pattern)
  const tradeMatch = message.match(/^(Buy|Sell)\s+order\s+(?:for\s+)?(\S+)\s+(?:has been\s+)?(?:filled|executed)/i);
  if (tradeMatch) {
    const side = tradeMatch[1].toLowerCase() === 'buy' ? '매수' : '매도';
    const symbol = tradeMatch[2];
    return `${symbol} ${side} 주문이 체결되었습니다`;
  }
  // 가격 알림 패턴 (Price alert pattern)
  const priceMatch = message.match(/^(\S+)\s+price\s+(?:reached|hit|crossed)\s+(above|below)/i);
  if (priceMatch) {
    const symbol = priceMatch[1];
    const direction = priceMatch[2].toLowerCase() === 'above' ? '이상' : '이하';
    return `${symbol} 가격이 목표가 ${direction}에 도달했습니다`;
  }
  // 가입 승인/반려 (Registration approved/rejected)
  if (/registration.*approved/i.test(message)) return '회원가입이 승인되었습니다. 이제 모든 기능을 이용하실 수 있습니다.';
  if (/registration.*rejected/i.test(message)) return '회원가입이 반려되었습니다. 관리자에게 문의해 주세요.';
  return message;
}

export default function NotificationBell() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const [open, setOpen] = useState(false);
  const [modalNotification, setModalNotification] = useState<NotificationItem | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { data: rawUnreadCount = 0 } = useUnreadCount();
  const { data: notificationsData, refetch } = useNotifications({ page: 1, limit: DROPDOWN_LIMIT });
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();
  const notificationPrefs = useSettingsStore((s) => s.notificationPrefs);

  // 알림 설정에 따라 비활성화된 타입 필터링 (Filter out disabled notification types based on prefs)
  const allNotifications: NotificationItem[] = notificationsData?.items ?? [];
  const notifications = allNotifications.filter((n) => shouldShowNotification(n.type, notificationPrefs));
  // 필터링된 읽지 않은 알림 수 계산 — 비활성화된 타입의 읽지 않은 알림 제외
  // Calculate filtered unread count — exclude unread notifications of disabled types
  const disabledUnreadCount = allNotifications.filter(
    (n) => !n.isRead && !shouldShowNotification(n.type, notificationPrefs),
  ).length;
  const unreadCount = Math.max(0, rawUnreadCount - disabledUnreadCount);

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

  useScrollLock(!!modalNotification);

  // ESC 키로 모달 닫기 (Close modal on ESC)
  useEffect(() => {
    if (!modalNotification) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalNotification(null);
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); };
  }, [modalNotification]);

  /** 벨 클릭 시 드롭다운 토글 + 데이터 새로고침
   * Toggle dropdown and refresh data on bell click */
  function handleBellClick() {
    setOpen((prev) => {
      if (!prev) refetch();
      return !prev;
    });
  }

  /** 알림 항목 클릭 시 읽음 처리 + 타입별 액션 수행
   * Mark as read and perform type-specific action on notification click */
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

  /** 모든 알림 읽음 처리
   * Mark all notifications as read */
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
                          {NOTIFICATION_TYPE_KEYS[notification.type]
                            ? t(NOTIFICATION_TYPE_KEYS[notification.type])
                            : notification.title}
                        </p>
                        <p className="text-[12px] text-text-tertiary mt-0.5 line-clamp-2 leading-relaxed">
                          {translateMessage(notification.message, locale)}
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
          <div className="absolute inset-0 bg-black/60 animate-modal-backdrop" onClick={() => setModalNotification(null)} />
          <div className="relative bg-bg-primary border border-border rounded-2xl p-6 w-[340px] max-w-[calc(100vw-2rem)] shadow-2xl animate-modal-content">
            <h3 className={cn(
              'text-[16px] font-bold text-center',
              modalNotification.type === 'REGISTRATION_APPROVED' ? 'text-accent' : 'text-danger',
            )}>
              {NOTIFICATION_TYPE_KEYS[modalNotification.type]
                ? t(NOTIFICATION_TYPE_KEYS[modalNotification.type])
                : modalNotification.title}
            </h3>
            <div className="mt-4 space-y-2">
              {(() => {
                const msg = translateMessage(modalNotification.message, locale);
                // 200자 이하 짧은 메시지는 문장 단위 줄바꿈 / Split short messages by sentence
                // 정규식: 한국어 문장 끝(다. 요. 등) 또는 !/?  뒤의 공백에서만 줄바꿈
                // 날짜 마침표(2026. 3. 6.)에서는 줄바꿈하지 않음 (숫자 뒤 마침표는 매칭하지 않음)
                // Regex: only splits on whitespace after Korean sentence endings (다. 요. etc.) or !/?
                // Does NOT split on date periods (2026. 3. 6.) — digits before periods are not matched
                const text = msg.length <= 200
                  ? msg.replace(/(?<=[!?]|[다요죠음습]\.)\s+/g, '\n')
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
