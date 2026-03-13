/**
 * @file 전략 상세 페이지
 * @description 전략 내용, 좋아요, 댓글 (대댓글 포함)을 보여주는 상세 페이지
 *
 * @file Strategy Detail Page
 * @description Detail page showing strategy content, likes, and comments (with nested replies)
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useAuthStore } from '@/stores/auth';
import { useTranslation } from '@/hooks/useTranslation';
import {
  useStrategy,
  useDeleteStrategy,
  useLikeStrategy,
  useCreateStrategyComment,
  useDeleteStrategyComment,
} from '@/hooks/useStrategy';
import api from '@/lib/api';
import { cn } from '@/lib/format';
import type { StrategyComment } from '@/types';
import {
  ArrowLeft,
  Heart,
  MessageSquare,
  Eye,
  Clock,
  Trash2,
  Send,
  Pencil,
  TrendingUp,
} from 'lucide-react';

// 상대 시간 표시 유틸 (분/시간/일) / Relative time display utility (min/hour/day)
function timeAgo(dateStr: string, locale: 'ko' | 'en'): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return locale === 'ko' ? '방금 전' : 'just now';
  if (mins < 60) return locale === 'ko' ? `${mins}분 전` : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return locale === 'ko' ? `${hours}시간 전` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return locale === 'ko' ? `${days}일 전` : `${days}d ago`;
}

/**
 * 댓글 아이템 컴포넌트 — 삭제, 답글(재귀적) 지원
 * Comment item component — supports delete and recursive replies
 */
function StrategyCommentItem({
  comment,
  strategyId,
  userId,
  userRole,
  locale,
  t,
}: {
  comment: StrategyComment;
  strategyId: string;
  userId?: string;
  userRole?: string;
  locale: 'ko' | 'en';
  t: (key: string) => string;
}) {
  const deleteComment = useDeleteStrategyComment();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const isAuthor = userId === comment.authorId;
  const isAdmin = userRole === 'ADMIN' || userRole === 'SYSTEM';

  return (
    <div className="py-3 border-b border-border/30 last:border-b-0">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-6 h-6 rounded-full bg-accent/15 flex items-center justify-center text-[10px] font-bold text-accent shrink-0">
          {comment.authorName.charAt(0).toUpperCase()}
        </div>
        <span className="text-[12px] font-semibold text-text-secondary">{comment.authorName}</span>
        <span className="text-[11px] text-text-quaternary">{timeAgo(comment.createdAt, locale)}</span>
      </div>
      <p className="text-[13px] text-text-primary ml-8 mb-2 whitespace-pre-wrap">{comment.content}</p>
      <div className="flex items-center gap-3 ml-8">
        {(isAuthor || isAdmin) && (
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-1 text-[11px] text-text-quaternary hover:text-rise transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
      {/* 대댓글 재귀 렌더링 / Recursive reply rendering */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-8 mt-2 pl-3 border-l-2 border-border/30">
          {comment.replies.map((reply) => (
            <StrategyCommentItem
              key={reply.id}
              comment={reply}
              strategyId={strategyId}
              userId={userId}
              userRole={userRole}
              locale={locale}
              t={t}
            />
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => { deleteComment.mutate({ commentId: comment.id, strategyId }); setShowDeleteModal(false); }}
        title={locale === 'ko' ? '댓글 삭제' : 'Delete Comment'}
        message={t('strategy.deleteCommentConfirm')}
        confirmVariant="danger"
        loading={deleteComment.isPending}
      />
    </div>
  );
}

/** 전략 상세 페이지 컴포넌트 — 본문, 좋아요, 댓글
 * Strategy detail page component — content, likes, and comments */
export default function StrategyDetailPage() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const user = useAuthStore((s) => s.user);
  const { data: strategy, isLoading } = useStrategy(id);
  const deleteStrategy = useDeleteStrategy();
  const likeStrategy = useLikeStrategy();
  const createComment = useCreateStrategyComment();
  const [commentText, setCommentText] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // 동적 페이지 타이틀 — SEO 및 브라우저 탭 제목 개선 / Dynamic page title for SEO and browser tab
  useEffect(() => {
    if (strategy?.title) {
      document.title = `${strategy.title} | VirtuEx`;
    }
    return () => { document.title = 'VirtuEx'; };
  }, [strategy?.title]);

  /**
   * 조회수 증가 — 세션당 사용자별 1회, 30분 쿨다운으로 어뷰징 방지
   * View count increment — once per session per user, 30-min cooldown to prevent abuse
   */
  const viewTracked = useRef(false);
  useEffect(() => {
    if (!id || viewTracked.current) return;
    viewTracked.current = true;
    const VIEW_COOLDOWN = 30 * 60 * 1000;
    const uid = user?.id || 'anon';
    const storageKey = `strategy-viewed-${uid}-${id}`;
    try {
      const lastViewed = sessionStorage.getItem(storageKey);
      if (lastViewed && Date.now() - Number(lastViewed) < VIEW_COOLDOWN) return;
      sessionStorage.setItem(storageKey, String(Date.now()));
    } catch { /* sessionStorage unavailable */ }
    api.post(`/api/strategies/${id}/view`).catch(() => {});
  }, [id, user?.id]);

  // 권한 계산 — 작성자 또는 관리자만 수정/삭제 가능 / Permission check — only author or admin can edit/delete
  const isAuthor = user?.id === strategy?.authorId;
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SYSTEM';

  /** 전략 삭제 후 커뮤니티 목록으로 이동
   * Delete strategy and navigate to community list */
  const handleDelete = async () => {
    setShowDeleteModal(false);
    try {
      await deleteStrategy.mutateAsync(id);
      router.push('/community?tab=strategies');
    } catch {
      // 삭제 실패 시 사용자에게 알림 / Notify user on delete failure
      alert(locale === 'ko' ? '전략 삭제에 실패했습니다.' : 'Failed to delete strategy.');
    }
  };

  /** 새 댓글 등록
   * Submit new comment */
  const handleComment = async () => {
    if (!commentText.trim()) return;
    await createComment.mutateAsync({ strategyId: id, content: commentText.trim() });
    setCommentText('');
  };

  // 최상위 댓글만 추출 (답글은 StrategyCommentItem 내부에서 재귀 렌더링)
  // Extract top-level comments (replies rendered recursively inside StrategyCommentItem)
  const topComments = (strategy?.comments ?? []).filter((c) => !c.parentId);

  if (isLoading) {
    return (
      <div className="py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 bg-bg-tertiary rounded" />
          <div className="h-4 w-full bg-bg-tertiary rounded" />
          <div className="h-4 w-3/4 bg-bg-tertiary rounded" />
          <div className="h-32 w-full bg-bg-tertiary rounded" />
        </div>
      </div>
    );
  }

  if (!strategy) {
    return (
      <div className="py-24 text-center text-text-quaternary">
        {t('strategy.notFound')}
      </div>
    );
  }

  return (
    <div className="pb-16">
      {/* 뒤로 가기 + 제목 / Back button + title */}
      <div className="py-6 flex items-center gap-3 h-[88px]">
        <Link href="/community?tab=strategies" className="flex items-center justify-center w-8 h-8 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-[20px] font-extrabold text-text-primary">
          {t('strategy.detail')}
        </h1>
      </div>

      {/* 전략 내용 / Strategy content */}
      <div className="bg-bg-secondary/60 border border-border/60 rounded-2xl p-5 sm:p-6 mb-6">
        {/* 종목 배지 / Symbol badge */}
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-accent/10 text-accent">
            {strategy.symbol}
          </span>
          {strategy.performance != null && (
            <span
              className={cn(
                'flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-md tabular-nums',
                strategy.performance >= 0
                  ? 'bg-rise/10 text-rise'
                  : 'bg-fall/10 text-fall',
              )}
            >
              <TrendingUp className="w-3 h-3" />
              {strategy.performance >= 0 ? '+' : ''}{strategy.performance}%
            </span>
          )}
        </div>

        <h1 className="text-[18px] sm:text-[20px] font-bold text-text-primary mb-4">{strategy.title}</h1>

        {/* 작성자 + 날짜 / Author + date */}
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border/40">
          <div className="w-8 h-8 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0">
            <span className="text-[12px] font-bold text-accent">{strategy.authorName.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <span className="text-[13px] font-semibold text-text-primary">{strategy.authorName}</span>
            <div className="flex items-center gap-3 text-[11px] text-text-quaternary">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(strategy.createdAt, locale)}</span>
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{strategy.viewCount}</span>
            </div>
          </div>
          {(isAuthor || isAdmin) && (
            <div className="ml-auto flex items-center gap-1.5 shrink-0">
              {isAuthor && (
                <Link
                  href={`/community/strategy/new?edit=${id}`}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-text-secondary border border-border hover:bg-bg-tertiary hover:text-text-primary transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  {t('strategy.edit')}
                </Link>
              )}
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-danger border border-danger/30 hover:bg-danger/10 transition-colors"
              >
                {t('strategy.delete')}
              </button>
            </div>
          )}
        </div>

        {/* 전략 설명 (plain text) / Strategy description (plain text) */}
        <div className="text-[14px] text-text-secondary leading-relaxed min-h-[100px] whitespace-pre-wrap">
          {strategy.description}
        </div>

        {/* 좋아요 + 통계 / Like + Stats */}
        <div className="flex items-center gap-4 mt-6 pt-4 border-t border-border/40">
          <button
            onClick={() => likeStrategy.mutate(id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors',
              strategy.liked ? 'bg-rise/15 text-rise' : 'bg-bg-tertiary text-text-secondary hover:bg-bg-quaternary',
            )}
          >
            <Heart className={cn('w-4 h-4', strategy.liked && 'fill-rise')} />
            <span className="tabular-nums">{strategy.likeCount}</span>
          </button>
          <span className="flex items-center gap-1.5 text-[13px] text-text-tertiary">
            <MessageSquare className="w-4 h-4" />
            <span className="tabular-nums">{strategy.commentCount}</span>
          </span>
        </div>
      </div>

      {/* 댓글 섹션 / Comments section */}
      <div className="bg-bg-secondary/60 border border-border/60 rounded-2xl p-5 sm:p-6">
        <h2 className="text-[15px] font-bold text-text-primary mb-4">
          {t('strategy.comments')} ({strategy.commentCount})
        </h2>

        {user && (
          <div className="flex gap-2 mb-4">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
              placeholder={t('strategy.commentPlaceholder')}
              className="flex-1 px-3 py-2.5 rounded-xl bg-bg-tertiary border border-border/50 text-[13px] text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-accent/50"
            />
            <button
              onClick={handleComment}
              disabled={!commentText.trim() || createComment.isPending}
              className="px-4 py-2.5 rounded-xl bg-accent text-white text-[13px] font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {createComment.isPending ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        )}

        {topComments.length > 0 ? (
          <div>
            {topComments.map((comment) => (
              <StrategyCommentItem
                key={comment.id}
                comment={comment}
                strategyId={id}
                userId={user?.id}
                userRole={user?.role}
                locale={locale}
                t={t as (key: string) => string}
              />
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-text-quaternary text-center py-6">
            {t('strategy.noComments')}
          </p>
        )}
      </div>

      {/* 전략 삭제 확인 모달 / Delete Strategy Confirm Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title={locale === 'ko' ? '전략 삭제' : 'Delete Strategy'}
        message={t('strategy.deleteConfirm')}
        confirmVariant="danger"
        loading={deleteStrategy.isPending}
      />
    </div>
  );
}
