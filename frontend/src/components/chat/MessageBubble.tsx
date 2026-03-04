/**
 * @file 메시지 버블 컴포넌트
 * @description 채팅 메시지 하나를 표시 — 본인/상대/시스템/관리자 스타일 분기, 삭제 기능 포함
 *
 * @file Message Bubble Component
 * @description Renders a single chat message — style varies for self/other/system/admin, includes delete
 */
'use client';

import { useState } from 'react';
import { Trash2, Shield } from 'lucide-react';
import { cn } from '@/lib/format';
import { useDeleteMessage } from '@/hooks/useChat';
import { useTranslation } from '@/hooks/useTranslation';
import ConfirmModal from '@/components/ui/ConfirmModal';
import type { ChatMessage } from '@/types';

// 메시지 버블 Props / Message Bubble Props
interface MessageBubbleProps {
  /** 채팅 메시지 데이터 / Chat message data */
  message: ChatMessage;
  /** 본인이 보낸 메시지 여부 / Whether this message is sent by current user */
  isMine: boolean;
  /** 발신자 이름 표시 여부 / Whether to show sender name */
  showSender: boolean;
  /** 현재 로케일 (시간 포맷용) / Current locale (for time formatting) */
  locale: string;
  /** 현재 사용자 역할 (삭제 권한 판단) / Current user role (for delete permission) */
  userRole?: string;
}

function formatTime(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessageBubble({ message, isMine, showSender, locale, userRole }: MessageBubbleProps) {
  const { t } = useTranslation();
  const deleteMessage = useDeleteMessage();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 삭제 권한: SYSTEM=모두 / ADMIN=SYSTEM 메시지 제외 / USER=본인만
  const canDelete = (() => {
    if (userRole === 'SYSTEM') return true;
    if (userRole === 'ADMIN') return message.senderRole !== 'SYSTEM';
    return isMine;
  })();

  const isSystemUser = message.senderRole === 'SYSTEM';
  const isAdminUser = message.senderRole === 'ADMIN';

  const handleDelete = async () => {
    await deleteMessage.mutateAsync({ roomId: message.roomId, messageId: message.id });
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <div className={cn('group flex mb-1.5', isMine ? 'justify-end' : 'justify-start')}>
        <div className={cn('max-w-[75%] flex flex-col', isMine ? 'items-end' : 'items-start')}>
          {showSender && !isMine && (
            <span className="text-[11px] text-text-tertiary mb-0.5 px-1 flex items-center gap-1">
              {isSystemUser && <Shield className="w-3 h-3 text-accent" />}
              {isAdminUser && <Shield className="w-3 h-3 text-blue-400" />}
              <span className={cn(
                isSystemUser ? 'font-semibold text-accent' : '',
                isAdminUser ? 'font-semibold text-blue-400' : '',
              )}>
                {message.senderName || message.senderUsername}
              </span>
              {isSystemUser && (
                <span className="text-[9px] px-1 py-px rounded bg-accent/15 text-accent font-bold uppercase">
                  system
                </span>
              )}
              {isAdminUser && (
                <span className="text-[9px] px-1 py-px rounded bg-blue-400/15 text-blue-400 font-bold uppercase">
                  admin
                </span>
              )}
            </span>
          )}
          <div className={cn('flex items-end gap-1', isMine ? 'flex-row-reverse' : 'flex-row')}>
            <div className="relative">
              <div
                className={cn(
                  'px-3 py-2 rounded-2xl text-[13px] leading-relaxed break-words whitespace-pre-wrap',
                  isMine
                    ? 'bg-accent text-white rounded-br-md'
                    : isSystemUser
                      ? 'bg-accent/10 text-text-primary border border-accent/20 rounded-bl-md'
                      : isAdminUser
                        ? 'bg-blue-400/8 text-text-primary border border-blue-400/15 rounded-bl-md'
                        : 'bg-bg-secondary text-text-primary rounded-bl-md',
                )}
              >
                {message.content}
              </div>
              {canDelete && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
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
            <div className={cn('flex flex-col shrink-0 mb-0.5', isMine ? 'items-end' : 'items-start')}>
              {message.unreadCount > 0 && (
                <span className="text-[10px] leading-none text-accent font-bold">
                  {message.unreadCount}
                </span>
              )}
              <span className="text-[10px] leading-none text-text-quaternary mt-0.5">
                {formatTime(message.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title={t('chat.deleteMessage')}
        message={t('chat.deleteConfirm')}
        confirmLabel={t('chat.deleteMessage')}
        confirmVariant="danger"
        loading={deleteMessage.isPending}
      />
    </>
  );
}
