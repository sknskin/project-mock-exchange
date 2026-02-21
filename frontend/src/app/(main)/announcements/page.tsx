/**
 * @file 공지사항 목록 페이지
 * @description 공지사항 목록, 검색, 페이지네이션을 제공하는 페이지
 *
 * @file Announcements List Page
 * @description Page with announcement list, search, and pagination
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Plus, MessageSquare, Pin, Paperclip, Eye, Heart } from 'lucide-react';
import { useAnnouncements } from '@/hooks/useAdmin';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/stores/auth';
import Pagination from '@/components/ui/Pagination';
import { cn } from '@/lib/format';

export default function AnnouncementsPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { data, isLoading } = useAnnouncements({ page, limit, search });

  const isAdminOrSystem =
    user?.role === 'SYSTEM' || user?.role === 'ADMIN';

  // Debounced live search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'SYSTEM':
        return 'bg-purple-500/15 text-purple-400';
      case 'ADMIN':
        return 'bg-accent/15 text-accent';
      default:
        return 'bg-bg-tertiary text-text-tertiary';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'SYSTEM':
        return t('common.system');
      case 'ADMIN':
        return t('common.admin');
      default:
        return t('common.user');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between py-6">
        <h1 className="text-[20px] font-extrabold text-text-primary">
          {t('announce.title')}
        </h1>
        {isAdminOrSystem && (
          <Link
            href="/announcements/new"
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold',
              'bg-accent text-white hover:bg-accent/90 transition-colors',
            )}
          >
            <Plus className="w-4 h-4" />
            {t('announce.new')}
          </Link>
        )}
      </div>

      {/* Search - debounced live search */}
      <div className="mb-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-quaternary" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('announce.search')}
            className={cn(
              'w-full pl-9 pr-4 py-2.5 rounded-xl text-[14px]',
              'bg-bg-secondary border border-border',
              'text-text-primary placeholder:text-text-quaternary',
              'focus:outline-none focus:border-accent transition-colors',
            )}
          />
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-bg-secondary animate-pulse"
            />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="py-24 text-center text-text-quaternary text-[14px]">
          {t('announce.noItems')}
        </div>
      ) : (
        <div className="space-y-3">
          {data.items.map((item) => (
            <Link
              key={item.id}
              href={`/announcements/${item.id}`}
              className={cn(
                'block p-4 rounded-xl border border-border',
                'bg-bg-secondary hover:bg-bg-tertiary hover:border-accent/40',
                'transition-colors cursor-pointer',
              )}
            >
              {/* Title row */}
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {item.isPinned && (
                    <Pin className="w-3.5 h-3.5 text-accent shrink-0 rotate-45" />
                  )}
                  <h2 className="text-[15px] font-semibold text-text-primary leading-snug line-clamp-1">
                    {item.title}
                  </h2>
                </div>
                {item.attachmentCount > 0 && (
                  <div className="flex items-center gap-0.5 shrink-0 text-text-quaternary">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span className="text-[12px]">{item.attachmentCount}</span>
                  </div>
                )}
              </div>

              {/* Footer: author + date + counts */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={cn(
                      'text-[11px] font-semibold px-1.5 py-0.5 rounded',
                      getRoleBadgeClass(item.author.role),
                    )}
                  >
                    {getRoleLabel(item.author.role)}
                  </span>
                  <span className="text-[12px] text-text-tertiary font-medium">
                    {item.author.name}
                  </span>
                  <span className="text-text-quaternary text-[11px]">·</span>
                  <span className="text-[12px] text-text-quaternary">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-text-quaternary">
                  <div className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    <span className="text-[12px]">{item.viewCount ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5" />
                    <span className="text-[12px]">{item.likeCount ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span className="text-[12px]">{item.commentCount}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 0 && (
        <Pagination
          page={page}
          totalPages={data.totalPages}
          total={data.total}
          limit={limit}
          onPageChange={(p) => setPage(p)}
          onLimitChange={(n) => { setLimit(n); setPage(1); }}
        />
      )}
    </div>
  );
}
