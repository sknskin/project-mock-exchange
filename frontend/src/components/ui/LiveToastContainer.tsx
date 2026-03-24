/**
 * @file 실시간 토스트 알림 컨테이너
 * @description WebSocket 이벤트(채팅, 거래, 가격알림, 공지 등)에 대응하는 실시간 토스트 UI
 *
 * @file Live Toast Container
 * @description Real-time toast UI for WebSocket events (chat, trade, price alert, announcements, etc.)
 */
'use client';

import { useRouter } from 'next/navigation';
import {
  MessageSquare,
  UserPlus,
  UserMinus,
  TrendingUp,
  Bell,
  Megaphone,
  FileEdit,
  CheckCircle,
  XCircle,
  UserCog,
  X,
} from 'lucide-react';
import { useLiveToastStore, type LiveToastCategory } from '@/stores/liveToast';
import { useChatStore } from '@/stores/chat';
import { useSettingsStore } from '@/stores/settings';
import { t } from '@/lib/i18n';

// 카테고리별 아이콘 매핑 / Icon mapping per toast category
const ICON_MAP: Record<LiveToastCategory, typeof MessageSquare> = {
  'chat-message': MessageSquare,
  'chat-invited': UserPlus,
  'chat-kicked': UserMinus,
  trade: TrendingUp,
  'price-alert': Bell,
  'announcement-new': Megaphone,
  'announcement-updated': FileEdit,
  'registration-approved': CheckCircle,
  'registration-rejected': XCircle,
  'registration-request': UserCog,
};

// 카테고리별 색상 클래스 매핑 — 통일 규칙:
// 채팅=회색, 주문/거래=초록, 오류/거부=빨강, 등록/성공/공지=파랑
// Color class mapping — unified rules:
// Chat=gray, Trade/Order=green, Error/Reject=red, Registration/Success/Announcement=blue
const COLOR_MAP: Record<LiveToastCategory, string> = {
  'chat-message': 'border-gray-500/40 bg-gray-500/10 text-gray-400',
  'chat-invited': 'border-gray-500/40 bg-gray-500/10 text-gray-400',
  'chat-kicked': 'border-red-500/40 bg-red-500/10 text-red-400',
  trade: 'border-green-500/40 bg-green-500/10 text-green-400',
  'price-alert': 'border-blue-500/40 bg-blue-500/10 text-blue-400',
  'announcement-new': 'border-blue-500/40 bg-blue-500/10 text-blue-400',
  'announcement-updated': 'border-blue-500/40 bg-blue-500/10 text-blue-400',
  'registration-approved': 'border-blue-500/40 bg-blue-500/10 text-blue-400',
  'registration-rejected': 'border-red-500/40 bg-red-500/10 text-red-400',
  'registration-request': 'border-blue-500/40 bg-blue-500/10 text-blue-400',
};

export default function LiveToastContainer() {
  const toasts = useLiveToastStore((s) => s.toasts);
  const removeToast = useLiveToastStore((s) => s.removeToast);
  const router = useRouter();
  const { openChat, openRoom } = useChatStore();
  const locale = useSettingsStore((s) => s.locale);

  if (toasts.length === 0) return null;

  // 토스트 클릭 시 채팅방 열기 또는 해당 페이지로 이동 / On click, open chat room or navigate to target page
  const handleClick = (toast: (typeof toasts)[0]) => {
    if (toast.chatRoomId) {
      openChat();
      openRoom(toast.chatRoomId);
    } else if (toast.navigateTo) {
      router.push(toast.navigateTo);
    }
    removeToast(toast.id);
  };

  return (
    // 스크린 리더 실시간 알림 영역 / Screen reader live region for real-time notifications
    <div
      className="fixed bottom-20 sm:bottom-4 right-0 sm:right-4 z-[110] flex flex-col gap-2 w-full sm:w-auto sm:max-w-sm px-3 sm:px-0 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const Icon = ICON_MAP[toast.category];
        const colorClass = COLOR_MAP[toast.category];
        const isClickable = !!(toast.chatRoomId || toast.navigateTo);

        return (
          <div
            key={toast.id}
            className={`animate-live-toast-in pointer-events-auto flex items-start gap-3 border rounded-xl shadow-lg px-4 py-3 backdrop-blur-sm ${colorClass} ${isClickable ? 'cursor-pointer hover:brightness-110' : ''}`}
            onClick={isClickable ? () => handleClick(toast) : undefined}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
            onKeyDown={isClickable ? (e) => { if (e.key === 'Enter') handleClick(toast); } : undefined}
          >
            <Icon className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{toast.title}</p>
              <p className="text-xs opacity-80 truncate">{toast.message}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); removeToast(toast.id); }}
              className="shrink-0 opacity-60 hover:opacity-100 transition-opacity mt-0.5"
              aria-label={t('liveToast.close', locale)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
