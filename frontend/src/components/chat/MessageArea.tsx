/**
 * @file 메시지 영역 컴포넌트
 * @description 채팅방 내 메시지 목록, 날짜 구분선, 무한 스크롤, 검색, 참여자 관리(초대/강퇴/삭제) 등 핵심 채팅 UI
 *
 * @file Message Area Component
 * @description Core chat UI: message list, date separators, infinite scroll, search, participant management (invite/kick/delete)
 */
'use client';

import { Fragment, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { ArrowLeft, UserPlus, LogOut, Users, PanelRightOpen, X, Ban, Trash2, Search } from 'lucide-react';
import { useChatStore } from '@/stores/chat';
import { useChatMessages, useSendMessage, useMarkRoomRead, useChatRooms, useKickFromRoom, useDeleteRoom } from '@/hooks/useChat';
import { useAuthStore } from '@/stores/auth';
import { usePresenceStore } from '@/stores/presence';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/format';
import Tooltip from '@/components/ui/Tooltip';
import Skeleton from '@/components/ui/Skeleton';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import InviteModal from './InviteModal';
import { useTypingUsers } from '@/hooks/useChatSocket';
import type { ChatRoom, ChatMessage } from '@/types';
import type { TranslationKey } from '@/lib/i18n';

// 시스템 메시지(초대/퇴장/강퇴) JSON을 사람이 읽을 수 있는 텍스트로 변환 / Parse system message JSON to human-readable text
function formatSystemMessage(content: string, t: (key: TranslationKey) => string): string {
  try {
    const data = JSON.parse(content);
    const action = data.action as string;
    const name = data.names?.join(', ') || data.name || '';
    if (action === 'invite') return name + t('chat.system.invited');
    if (action === 'leave') return name + t('chat.system.left');
    if (action === 'kick') return name + t('chat.system.kicked');
  } catch { /* fallback */ }
  return content;
}

function SystemMessageRow({ message, t }: { message: ChatMessage; t: (key: TranslationKey) => string }) {
  return (
    <div className="flex justify-center my-2">
      <span className="text-[11px] text-text-quaternary bg-bg-secondary/80 px-3 py-1 rounded-full">
        {formatSystemMessage(message.content, t)}
      </span>
    </div>
  );
}

// 메시지 영역 Props / Message Area Props
interface MessageAreaProps {
  /** 현재 채팅방 ID
   * Current chat room ID */
  roomId: string;
  /** 소켓 방 입장 함수
   * Socket room join function */
  joinRoom: (roomId: string) => void;
  /** 소켓 방 퇴장 함수
   * Socket room leave function */
  leaveSocketRoom: (roomId: string) => void;
  /** 채팅방 나가기 콜백
   * Leave room callback */
  onLeaveRoom: () => void;
  /** 타이핑 상태 전송 함수
   * Typing indicator emit function */
  emitTyping: (roomId: string) => void;
}

/** 메시지 영역 — 메시지 목록, 무한 스크롤, 검색, 참여자 관리 등 핵심 채팅 UI
 * Message area — core chat UI with message list, infinite scroll, search, participant management */
export default function MessageArea({ roomId, joinRoom, leaveSocketRoom, onLeaveRoom, emitTyping }: MessageAreaProps) {
  const { t, locale } = useTranslation();
  const backToList = useChatStore((s) => s.backToList);
  const togglePin = useChatStore((s) => s.togglePin);
  const isPinned = useChatStore((s) => s.isPinned);
  const closeChat = useChatStore((s) => s.closeChat);
  const user = useAuthStore((s) => s.user);
  const { data: rooms } = useChatRooms();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading: messagesLoading, isError: messagesError } = useChatMessages(roomId);
  const sendMessage = useSendMessage();
  const markRead = useMarkRoomRead();
  const kickFromRoom = useKickFromRoom();
  const deleteRoom = useDeleteRoom();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputFocusRef = useRef<(() => void) | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const [kickTarget, setKickTarget] = useState<{ userId: string; username: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const prevMessageCountRef = useRef(0);
  const lastMarkedLengthRef = useRef(0);

  const isAdmin = user?.role === 'SYSTEM' || user?.role === 'ADMIN';
  const typingUsers = useTypingUsers(roomId);
  const handleTyping = useCallback(() => emitTyping(roomId), [roomId, emitTyping]);

  const room: ChatRoom | undefined = rooms?.find((r) => r.id === roomId);
  const messages = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data?.pages]);

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter((m) => m.content.toLowerCase().includes(q));
  }, [messages, searchQuery]);

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

  // markRead를 ref로 안정화 — 매 렌더마다 새 참조 생성 방지 / Stabilize markRead via ref — prevent new reference every render
  const markReadRef = useRef(markRead);
  markReadRef.current = markRead;

  // 마운트 시 및 새 메시지 도착 시 읽음 처리 — 디바운스 적용 (Mark as read on mount and new messages — debounced)
  const markReadTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  useEffect(() => {
    if (roomId && messages.length > lastMarkedLengthRef.current) {
      lastMarkedLengthRef.current = messages.length;
      if (markReadTimerRef.current) clearTimeout(markReadTimerRef.current);
      markReadTimerRef.current = setTimeout(() => {
        markReadRef.current.mutate(roomId);
      }, 300);
    }
  }, [roomId, messages.length]);

  // 새 메시지 시 자동 스크롤 — 무한 스크롤(이전 메시지 로드) 시에는 스크롤하지 않음
  // Auto-scroll on new message — skip during infinite scroll (loading older messages)
  const isLoadingOlderRef = useRef(false);
  useEffect(() => {
    if (isFetchingNextPage) {
      isLoadingOlderRef.current = true;
    }
  }, [isFetchingNextPage]);

  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      // 이전 메시지 로드 시에는 스크롤하지 않음 / Don't scroll when loading older messages
      if (!isLoadingOlderRef.current) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
      isLoadingOlderRef.current = false;
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
              <span className="w-2 h-2 bg-green-500 rounded-full shrink-0" role="status" aria-label={t('chat.online')} />
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
                  <p className="px-3.5 pt-2 pb-1 text-[10px] font-bold text-text-quaternary uppercase tracking-wider sticky top-0 bg-bg-secondary">{t('chat.participants')}</p>
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
                        {p.userId === user?.id && <span className="text-text-quaternary ml-1">{t('chat.me')}</span>}
                      </span>
                      {p.userId !== user?.id && (
                        <button
                          onClick={() => handleKick(p.userId, p.name || p.username)}
                          className="p-1 rounded text-text-quaternary hover:text-danger transition-colors"
                          title={t('chat.kick')}
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
              {isAdmin && (
                <button
                  onClick={() => { setShowMenu(false); setDeleteConfirm(true); }}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-[12px] font-medium text-danger hover:bg-bg-tertiary transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t('chat.deleteRoom')}
                </button>
              )}
              </div>
            </div>
          )}
        </div>
        <Tooltip label={t('chat.search')}>
          <button
            onClick={() => { setSearchOpen(!searchOpen); setSearchQuery(''); }}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              searchOpen
                ? 'text-accent bg-accent/10 hover:bg-accent/20'
                : 'text-text-tertiary hover:text-text-primary hover:bg-bg-secondary',
            )}
          >
            <Search className="w-4 h-4" />
          </button>
        </Tooltip>
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

      {searchOpen && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-bg-secondary/50 shrink-0">
          <Search className="w-3.5 h-3.5 text-text-quaternary shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('chat.searchPlaceholder')}
            className="flex-1 bg-transparent text-[13px] text-text-primary placeholder:text-text-quaternary outline-none"
            autoFocus
          />
          {searchQuery && (
            <span className="text-[11px] text-text-quaternary whitespace-nowrap">
              {t('chat.searchResultCount').replace('{{count}}', String(messages.filter((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase())).length))}
            </span>
          )}
        </div>
      )}

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
        {messagesError ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[13px] text-red-400">{t('chat.loadError')}</p>
          </div>
        ) : messagesLoading ? (
          <div className="flex flex-col gap-3 py-2">
            {Array.from({ length: 6 }).map((_, i) => {
              const isRight = i % 3 === 0;
              return (
                <div key={i} className={cn('flex gap-2', isRight ? 'justify-end' : 'justify-start')}>
                  {!isRight && <Skeleton className="w-7 h-7 rounded-full shrink-0" />}
                  <div className={cn('space-y-1.5', isRight ? 'items-end' : 'items-start')}>
                    {!isRight && <Skeleton className="w-16 h-2.5" />}
                    <Skeleton className={cn('h-8 rounded-xl', i % 2 === 0 ? 'w-44' : 'w-32')} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : searchQuery && filteredMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[13px] text-text-tertiary">{t('chat.searchNoResults')}</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[13px] text-text-tertiary">{t('chat.noMessages')}</p>
          </div>
        ) : (
          filteredMessages.map((msg, i) => {
            const prevMsg = i > 0 ? filteredMessages[i - 1] : null;
            // 날짜 구분선 (Date separator)
            const msgDate = new Date(msg.createdAt).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
            const prevDate = prevMsg ? new Date(prevMsg.createdAt).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' }) : null;
            const showDateSep = !prevDate || msgDate !== prevDate;

            const dateSep = showDateSep ? (
              <div key={`date-${msg.id}`} className="flex items-center gap-3 my-3">
                <div className="flex-1 h-px bg-border/60" />
                <span className="text-[10px] text-text-quaternary font-medium shrink-0">{msgDate}</span>
                <div className="flex-1 h-px bg-border/60" />
              </div>
            ) : null;

            // 자동 생성 시스템 메시지 (초대/퇴장/강퇴) - senderId가 nil UUID
            const isAutoSystem = msg.senderRole === 'SYSTEM' && msg.senderId === '00000000-0000-0000-0000-000000000000';
            if (isAutoSystem) {
              return <Fragment key={msg.id}>{dateSep}<SystemMessageRow message={msg} t={t} /></Fragment>;
            }
            const showSender = !prevMsg || prevMsg.senderId !== msg.senderId || (prevMsg.senderRole === 'SYSTEM' && prevMsg.senderId === '00000000-0000-0000-0000-000000000000') || showDateSep;
            return (
              <Fragment key={msg.id}>{dateSep}<MessageBubble
                message={msg}
                isMine={msg.senderId === user?.id}
                showSender={showSender}
                locale={locale}
                userRole={user?.role}
              /></Fragment>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 타이핑 인디케이터 (Typing indicator) */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-1 text-[11px] text-text-tertiary truncate">
          <span className="font-medium">{typingUsers.join(', ')}</span> {t('chat.typing')}
        </div>
      )}

      {/* 입력란 (Input) */}
      <MessageInput
        onSend={handleSend}
        disabled={sendMessage.isPending}
        focusRef={inputFocusRef}
        participants={room?.participants}
        currentUserId={user?.id}
        onTyping={handleTyping}
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
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 rounded-2xl" role="dialog" aria-modal="true" aria-label={t('chat.leaveRoom')}>
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
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 rounded-2xl" role="dialog" aria-modal="true" aria-label={t('chat.kick')}>
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

      {/* 채팅방 삭제 확인 모달 (Delete Room Confirm Modal) */}
      {deleteConfirm && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 rounded-2xl" role="dialog" aria-modal="true" aria-label={t('chat.deleteRoom')}>
          <div className="bg-bg-primary border border-border rounded-2xl p-5 w-[260px] shadow-2xl">
            <p className="text-[13px] text-text-primary text-center whitespace-pre-line leading-relaxed">
              {t('chat.deleteRoomConfirm')}
            </p>
            <div className="flex gap-2.5 mt-4">
              <button
                onClick={() => {
                  deleteRoom.mutate(roomId, { onSuccess: () => { setDeleteConfirm(false); backToList(); } });
                }}
                disabled={deleteRoom.isPending}
                className="flex-1 h-9 rounded-xl bg-danger text-white text-[13px] font-semibold hover:bg-danger/85 transition-colors disabled:opacity-50"
              >
                {t('chat.deleteRoom')}
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
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
