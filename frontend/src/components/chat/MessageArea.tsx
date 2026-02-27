'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowLeft, UserPlus, LogOut, Users, PanelRightOpen, X, Ban } from 'lucide-react';
import { useChatStore } from '@/stores/chat';
import { useChatMessages, useSendMessage, useMarkRoomRead, useChatRooms, useKickFromRoom } from '@/hooks/useChat';
import { useAuthStore } from '@/stores/auth';
import { usePresenceStore } from '@/stores/presence';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/format';
import Tooltip from '@/components/ui/Tooltip';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import InviteModal from './InviteModal';
import type { ChatRoom } from '@/types';

interface MessageAreaProps {
  roomId: string;
  joinRoom: (roomId: string) => void;
  leaveSocketRoom: (roomId: string) => void;
  onLeaveRoom: () => void;
}

export default function MessageArea({ roomId, joinRoom, leaveSocketRoom, onLeaveRoom }: MessageAreaProps) {
  const { t, locale } = useTranslation();
  const backToList = useChatStore((s) => s.backToList);
  const togglePin = useChatStore((s) => s.togglePin);
  const isPinned = useChatStore((s) => s.isPinned);
  const closeChat = useChatStore((s) => s.closeChat);
  const user = useAuthStore((s) => s.user);
  const { data: rooms } = useChatRooms();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useChatMessages(roomId);
  const sendMessage = useSendMessage();
  const markRead = useMarkRoomRead();
  const kickFromRoom = useKickFromRoom();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputFocusRef = useRef<(() => void) | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const [kickTarget, setKickTarget] = useState<{ userId: string; username: string } | null>(null);
  const prevMessageCountRef = useRef(0);
  const lastMarkedLengthRef = useRef(0);

  const isAdmin = user?.role === 'SYSTEM' || user?.role === 'ADMIN';

  const room: ChatRoom | undefined = rooms?.find((r) => r.id === roomId);
  const messages = data?.pages.flatMap((p) => p.items) ?? [];

  // 메뉴 외부 클릭 시 닫기 (Close menu on outside click)
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  // 마운트 시 소켓 방 입장 + 입력란 포커스 (Join socket room on mount + focus input)
  useEffect(() => {
    joinRoom(roomId);
    // 방 입장 후 입력란 포커스 (Focus input after entering room)
    setTimeout(() => inputFocusRef.current?.(), 100);
    return () => leaveSocketRoom(roomId);
  }, [roomId, joinRoom, leaveSocketRoom]);

  // 마운트 시 및 새 메시지 도착 시 읽음 처리 (Mark as read on mount and when new messages arrive)
  useEffect(() => {
    if (roomId && messages.length > lastMarkedLengthRef.current) {
      lastMarkedLengthRef.current = messages.length;
      markRead.mutate(roomId);
    }
  }, [roomId, messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // 새 메시지 시 자동 스크롤 (Auto-scroll on new message)
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length]);

  // 상단 스크롤 시 이전 메시지 로드 (Load more on scroll to top)
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (el && el.scrollTop < 50 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const handleSend = useCallback((content: string) => {
    sendMessage.mutate({ roomId, content }, {
      onSuccess: () => {
        // 전송 후 입력란 다시 포커스 (Re-focus input after sending)
        setTimeout(() => inputFocusRef.current?.(), 50);
      },
    });
  }, [roomId, sendMessage]);

  const handleKick = useCallback((targetUserId: string, displayName: string) => {
    setKickTarget({ userId: targetUserId, username: displayName });
    setShowMenu(false);
  }, []);

  const confirmKick = useCallback(() => {
    if (!kickTarget) return;
    kickFromRoom.mutate({ roomId, targetUserId: kickTarget.userId });
    setKickTarget(null);
  }, [roomId, kickFromRoom, kickTarget]);

  const displayName = room
    ? room.type === 'DM'
      ? (room.participants.find((p) => p.userId !== user?.id)?.name || room.participants.find((p) => p.userId !== user?.id)?.username) ?? ''
      : room.name || room.participants.filter((p) => p.userId !== user?.id).map((p) => p.name || p.username).join(', ') || ''
    : '';

  const onlineUserIds = usePresenceStore((s) => s.onlineUserIds);
  const otherUser = room?.type === 'DM' ? room.participants.find((p) => p.userId !== user?.id) : null;
  const isOtherOnline = otherUser ? onlineUserIds.has(otherUser.userId) : false;
  const onlineCount = room?.type === 'GROUP'
    ? room.participants.filter((p) => onlineUserIds.has(p.userId)).length
    : 0;

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 (Header) */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border shrink-0">
        <Tooltip label={t('chat.tooltip.back')}>
          <button
            onClick={backToList}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </button>
        </Tooltip>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-[14px] font-bold text-text-primary truncate">{displayName}</h3>
            {room?.type === 'DM' && isOtherOnline && (
              <span className="w-2 h-2 bg-green-500 rounded-full shrink-0" />
            )}
          </div>
          {room && (
            <p className="text-[11px] text-text-quaternary">
              {room.type === 'GROUP'
                ? `${t('chat.participants')} ${room.participants.length} · ${onlineCount} ${t('chat.online')}`
                : isOtherOnline ? t('chat.online') : t('chat.offline')}
            </p>
          )}
        </div>
        <div className="relative" ref={menuRef}>
          <Tooltip label={t('chat.tooltip.participants')}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors"
            >
              <Users className="w-4 h-4" />
            </button>
          </Tooltip>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-[220px] max-h-[360px] bg-bg-secondary border border-border rounded-xl shadow-2xl overflow-hidden z-10 flex flex-col">
              {/* 관리자/시스템용 참여자 목록 (Participant list for admin/system) */}
              {isAdmin && room && (
                <div className="border-b border-border overflow-y-auto overscroll-contain shrink min-h-0">
                  <p className="px-3.5 pt-2 pb-1 text-[10px] font-bold text-text-quaternary uppercase tracking-wider sticky top-0 bg-bg-secondary">Participants</p>
                  {room.participants.map((p) => (
                    <div key={p.userId} className="flex items-center gap-2 px-3.5 py-1.5">
                      <div className="relative shrink-0">
                        <div className="w-6 h-6 rounded-full bg-bg-tertiary flex items-center justify-center text-[10px] font-bold text-text-tertiary">
                          {(p.name || p.username).charAt(0).toUpperCase()}
                        </div>
                        {onlineUserIds.has(p.userId) && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-bg-secondary" />
                        )}
                      </div>
                      <span className="flex-1 text-[12px] text-text-primary truncate">
                        {p.name || p.username}
                        {p.userId === user?.id && <span className="text-text-quaternary ml-1">(me)</span>}
                      </span>
                      {p.userId !== user?.id && (
                        <button
                          onClick={() => handleKick(p.userId, p.name || p.username)}
                          className="p-1 rounded text-text-quaternary hover:text-danger transition-colors"
                          title="Kick"
                        >
                          <Ban className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="shrink-0 border-t border-border">
              <button
                onClick={() => { setShowMenu(false); setShowInvite(true); }}
                className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-[12px] font-medium text-text-primary hover:bg-bg-tertiary transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5 text-text-tertiary" />
                {t('chat.invite')}
              </button>
              <button
                onClick={() => { setShowMenu(false); setLeaveConfirm(true); }}
                className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-[12px] font-medium text-danger hover:bg-bg-tertiary transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                {t('chat.leaveRoom')}
              </button>
              </div>
            </div>
          )}
        </div>
        <Tooltip label={isPinned ? t('chat.tooltip.unpin') : t('chat.tooltip.pin')}>
          <button
            onClick={togglePin}
            className={cn(
              'hidden lg:block p-1.5 rounded-lg transition-colors',
              isPinned
                ? 'text-accent bg-accent/10 hover:bg-accent/20'
                : 'text-text-tertiary hover:text-text-primary hover:bg-bg-secondary',
            )}
          >
            <PanelRightOpen className="w-4 h-4" />
          </button>
        </Tooltip>
        <Tooltip label={t('chat.tooltip.close')}>
          <button
            onClick={closeChat}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </Tooltip>
      </div>

      {/* 메시지 영역 (Messages) */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-3 overscroll-contain"
      >
        {isFetchingNextPage && (
          <div className="text-center py-2">
            <span className="text-[11px] text-text-quaternary">{t('common.loading')}</span>
          </div>
        )}
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[13px] text-text-tertiary">{t('chat.noMessages')}</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const prevMsg = i > 0 ? messages[i - 1] : null;
            const showSender = !prevMsg || prevMsg.senderId !== msg.senderId;
            return (
              <MessageBubble
                key={msg.id}
                message={msg}
                isMine={msg.senderId === user?.id}
                showSender={showSender}
                locale={locale}
                userRole={user?.role}
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력란 (Input) */}
      <MessageInput
        onSend={handleSend}
        disabled={sendMessage.isPending}
        focusRef={inputFocusRef}
        participants={room?.participants}
        currentUserId={user?.id}
      />

      {/* 초대 모달 (Invite Modal) */}
      {showInvite && room && (
        <InviteModal
          roomId={room.id}
          existingParticipantIds={room.participants.map((p) => p.userId)}
          onClose={() => setShowInvite(false)}
        />
      )}

      {/* 퇴장 확인 모달 (Leave Confirm Modal) */}
      {leaveConfirm && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 rounded-2xl">
          <div className="bg-bg-primary border border-border rounded-2xl p-5 w-[260px] shadow-2xl">
            <p className="text-[13px] text-text-primary text-center whitespace-pre-line leading-relaxed">
              {t('chat.leaveConfirm')}
            </p>
            <div className="flex gap-2.5 mt-4">
              <button
                onClick={() => { setLeaveConfirm(false); onLeaveRoom(); }}
                className="flex-1 h-9 rounded-xl bg-danger text-white text-[13px] font-semibold hover:bg-danger/85 transition-colors"
              >
                {t('chat.leaveRoom')}
              </button>
              <button
                onClick={() => setLeaveConfirm(false)}
                className="flex-1 h-9 rounded-xl border border-border text-[13px] font-semibold text-text-secondary hover:bg-bg-secondary transition-colors"
              >
                {t('modal.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 강퇴 확인 모달 (Kick Confirm Modal) */}
      {kickTarget && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 rounded-2xl">
          <div className="bg-bg-primary border border-border rounded-2xl p-5 w-[260px] shadow-2xl">
            <p className="text-[13px] text-text-primary text-center leading-relaxed">
              <span className="font-bold">{kickTarget.username}</span> {t('chat.kickConfirm')}
            </p>
            <div className="flex gap-2.5 mt-4">
              <button
                onClick={confirmKick}
                className="flex-1 h-9 rounded-xl bg-danger text-white text-[13px] font-semibold hover:bg-danger/85 transition-colors"
              >
                {t('chat.kick')}
              </button>
              <button
                onClick={() => setKickTarget(null)}
                className="flex-1 h-9 rounded-xl border border-border text-[13px] font-semibold text-text-secondary hover:bg-bg-secondary transition-colors"
              >
                {t('modal.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
