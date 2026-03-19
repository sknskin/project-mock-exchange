/**
 * @file 자유게시판 탭 컴포넌트
 * @description 커뮤니티 페이지의 자유게시판(토론) 탭 UI
 *
 * @file Discussions Tab Component
 * @description Community page discussions tab UI — extracted from community page for code splitting
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import Pagination from '@/components/ui/Pagination';
import { useCommunityPosts } from '@/hooks/useCommunity';
import { useTranslation } from '@/hooks/useTranslation';
import { cn, formatRelativeTime } from '@/lib/format';
import {
  MessageSquare,
  PenSquare,
  Clock,
  ThumbsUp,
  Eye,
  Search,
  Paperclip,
  Lock,
  X,
} from 'lucide-react';

// 상수 / Constants
const DISCUSSION_CATEGORIES = [
  { value: 'ALL', ko: '전체', en: 'All' },
  { value: 'FREE', ko: '자유토론', en: 'Discussion' },
  { value: 'INFO', ko: '정보공유', en: 'Info' },
  { value: 'QUESTION', ko: '질문', en: 'Question' },
  { value: 'STRATEGY', ko: '전략', en: 'Strategy' },
  { value: 'ANALYSIS', ko: '분석', en: 'Analysis' },
  { value: 'PROOF', ko: '인증', en: 'Proof' },
];

const CATEGORY_LABELS: Record<string, { ko: string; en: string }> = {
  FREE: { ko: '자유토론', en: 'Discussion' },
  INFO: { ko: '정보공유', en: 'Info' },
  QUESTION: { ko: '질문', en: 'Question' },
  STRATEGY: { ko: '전략', en: 'Strategy' },
  ANALYSIS: { ko: '분석', en: 'Analysis' },
  PROOF: { ko: '인증', en: 'Proof' },
};

// 상대 시간 표시 / Relative time display
const timeAgo = formatRelativeTime;

// HTML 태그 제거 유틸 (게시글 미리보기용) / Strip HTML tags utility (for post preview)
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

interface DiscussionsTabProps {
  onPostClick: (postId: string, visibility?: string) => void;
  onWriteClick: () => void;
}

/** 자유게시판 탭 — 게시글 목록, 카테고리 필터, 검색 기능
 * Discussions tab — post list, category filter, search */
export default function DiscussionsTab({ onPostClick, onWriteClick }: DiscussionsTabProps) {
  const { t, locale } = useTranslation();

  // 자유게시판 상태 / Discussion board state
  const [discussionPage, setDiscussionPage] = useState(1);
  const [discussionCategory, setDiscussionCategory] = useState('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // 디바운스 검색 — 300ms 후 쿼리 적용 / Debounced search — applies query after 300ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery(searchInput);
      setDiscussionPage(1);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  const { data: postsData, isLoading: postsLoading } = useCommunityPosts(
    discussionPage,
    discussionCategory !== 'ALL' ? discussionCategory : undefined,
    searchQuery || undefined,
  );

  return (
    <div>
      {/* 카테고리 필터 + 글쓰기 / Category filter + Write button */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap gap-1.5">
          {DISCUSSION_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => { setDiscussionCategory(cat.value); setDiscussionPage(1); }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors',
                discussionCategory === cat.value
                  ? 'bg-accent text-white'
                  : 'bg-bg-tertiary text-text-tertiary hover:text-text-secondary',
              )}
            >
              {locale === 'ko' ? cat.ko : cat.en}
            </button>
          ))}
        </div>
        <button
          onClick={onWriteClick}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent text-white text-[13px] font-semibold hover:bg-accent/90 transition-colors shrink-0"
        >
          <PenSquare className="w-3.5 h-3.5" />
          {t('community.writePost')}
        </button>
      </div>

      {/* 검색 / Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-quaternary" />
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={t('community.post.searchPlaceholder')}
          className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-bg-secondary border border-border/50 text-[13px] text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-accent/50"
        />
        {searchInput && (
          <button onClick={() => setSearchInput('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-text-quaternary hover:text-text-primary transition-colors" aria-label="Clear search">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 게시글 목록 / Post list */}
      {postsLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-bg-secondary/60 border border-border/60 rounded-xl p-4 animate-pulse">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-4 w-16 bg-bg-tertiary rounded" />
                <div className="h-3 w-20 bg-bg-tertiary rounded" />
              </div>
              <div className="h-4 w-3/4 bg-bg-tertiary rounded mb-1" />
              <div className="h-3 w-1/2 bg-bg-tertiary rounded" />
            </div>
          ))}
        </div>
      ) : (postsData?.data && postsData.data.length > 0) ? (
        <div className="space-y-3">
          {postsData.data.map((post) => (
            <div
              key={post.id}
              onClick={() => onPostClick(post.id, post.visibility)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPostClick(post.id, post.visibility); } }}
              role="button"
              tabIndex={0}
              className="bg-bg-secondary/60 border border-border/60 rounded-xl p-4 hover:border-accent/30 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-accent/10 text-accent shrink-0">
                      {CATEGORY_LABELS[post.category]?.[locale] ?? post.category}
                    </span>
                    {/* 회원 전용 잠금 아이콘 / Members-only lock icon */}
                    {post.visibility === 'MEMBERS_ONLY' && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-md bg-warning/10 text-warning shrink-0" title={t('community.membersOnly')}>
                        <Lock className="w-3 h-3" />
                        {t('community.membersOnly')}
                      </span>
                    )}
                    <span className="text-[12px] text-text-quaternary truncate">
                      {post.authorName}
                    </span>
                  </div>
                  <h3 className="text-[14px] font-bold text-text-primary mb-1 line-clamp-1">
                    {post.title}
                  </h3>
                  <p className="text-[12px] text-text-tertiary line-clamp-1 leading-relaxed">
                    {stripHtml(post.content)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/40">
                <span className="flex items-center gap-1 text-[12px] text-text-quaternary">
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span className="tabular-nums">{post._count?.likes ?? post.likeCount ?? 0}</span>
                </span>
                <span className="flex items-center gap-1 text-[12px] text-text-quaternary">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span className="tabular-nums">{post._count?.comments ?? post.commentCount ?? 0}</span>
                </span>
                <span className="flex items-center gap-1 text-[12px] text-text-quaternary">
                  <Eye className="w-3.5 h-3.5" />
                  <span className="tabular-nums">{post.viewCount}</span>
                </span>
                {(post.attachmentCount ?? 0) > 0 && (
                  <span className="flex items-center gap-1 text-[12px] text-text-quaternary">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span className="tabular-nums">{post.attachmentCount}</span>
                  </span>
                )}
                <span className="flex items-center gap-1 text-[12px] text-text-quaternary ml-auto">
                  <Clock className="w-3 h-3" />
                  {timeAgo(post.createdAt, locale)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-24 text-center text-text-quaternary text-[14px]">
          {t('community.post.noPosts')}
        </div>
      )}

      {/* 페이지네이션 / Pagination */}
      {postsData && postsData.totalPages > 1 && (
        <Pagination
          page={discussionPage}
          totalPages={postsData.totalPages}
          total={postsData.total}
          limit={postsData.limit}
          onPageChange={setDiscussionPage}
        />
      )}
    </div>
  );
}
