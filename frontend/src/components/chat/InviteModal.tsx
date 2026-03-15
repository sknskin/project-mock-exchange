/**
 * @file 채팅방 초대 모달 컴포넌트
 * @description 기존 채팅방에 새 참여자를 검색/선택하여 초대하는 모달 (포커스 트랩 적용)
 *
 * @file Invite Modal Component
 * @description Modal to search/select and invite new participants to existing chat room (focus trap applied)
 */
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, X, Check, CheckCheck } from 'lucide-react';
import { useInviteToRoom, useSearchUsers } from '@/hooks/useChat';
import { useAuthStore } from '@/stores/auth';
import { usePresenceStore } from '@/stores/presence';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/format';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import type { ChatUserSearchResult } from '@/types';

// 초대 모달 Props / Invite Modal Props
interface InviteModalProps {
  /** 초대할 채팅방 ID
   * Chat room ID to invite to */
  roomId: string;
  /** 이미 참여 중인 사용자 ID 목록 (검색 결과에서 제외)
   * Existing participant IDs (excluded from search) */
  existingParticipantIds: string[];
  /** 모달 닫기 콜백
   * Modal close callback */
  onClose: () => void;
}

/** 채팅방 초대 모달 — 기존 방에 새 참여자 검색/선택/초대
 * Invite modal — search, select, and invite new participants to an existing room */
export default function InviteModal({ roomId, existingParticipantIds, onClose }: InviteModalProps) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const invite = useInviteToRoom();
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, true);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<ChatUserSearchResult[]>([]);

  const { data: searchResults, isLoading: searching } = useSearchUsers(debouncedQuery, existingParticipantIds);
  const onlineUserIds = usePresenceStore((s) => s.onlineUserIds);

  // ESC 키로 닫기 / Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredResults = useMemo(() =>
    searchResults?.filter(
      (u) =>
        u.id !== user?.id &&
        !existingParticipantIds.includes(u.id),
    ) ?? [],
  [searchResults, user?.id, existingParticipantIds]);

  const allSelected = filteredResults.length > 0 && filteredResults.every((u) => selectedUsers.some((s) => s.id === u.id));

  /** 사용자 선택/해제 토글
   * Toggle user selection */
  const toggleUser = (u: ChatUserSearchResult) => {
    setSelectedUsers((prev) =>
      prev.some((s) => s.id === u.id)
        ? prev.filter((s) => s.id !== u.id)
        : [...prev, u],
    );
  };

  /** 전체 선택/해제 토글
   * Toggle select/deselect all */
  const handleSelectAll = () => {
    if (allSelected) {
      const filteredIds = new Set(filteredResults.map((u) => u.id));
      setSelectedUsers((prev) => prev.filter((s) => !filteredIds.has(s.id)));
    } else {
      setSelectedUsers((prev) => {
        const existingIds = new Set(prev.map((s) => s.id));
        const newUsers = filteredResults.filter((u) => !existingIds.has(u.id));
        return [...prev, ...newUsers];
      });
    }
  };

  /** 선택된 사용자 초대 요청 처리
   * Handle invite request for selected users */
  const handleInvite = async () => {
    if (selectedUsers.length === 0) return;
    const usernames: Record<string, string> = {};
    const names: Record<string, string> = {};
    selectedUsers.forEach((u) => {
      usernames[u.id] = u.username;
      names[u.id] = u.name;
    });
    await invite.mutateAsync({
      roomId,
      userIds: selectedUsers.map((u) => u.id),
      usernames,
      names,
    });
    onClose();
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-bg-primary rounded-2xl" role="dialog" aria-modal="true" aria-labelledby="invite-modal-title" ref={modalRef}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border shrink-0">
        <h3 id="invite-modal-title" className="text-[14px] font-bold text-text-primary">{t('chat.inviteToRoom')}</h3>
        <button
          onClick={onClose}
          aria-label="Close"
          className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {/* Selected */}
        {selectedUsers.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedUsers.map((u) => (
              <span
                key={u.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-accent/10 text-accent rounded-full text-[12px] font-medium"
              >
                {u.name || u.username}
                <button onClick={() => toggleUser(u)}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Search + Select All */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-quaternary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('chat.searchUserPlaceholder')}
              className="w-full pl-9 pr-3.5 py-2.5 bg-bg-secondary rounded-xl text-[13px] text-text-primary placeholder:text-text-quaternary outline-none"
            />
          </div>
          {filteredResults.length > 0 && (
            <button
              onClick={handleSelectAll}
              className={cn(
                'shrink-0 p-2.5 rounded-xl transition-colors',
                allSelected
                  ? 'bg-accent/10 text-accent'
                  : 'bg-bg-secondary text-text-tertiary hover:text-text-primary',
              )}
              title={allSelected ? t('chat.deselectAll') : t('chat.selectAll')}
            >
              <CheckCheck className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results */}
        {searching ? (
          <p className="text-[12px] text-text-quaternary text-center py-4">{t('common.loading')}</p>
        ) : filteredResults.length > 0 ? (
          <ul className="space-y-0.5">
            {filteredResults.map((u) => {
              const isSelected = selectedUsers.some((s) => s.id === u.id);
              return (
                <li key={u.id}>
                  <button
                    onClick={() => toggleUser(u)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
                      isSelected ? 'bg-accent/10' : 'hover:bg-bg-secondary',
                    )}
                  >
                    <div className="relative shrink-0">
                      <div className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center text-[12px] font-bold text-text-tertiary">
                        {(u.name || u.username).charAt(0).toUpperCase()}
                      </div>
                      {onlineUserIds.has(u.id) && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-bg-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-[13px] font-medium text-text-primary truncate">{u.name || u.username}</p>
                      <p className="text-[11px] text-text-tertiary truncate">
                        @{u.username}
                        {onlineUserIds.has(u.id) ? (
                          <span className="ml-1.5 text-green-500">{t('chat.online')}</span>
                        ) : (
                          <span className="ml-1.5 text-text-quaternary">{t('chat.offline')}</span>
                        )}
                      </p>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-accent shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-[12px] text-text-quaternary text-center py-4">{t('common.noData')}</p>
        )}
      </div>

      {/* Invite button */}
      <div className="px-3 py-2.5 border-t border-border shrink-0">
        <button
          onClick={handleInvite}
          disabled={selectedUsers.length === 0 || invite.isPending}
          className={cn(
            'w-full h-10 rounded-xl text-[13px] font-semibold transition-colors',
            selectedUsers.length > 0
              ? 'bg-accent text-white hover:bg-accent/85'
              : 'bg-bg-secondary text-text-quaternary cursor-default',
          )}
        >
          {invite.isPending ? t('common.loading') : `${t('chat.invite')} (${selectedUsers.length})`}
        </button>
      </div>
    </div>
  );
}
