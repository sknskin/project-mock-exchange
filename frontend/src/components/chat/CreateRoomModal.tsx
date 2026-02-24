'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Search, X, Check } from 'lucide-react';
import { useChatStore } from '@/stores/chat';
import { useCreateRoom, useSearchUsers } from '@/hooks/useChat';
import { useAuthStore } from '@/stores/auth';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/format';
import type { ChatUserSearchResult } from '@/types';

export default function CreateRoomModal() {
  const { t } = useTranslation();
  const { backToList, openRoom } = useChatStore();
  const user = useAuthStore((s) => s.user);
  const createRoom = useCreateRoom();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<ChatUserSearchResult[]>([]);
  const [groupName, setGroupName] = useState('');

  const { data: searchResults, isLoading: searching, isError } = useSearchUsers(debouncedQuery);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredResults = searchResults?.filter(
    (u) => u.id !== user?.id && !selectedUsers.some((s) => s.id === u.id),
  );

  const isGroup = selectedUsers.length > 1;

  const toggleUser = (u: ChatUserSearchResult) => {
    setSelectedUsers((prev) =>
      prev.some((s) => s.id === u.id)
        ? prev.filter((s) => s.id !== u.id)
        : [...prev, u],
    );
  };

  const handleCreate = async () => {
    if (selectedUsers.length === 0) return;

    const type = isGroup ? 'GROUP' : 'DM';

    const participantUsernames: Record<string, string> = {};
    selectedUsers.forEach((u) => {
      participantUsernames[u.id] = u.username;
    });

    const room = await createRoom.mutateAsync({
      type,
      name: isGroup ? (groupName.trim() || undefined) : undefined,
      participantIds: selectedUsers.map((u) => u.id),
      participantUsernames,
    });

    openRoom(room.id);
  };

  const canCreate = selectedUsers.length > 0;

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
        <h3 className="text-[14px] font-bold text-text-primary">{t('chat.newChat')}</h3>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {/* Group name input (shown when 2+ users selected) */}
        {isGroup && (
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder={t('chat.groupNamePlaceholder')}
            className="w-full px-3.5 py-2.5 bg-bg-secondary rounded-xl text-[13px] text-text-primary placeholder:text-text-quaternary outline-none"
            maxLength={100}
          />
        )}

        {/* Selected users chips */}
        {selectedUsers.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedUsers.map((u) => (
              <span
                key={u.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-accent/10 text-accent rounded-full text-[12px] font-medium"
              >
                {u.username}
                <button onClick={() => setSelectedUsers((prev) => prev.filter((s) => s.id !== u.id))}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-quaternary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('chat.searchUserPlaceholder')}
            className="w-full pl-9 pr-3.5 py-2.5 bg-bg-secondary rounded-xl text-[13px] text-text-primary placeholder:text-text-quaternary outline-none"
          />
        </div>

        {/* Search results */}
        {searching ? (
          <p className="text-[12px] text-text-quaternary text-center py-4">{t('common.loading')}</p>
        ) : isError ? (
          <p className="text-[12px] text-danger text-center py-4">{t('common.error')}</p>
        ) : filteredResults && filteredResults.length > 0 ? (
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
                    <div className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center text-[12px] font-bold text-text-tertiary shrink-0">
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-[13px] font-medium text-text-primary truncate">{u.username}</p>
                      <p className="text-[11px] text-text-tertiary truncate">{u.name}</p>
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

      {/* Create button */}
      <div className="px-3 py-2.5 border-t border-border shrink-0">
        <button
          onClick={handleCreate}
          disabled={!canCreate || createRoom.isPending}
          className={cn(
            'w-full h-10 rounded-xl text-[13px] font-semibold transition-colors',
            canCreate
              ? 'bg-accent text-white hover:bg-accent/85'
              : 'bg-bg-secondary text-text-quaternary cursor-default',
          )}
        >
          {createRoom.isPending ? t('common.loading') : t('chat.create')}
        </button>
      </div>
    </div>
  );
}
