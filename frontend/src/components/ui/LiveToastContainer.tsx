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

const COLOR_MAP: Record<LiveToastCategory, string> = {
  'chat-message': 'border-accent/40 bg-accent/10 text-accent',
  'chat-invited': 'border-accent/40 bg-accent/10 text-accent',
  'chat-kicked': 'border-rise/40 bg-rise/10 text-rise',
  trade: 'border-success/40 bg-success/10 text-success',
  'price-alert': 'border-warning/40 bg-warning/10 text-warning',
  'announcement-new': 'border-accent/40 bg-accent/10 text-accent',
  'announcement-updated': 'border-accent/40 bg-accent/10 text-accent',
  'registration-approved': 'border-success/40 bg-success/10 text-success',
  'registration-rejected': 'border-rise/40 bg-rise/10 text-rise',
  'registration-request': 'border-accent/40 bg-accent/10 text-accent',
};

export default function LiveToastContainer() {
  const toasts = useLiveToastStore((s) => s.toasts);
  const removeToast = useLiveToastStore((s) => s.removeToast);
  const router = useRouter();
  const { openChat, openRoom } = useChatStore();
  const locale = useSettingsStore((s) => s.locale);

  if (toasts.length === 0) return null;

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
    <div className="fixed bottom-20 sm:bottom-4 right-0 sm:right-4 z-[110] flex flex-col gap-2 w-full sm:w-auto sm:max-w-sm px-3 sm:px-0 pointer-events-none">
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
