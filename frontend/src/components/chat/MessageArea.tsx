'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, UserPlus, LogOut, Users } from 'lucide-react';
import { useChatStore } from '@/stores/chat';
import { useChatMessages, useSendMessage, useMarkRoomRead, useChatRooms } from '@/hooks/useChat';
import { useAuthStore } from '@/stores/auth';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/format';
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
  const user = useAuthStore((s) => s.user);
  const { data: rooms } = useChatRooms();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useChatMessages(roomId);
  const sendMessage = useSendMessage();
  const markRead = useMarkRoomRead();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const prevMessageCountRef = useRef(0);

  const room: ChatRoom | undefined = rooms?.find((r) => r.id === roomId);
  const messages = data?.pages.flatMap((p) => p.items) ?? [];

  // Join socket room on mount
  useEffect(() => {
    joinRoom(roomId);
    return () => leaveSocketRoom(roomId);
  }, [roomId, joinRoom, leaveSocketRoom]);

  // Mark as read on mount and when new messages arrive
  useEffect(() => {
    if (roomId) {
      markRead.mutate(roomId);
    }
  }, [roomId, messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll on new message
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length]);

  // Load more on scroll to top
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (el && el.scrollTop < 50 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const handleSend = (content: string) => {
    sendMessage.mutate({ roomId, content });
  };

  const displayName = room
    ? room.type === 'DM'
      ? room.participants.find((p) => p.userId !== user?.id)?.username ?? ''
      : room.name || room.participants.filter((p) => p.userId !== user?.id).map((p) => p.username).join(', ') || ''
    : '';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border shrink-0">
        <button
          onClick={backToList}
          className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors"
        >
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-bold text-text-primary truncate">{displayName}</h3>
          {room && (
            <p className="text-[11px] text-text-quaternary">
              {t('chat.participants')} {room.participants.length}
            </p>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors"
          >
            <Users className="w-4 h-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-[140px] bg-bg-secondary border border-border rounded-xl shadow-2xl overflow-hidden z-10">
              {room?.type === 'GROUP' && (
                <button
                  onClick={() => { setShowMenu(false); setShowInvite(true); }}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-[12px] font-medium text-text-primary hover:bg-bg-tertiary transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5 text-text-tertiary" />
                  {t('chat.invite')}
                </button>
              )}
              <button
                onClick={() => { setShowMenu(false); setLeaveConfirm(true); }}
                className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-[12px] font-medium text-danger hover:bg-bg-tertiary transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                {t('chat.leaveRoom')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-3"
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
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <MessageInput onSend={handleSend} disabled={sendMessage.isPending} />

      {/* Invite Modal */}
      {showInvite && room && (
        <InviteModal
          roomId={room.id}
          existingParticipantIds={room.participants.map((p) => p.userId)}
          onClose={() => setShowInvite(false)}
        />
      )}

      {/* Leave Confirm */}
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
    </div>
  );
}
