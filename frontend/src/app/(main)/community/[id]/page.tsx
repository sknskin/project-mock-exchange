/**
 * @file 커뮤니티 게시글 상세 페이지
 * @description 게시글 내용 (HTML), 첨부파일, 좋아요, 댓글, ConfirmModal 적용
 *
 * @file Community Post Detail Page
 * @description Post content (HTML from TipTap), attachments, likes, comments with ConfirmModal
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DOMPurify from 'isomorphic-dompurify';
import api from '@/lib/api';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useAuthStore } from '@/stores/auth';
import { useTranslation } from '@/hooks/useTranslation';
import {
  useCommunityPost,
  useDeletePost,
  useLikePost,
  useCreateComment,
  useDeleteComment,
  useLikeComment,
  useDeleteCommunityAttachment,
} from '@/hooks/useCommunity';
import type { CommunityComment, CommunityAttachment } from '@/hooks/useCommunity';
import { cn, formatRelativeTime } from '@/lib/format';
import LoginRequiredModal from '@/components/ui/LoginRequiredModal';
import {
  ArrowLeft,
  Heart,
  MessageSquare,
  Eye,
  Clock,
  Trash2,
  Send,
  ThumbsUp,
  Paperclip,
  Download,
  Pencil,
} from 'lucide-react';

// 카테고리별 한/영 라벨 매핑 / Category label mapping (Korean/English)
const CATEGORIES: Record<string, { ko: string; en: string }> = {
  FREE: { ko: '자유토론', en: 'Discussion' },
  INFO: { ko: '정보공유', en: 'Info' },
  QUESTION: { ko: '질문', en: 'Question' },
  STRATEGY: { ko: '전략', en: 'Strategy' },
  ANALYSIS: { ko: '분석', en: 'Analysis' },
  PROOF: { ko: '인증', en: 'Proof' },
};

// 상대 시간 표시 — 공유 유틸 사용 / Relative time display — uses shared utility
const timeAgo = formatRelativeTime;

// 파일 크기 포맷 유틸 (B/KB/MB) / File size formatting utility
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * 댓글 아이템 컴포넌트 — 좋아요, 삭제, 답글(재귀적) 지원
 * Comment item component — supports likes, delete, and recursive replies
 */
function CommentItem({
  comment,
  postId,
  userId,
  userRole,
  locale,
  t,
}: {
  comment: CommunityComment;
  postId: string;
  userId?: string;
  userRole?: string;
  locale: 'ko' | 'en';
  t: (key: string) => string;
}) {
  const deleteComment = useDeleteComment();
  const likeComment = useLikeComment();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const isAuthor = userId === comment.authorId;
  const isAdmin = userRole === 'ADMIN' || userRole === 'SYSTEM';
  const likeCount = comment._count?.likes ?? comment.likeCount ?? 0;

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
        <button
          onClick={() => likeComment.mutate({ commentId: comment.id, postId })}
          className="flex items-center gap-1 text-[11px] text-text-quaternary hover:text-accent transition-colors"
        >
          <ThumbsUp className={cn('w-3 h-3', comment.liked && 'fill-accent text-accent')} />
          <span className="tabular-nums">{likeCount}</span>
        </button>
        {(isAuthor || isAdmin) && (
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-1 text-[11px] text-text-quaternary hover:text-rise transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-8 mt-2 pl-3 border-l-2 border-border/30">
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} postId={postId} userId={userId} userRole={userRole} locale={locale} t={t} />
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => { deleteComment.mutate({ commentId: comment.id, postId }); setShowDeleteModal(false); }}
        title={locale === 'ko' ? '댓글 삭제' : 'Delete Comment'}
        message={t('community.post.deleteCommentConfirm')}
        confirmVariant="danger"
        loading={deleteComment.isPending}
      />
    </div>
  );
}

/**
 * 첨부파일 섹션 — 파일 다운로드 + 작성자/관리자 삭제 지원
 * Attachment section — file download + author/admin delete support
 */
function AttachmentSection({
  attachments,
  postId,
  canDelete,
  locale: _locale,
  t,
}: {
  attachments: CommunityAttachment[];
  postId: string;
  canDelete: boolean;
  locale: 'ko' | 'en';
  t: (key: string) => string;
}) {
  const deleteAttachment = useDeleteCommunityAttachment();

  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="mt-6 pt-4 border-t border-border/40">
      <h3 className="text-[13px] font-semibold text-text-secondary mb-3 flex items-center gap-1.5">
        <Paperclip className="w-3.5 h-3.5" />
        {t('community.post.attachments')} ({attachments.length})
      </h3>
      <div className="space-y-2">
        {attachments.map((att) => (
          <div key={att.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-bg-tertiary/60 border border-border/40">
            <div className="flex items-center gap-2 min-w-0">
              <Paperclip className="w-3.5 h-3.5 text-text-quaternary shrink-0" />
              <span className="text-[12px] text-text-secondary truncate">{att.originalName}</span>
              <span className="text-[11px] text-text-quaternary shrink-0">({formatFileSize(att.size)})</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href={`/api/community/uploads/${att.fileName}`}
                download={att.originalName}
                className="p-1.5 rounded-md text-text-quaternary hover:text-accent hover:bg-accent/10 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
              {canDelete && (
                <button
                  onClick={() => deleteAttachment.mutate({ attachmentId: att.id, postId })}
                  className="p-1.5 rounded-md text-text-quaternary hover:text-rise hover:bg-rise/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 커뮤니티 게시글 상세 페이지 컴포넌트 — 본문, 좋아요, 댓글, 첨부파일
 * Community post detail page component — content, likes, comments, and attachments */
export default function CommunityPostDetailPage() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const user = useAuthStore((s) => s.user);
  const { data: post, isLoading } = useCommunityPost(id);
  const deletePost = useDeletePost();
  const likePost = useLikePost();
  const createComment = useCreateComment();
  const [commentText, setCommentText] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  /**
   * 조회수 증가 — 세션당 사용자별 1회, 30분 쿨다운으로 어뷰징 방지
   * View count increment — once per session per user, 30-min cooldown to prevent abuse
   */
  // 동적 페이지 타이틀 — SEO 및 브라우저 탭 제목 개선 / Dynamic page title for SEO and browser tab
  useEffect(() => {
    if (post?.title) {
      document.title = `${post.title} | VirtuEx`;
    }
    return () => { document.title = 'VirtuEx'; };
  }, [post?.title]);

  const viewTracked = useRef(false);
  useEffect(() => {
    if (!id || viewTracked.current) return;
    viewTracked.current = true;
    const VIEW_COOLDOWN = 30 * 60 * 1000;
    const uid = user?.id || 'anon';
    const storageKey = `community-viewed-${uid}-${id}`;
    try {
      const lastViewed = sessionStorage.getItem(storageKey);
      if (lastViewed && Date.now() - Number(lastViewed) < VIEW_COOLDOWN) return;
      sessionStorage.setItem(storageKey, String(Date.now()));
    } catch { /* sessionStorage unavailable */ }
    api.post(`/api/community/posts/${id}/view`).catch(() => {});
  }, [id, user?.id]);

  // 권한 계산 — 작성자 또는 관리자만 수정/삭제 가능 / Permission check — only author or admin can edit/delete
  const isAuthor = user?.id === post?.authorId;
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SYSTEM';
  // 좋아요/댓글 수 — Prisma _count 또는 별도 필드 대응 / Like/comment counts — handles Prisma _count or separate fields
  const likeCount = post?._count?.likes ?? post?.likeCount ?? 0;
  const commentCount = post?._count?.comments ?? post?.commentCount ?? 0;
  const catLabel = CATEGORIES[post?.category ?? 'FREE']?.[locale] ?? post?.category;

  /** 게시글 삭제 후 커뮤니티 목록으로 이동
   * Delete post and navigate to community list */
  const handleDelete = async () => {
    setShowDeleteModal(false);
    try {
      await deletePost.mutateAsync(id);
      router.push('/community');
    } catch {
      // 삭제 실패 시 사용자에게 알림 / Notify user on delete failure
      alert(locale === 'ko' ? '게시글 삭제에 실패했습니다.' : 'Failed to delete post.');
    }
  };

  /** 새 댓글 등록
   * Submit new comment */
  const handleComment = async () => {
    if (!commentText.trim()) return;
    await createComment.mutateAsync({ postId: id, content: commentText.trim() });
    setCommentText('');
  };

  // 최상위 댓글만 추출 (답글은 CommentItem 내부에서 재귀 렌더링) / Extract top-level comments (replies rendered recursively inside CommentItem)
  const topComments = (post?.comments ?? []).filter((c) => !c.parentId);

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

  if (!post) {
    return (
        <div className="py-24 text-center text-text-quaternary">
          {t('community.post.notFound')}
        </div>
    );
  }

  // MEMBERS_ONLY 게시글에 비로그인 사용자 접근 시 로그인 모달 표시
  // Show login modal when unauthenticated user accesses a MEMBERS_ONLY post
  if (post.visibility === 'MEMBERS_ONLY' && !user) {
    return (
      <div className="py-24 text-center text-text-quaternary">
        <p className="text-[14px] mb-4">{t('community.membersOnlyPost')}</p>
        <button
          onClick={() => setShowLoginModal(true)}
          className="px-4 py-2 rounded-xl bg-accent text-white text-[14px] font-semibold hover:bg-accent/90 transition-colors"
        >
          {t('nav.login')}
        </button>
        <LoginRequiredModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          message={t('community.membersOnlyPost')}
        />
      </div>
    );
  }

  return (
      <div className="pb-16">
        {/* Back button + title */}
        <div className="py-6 flex items-center gap-3 h-[88px]">
          <Link href="/community" className="flex items-center justify-center w-8 h-8 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-[20px] font-extrabold text-text-primary">
            {t('community.discussions')} {locale === 'ko' ? '상세' : 'Detail'}
          </h1>
        </div>

        {/* Post content */}
        <div className="bg-bg-secondary/60 border border-border/60 rounded-2xl p-5 sm:p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-accent/10 text-accent">
              {catLabel}
            </span>
          </div>

          <h1 className="text-[18px] sm:text-[20px] font-bold text-text-primary mb-4">{post.title}</h1>

          {/* Author + date */}
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border/40">
            <div className="w-8 h-8 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0">
              <span className="text-[12px] font-bold text-accent">{post.authorName.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <span className="text-[13px] font-semibold text-text-primary">{post.authorName}</span>
              <div className="flex items-center gap-3 text-[11px] text-text-quaternary">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(post.createdAt, locale)}</span>
                <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{post.viewCount}</span>
              </div>
            </div>
            {(isAuthor || isAdmin) && (
              <div className="ml-auto flex items-center gap-1.5 shrink-0">
                {isAuthor && (
                  <Link
                    href={`/community/new?edit=${id}`}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-text-secondary border border-border hover:bg-bg-tertiary hover:text-text-primary transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                    {t('community.post.update')}
                  </Link>
                )}
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-danger border border-danger/30 hover:bg-danger/10 transition-colors"
                >
                  {t('common.delete')}
                </button>
              </div>
            )}
          </div>

          {/* Content — render as HTML from TipTap */}
          <div
            className="prose prose-sm prose-invert max-w-none text-[14px] text-text-secondary leading-relaxed min-h-[100px]"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content, { ALLOWED_TAGS: ['p','br','strong','em','u','s','h1','h2','h3','h4','ul','ol','li','blockquote','a','code','pre','span','div','hr'], ALLOWED_ATTR: ['href','alt','class','target','rel'], FORBID_ATTR: ['onerror','onload','onclick','onmouseover','src'], ALLOW_DATA_ATTR: false, ALLOW_UNKNOWN_PROTOCOLS: false, ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):)/i }) }}
          />

          {/* Attachments */}
          <AttachmentSection
            attachments={post.attachments ?? []}
            postId={id}
            canDelete={isAuthor || isAdmin}
            locale={locale}
            t={t as (key: string) => string}
          />

          {/* Like + Stats */}
          <div className="flex items-center gap-4 mt-6 pt-4 border-t border-border/40">
            <button
              onClick={() => likePost.mutate(id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors',
                post.liked ? 'bg-rise/15 text-rise' : 'bg-bg-tertiary text-text-secondary hover:bg-bg-quaternary',
              )}
            >
              <Heart className={cn('w-4 h-4', post.liked && 'fill-rise')} />
              <span className="tabular-nums">{likeCount}</span>
            </button>
            <span className="flex items-center gap-1.5 text-[13px] text-text-tertiary">
              <MessageSquare className="w-4 h-4" />
              <span className="tabular-nums">{commentCount}</span>
            </span>
          </div>
        </div>

        {/* Comments section */}
        <div className="bg-bg-secondary/60 border border-border/60 rounded-2xl p-5 sm:p-6">
          <h2 className="text-[15px] font-bold text-text-primary mb-4">
            {t('community.post.comments')} ({commentCount})
          </h2>

          {user && (
            <div className="flex gap-2 mb-4">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
                placeholder={t('community.post.commentPlaceholder')}
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
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  postId={id}
                  userId={user?.id}
                  userRole={user?.role}
                  locale={locale}
                  t={t as (key: string) => string}
                />
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-text-quaternary text-center py-6">
              {t('community.post.noComments')}
            </p>
          )}
        </div>

        {/* Delete Post Confirm Modal */}
        <ConfirmModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title={locale === 'ko' ? '게시글 삭제' : 'Delete Post'}
          message={t('community.post.deleteConfirm')}
          confirmVariant="danger"
          loading={deletePost.isPending}
        />
      </div>
  );
}
