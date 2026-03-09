/**
 * @file 공지사항 상세 페이지
 * @description 공지사항 내용, 인라인 편집, 삭제, 댓글/답글 기능을 제공하는 페이지
 *
 * @file Announcement Detail Page
 * @description Page for viewing announcement content, inline editing, deletion, and comments/replies
 */
'use client';

import { use, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, Trash2, Reply, Pin, Paperclip, Download, FileText, Heart, Eye, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  useAnnouncementDetail,
  useDeleteAnnouncement,
  useAddComment,
  useDeleteComment,
  useToggleAnnouncementLike,
  useToggleCommentLike,
  useIncrementViewCount,
  useAdjacentAnnouncements,
  useTogglePin,
} from '@/hooks/useAdmin';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/stores/auth';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { cn } from '@/lib/format';
import type { CommentItem } from '@/types';

/** 공지사항 상세 페이지 컴포넌트 — 본문 조회, 좋아요, 댓글/답글, 삭제 기능
 * Announcement detail page component — view content, like, comments/replies, and delete */
export default function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  const { data, isLoading } = useAnnouncementDetail(id);
  const { data: adjacent } = useAdjacentAnnouncements(id);

  const deleteAnnouncement = useDeleteAnnouncement();
  const togglePin = useTogglePin();
  const addComment = useAddComment();
  const deleteComment = useDeleteComment();
  const toggleAnnouncementLike = useToggleAnnouncementLike();
  const toggleCommentLike = useToggleCommentLike();
  const incrementViewCount = useIncrementViewCount();

  /**
   * 조회수 증가 — 세션 기반 쿨다운으로 중복 카운트 방지
   * sessionStorage에 마지막 조회 시간을 저장, 30분 이내 재조회 시 무시
   *
   * View count increment — session-based cooldown prevents duplicate counting
   * Stores last view time in sessionStorage, ignores re-views within 30 minutes
   */
  const viewTracked = useRef(false);
  useEffect(() => {
    if (!id || viewTracked.current) return;
    viewTracked.current = true;
    const VIEW_COOLDOWN = 30 * 60 * 1000; // 30 minutes
    const uid = user?.id || 'anon';
    const storageKey = `announce-viewed-${uid}-${id}`;
    try {
      const lastViewed = sessionStorage.getItem(storageKey);
      if (lastViewed && Date.now() - Number(lastViewed) < VIEW_COOLDOWN) return;
      sessionStorage.setItem(storageKey, String(Date.now()));
    } catch { /* sessionStorage unavailable */ }
    incrementViewCount.mutate(id);
  }, [id, user?.id, incrementViewCount]);

  // Delete announcement modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Comment delete modal
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

  // New comment input
  const [newComment, setNewComment] = useState('');

  // Reply state: maps commentId → reply text; null means no reply box open
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // ─── 권한 체크 / Permissions ─────────────────────────────────────────────────
  const isSystem = user?.role === 'SYSTEM';
  const isAdmin = user?.role === 'ADMIN';
  const isAuthor = data?.author?.id === user?.id;

  // 수정/삭제 권한: SYSTEM은 항상, ADMIN은 본인 작성 글만 / Edit/Delete: SYSTEM always, ADMIN only own posts
  const canEditAnnouncement = isSystem || (isAdmin && isAuthor);

  // Format dates
  /** ISO 날짜를 로컬 날짜+시간 문자열로 변환
   * Convert ISO date to local date+time string */
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
  };

  // Role badge
  /** 역할별 뱃지 CSS 클래스 반환
   * Return badge CSS class by role */
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

  /** 역할 코드를 번역된 라벨로 변환
   * Convert role code to translated label */
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

  // ─── Handlers ────────────────────────────────────────────────────────────────

  /** 바이트를 읽기 쉬운 파일 크기로 변환
   * Convert bytes to human-readable file size */
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  /** 공지사항 삭제 후 목록으로 이동
   * Delete announcement and navigate to list */
  const handleDeleteAnnouncement = async () => {
    try {
      await deleteAnnouncement.mutateAsync(id);
      router.push('/announcements');
    } catch {
      // mutation error state handles feedback
    }
  };

  /** 새 댓글 등록
   * Submit new comment */
  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    try {
      await addComment.mutateAsync({
        announcementId: id,
        content: newComment.trim(),
      });
      setNewComment('');
    } catch {
      // mutation error state handles feedback
    }
  };

  /** 댓글에 대한 답글 등록
   * Submit reply to a comment */
  const handleSubmitReply = async (parentId: string) => {
    if (!replyText.trim()) return;
    try {
      await addComment.mutateAsync({
        announcementId: id,
        content: replyText.trim(),
        parentId,
      });
      setReplyText('');
      setReplyingTo(null);
    } catch {
      // mutation error state handles feedback
    }
  };

  /** 댓글 삭제 처리
   * Handle comment deletion */
  const handleDeleteComment = async () => {
    if (!commentToDelete) return;
    try {
      await deleteComment.mutateAsync(commentToDelete);
      setCommentToDelete(null);
    } catch {
      // mutation error state handles feedback
    }
  };

  // 댓글 삭제 권한: SYSTEM은 모든 댓글, 일반 사용자는 자기 댓글만 / Comment delete: SYSTEM can delete all, others only own comments
  const canDeleteComment = (comment: CommentItem): boolean => {
    if (!user) return false;
    if (isSystem) return true;
    return comment.author.id === user.id;
  };

  /** 답글 입력 토글 — 같은 댓글 클릭 시 닫기
   * Toggle reply input — close if same comment clicked */
  const openReply = (commentId: string) => {
    if (replyingTo === commentId) {
      setReplyingTo(null);
      setReplyText('');
    } else {
      setReplyingTo(commentId);
      setReplyText('');
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="pb-24">
      {/* Back button + title */}
      <div className="flex items-center gap-3 py-6 h-[88px]">
        <Link
          href="/announcements"
          className="flex items-center justify-center w-8 h-8 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-[20px] font-extrabold text-text-primary">
          {t('announce.detail')}
        </h1>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="py-20 text-center text-text-quaternary text-[14px]">
          {t('common.loading')}
        </div>
      )}

      {/* Not found */}
      {!isLoading && !data && (
        <div className="py-20 text-center text-text-quaternary text-[14px]">
          {t('common.noData')}
        </div>
      )}

      {data && (
        <div className="flex flex-col gap-5">

          {/* ── Announcement body ─────────────────────────────────────────── */}
          <div className="bg-bg-secondary rounded-2xl p-5">
                {/* Title row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h2 className="text-[18px] font-bold text-text-primary leading-snug flex-1">
                    {data.title}
                  </h2>

                  {/* Edit / Pin / Delete buttons */}
                  {canEditAnnouncement && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => togglePin.mutate(id)}
                        disabled={togglePin.isPending}
                        className={cn(
                          'flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors',
                          data.isPinned
                            ? 'text-accent border-accent/30 bg-accent/10 hover:bg-accent/20'
                            : 'text-text-secondary border-border hover:bg-bg-tertiary hover:text-text-primary',
                        )}
                      >
                        <Pin className="w-3 h-3 rotate-45" />
                        {data.isPinned ? t('announce.unpin') : t('announce.pin')}
                      </button>
                      <Link
                        href={`/announcements/${id}/edit`}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-text-secondary border border-border hover:bg-bg-tertiary hover:text-text-primary transition-colors"
                      >
                        <Pencil className="w-3 h-3" />
                        {t('announce.edit')}
                      </Link>
                      <button
                        onClick={() => setShowDeleteModal(true)}
                        className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-danger border border-danger/30 hover:bg-danger/10 transition-colors"
                      >
                        {t('announce.delete')}
                      </button>
                    </div>
                  )}
                </div>

                {/* Pinned badge */}
                {data.isPinned && (
                  <div className="flex items-center gap-1.5 mb-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-accent/15 text-accent border border-accent/20">
                      <Pin className="w-3 h-3 rotate-45" />
                      {t('announce.pinned')}
                    </span>
                  </div>
                )}

                {/* Author info + date */}
                <div className="flex flex-col gap-1.5 mb-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'text-[11px] font-semibold px-1.5 py-0.5 rounded',
                        getRoleBadgeClass(data.author.role),
                      )}
                    >
                      {getRoleLabel(data.author.role)}
                    </span>
                    <span className="text-[13px] text-text-secondary font-medium">
                      {data.author.name}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 text-[12px] text-text-quaternary">
                    <span>{t('announce.createdDate')} {formatDate(data.createdAt)}</span>
                    {data.editedAt && (
                      <span>{t('announce.editedDate')} {formatDate(data.editedAt)}</span>
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-border/50 mb-4" />

                {/* Content */}
                <p className="text-[14px] text-text-primary leading-relaxed whitespace-pre-wrap">
                  {data.content}
                </p>

                {/* Like & View counts */}
                <div className="flex items-center gap-4 mt-5 pt-4 border-t border-border/50">
                  <button
                    onClick={() => toggleAnnouncementLike.mutate(id)}
                    disabled={!user || toggleAnnouncementLike.isPending}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors',
                      data.isLiked
                        ? 'text-red-400 bg-red-500/10 border border-red-500/20'
                        : 'text-text-tertiary hover:text-red-400 hover:bg-red-500/10 border border-border',
                      !user && 'opacity-50 cursor-not-allowed',
                    )}
                  >
                    <Heart className={cn('w-4 h-4', data.isLiked && 'fill-red-400')} />
                    {t('announce.like')} {data.likeCount > 0 && data.likeCount}
                  </button>
                  <div className="flex items-center gap-1.5 text-text-quaternary text-[13px]">
                    <Eye className="w-4 h-4" />
                    {data.viewCount ?? 0}
                  </div>
                </div>

                {/* Attachments */}
                {data.attachments?.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-border/50">
                    <div className="flex items-center gap-1.5 mb-3">
                      <Paperclip className="w-4 h-4 text-text-tertiary" />
                      <h4 className="text-[13px] font-semibold text-text-tertiary">
                        {t('announce.attachments')}
                      </h4>
                      <span className="text-[12px] text-text-quaternary">{data.attachments.length}</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {data.attachments.map((att) => (
                        <div key={att.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-bg-primary border border-border/50">
                          <FileText className="w-4 h-4 text-text-quaternary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] text-text-primary font-medium truncate">{att.originalName}</p>
                            <p className="text-[11px] text-text-quaternary">{formatFileSize(att.size)}</p>
                          </div>
                          <a
                            href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/announcements/uploads/${att.fileName}`}
                            download={att.originalName}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-text-quaternary hover:text-accent hover:bg-accent/10 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
          </div>

          {/* ── Comments section ──────────────────────────────────────────── */}
          <div className="bg-bg-secondary rounded-2xl p-5">
            {/* Comments header */}
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-4 h-4 text-text-tertiary" />
              <h3 className="text-[14px] font-bold text-text-tertiary uppercase tracking-wide">
                {t('announce.comments')}
              </h3>
              <span className="text-[13px] text-text-quaternary font-medium">
                {data.comments.length}
              </span>
            </div>

            {/* Comment list */}
            {data.comments.length === 0 ? (
              <p className="py-6 text-center text-text-quaternary text-[13px]">
                {t('announce.noComments')}
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-border/40">
                {data.comments.map((comment) => (
                  <div key={comment.id} className="py-4">
                    {/* Top-level comment */}
                    <div className="flex flex-col gap-2">
                      {/* Author row */}
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'text-[10px] font-semibold px-1.5 py-0.5 rounded',
                            getRoleBadgeClass(comment.author.role),
                          )}
                        >
                          {getRoleLabel(comment.author.role)}
                        </span>
                        <span className="text-[13px] text-text-secondary font-medium">
                          {comment.author.name}
                        </span>
                        <span className="text-text-quaternary text-[11px]">·</span>
                        <span className="text-[11px] text-text-quaternary">
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>

                      {/* Content */}
                      <p className="text-[13px] text-text-primary leading-relaxed whitespace-pre-wrap">
                        {comment.content}
                      </p>

                      {/* Actions: Like + Reply + Delete */}
                      <div className="flex items-center gap-3 mt-0.5">
                        <button
                          onClick={() => user && toggleCommentLike.mutate(comment.id)}
                          disabled={!user || toggleCommentLike.isPending}
                          className={cn(
                            'flex items-center gap-1 text-[12px] transition-colors',
                            comment.isLiked
                              ? 'text-red-400'
                              : 'text-text-quaternary hover:text-red-400',
                            !user && 'opacity-50 cursor-not-allowed',
                          )}
                        >
                          <Heart className={cn('w-3.5 h-3.5', comment.isLiked && 'fill-red-400')} />
                          {comment.likeCount > 0 && comment.likeCount}
                        </button>
                        {user && (
                          <button
                            onClick={() => openReply(comment.id)}
                            className="flex items-center gap-1 text-[12px] text-text-quaternary hover:text-accent transition-colors"
                          >
                            <Reply className="w-3.5 h-3.5" />
                            {t('announce.reply')}
                          </button>
                        )}
                        {canDeleteComment(comment) && (
                          <button
                            onClick={() => setCommentToDelete(comment.id)}
                            className="flex items-center gap-1 text-[12px] text-text-quaternary hover:text-danger transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {t('announce.deleteComment')}
                          </button>
                        )}
                      </div>

                      {/* Inline reply input */}
                      {replyingTo === comment.id && (
                        <div className="mt-2 flex gap-2">
                          <input
                            type="text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmitReply(comment.id);
                              }
                            }}
                            placeholder={t('announce.replyPlaceholder')}
                            className={cn(
                              'flex-1 px-3 py-2 rounded-xl text-[13px]',
                              'bg-bg-primary border border-border',
                              'text-text-primary placeholder:text-text-quaternary',
                              'focus:outline-none focus:border-accent transition-colors',
                            )}
                          />
                          <button
                            onClick={() => handleSubmitReply(comment.id)}
                            disabled={addComment.isPending || !replyText.trim()}
                            className="px-3.5 py-2 rounded-xl bg-accent hover:bg-accent/90 text-white text-[12px] font-semibold transition-colors disabled:opacity-50 shrink-0"
                          >
                            {addComment.isPending ? '...' : t('announce.commentSubmit')}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Nested replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="mt-3 flex flex-col gap-3 pl-4 border-l-2 border-border/50">
                        {comment.replies.map((reply) => (
                          <div key={reply.id} className="flex flex-col gap-1.5">
                            {/* Reply author row */}
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  'text-[10px] font-semibold px-1.5 py-0.5 rounded',
                                  getRoleBadgeClass(reply.author.role),
                                )}
                              >
                                {getRoleLabel(reply.author.role)}
                              </span>
                              <span className="text-[13px] text-text-secondary font-medium">
                                {reply.author.name}
                              </span>
                              <span className="text-text-quaternary text-[11px]">·</span>
                              <span className="text-[11px] text-text-quaternary">
                                {formatDate(reply.createdAt)}
                              </span>
                            </div>

                            {/* Reply content */}
                            <p className="text-[13px] text-text-primary leading-relaxed whitespace-pre-wrap">
                              {reply.content}
                            </p>

                            {/* Reply actions: Like + Delete */}
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => user && toggleCommentLike.mutate(reply.id)}
                                disabled={!user || toggleCommentLike.isPending}
                                className={cn(
                                  'flex items-center gap-1 text-[12px] transition-colors',
                                  reply.isLiked
                                    ? 'text-red-400'
                                    : 'text-text-quaternary hover:text-red-400',
                                  !user && 'opacity-50 cursor-not-allowed',
                                )}
                              >
                                <Heart className={cn('w-3.5 h-3.5', reply.isLiked && 'fill-red-400')} />
                                {reply.likeCount > 0 && reply.likeCount}
                              </button>
                              {canDeleteComment(reply) && (
                                <button
                                  onClick={() => setCommentToDelete(reply.id)}
                                  className="flex items-center gap-1 text-[12px] text-text-quaternary hover:text-danger transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  {t('announce.deleteComment')}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── New comment input ──────────────────────────────────────── */}
            {user && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmitComment();
                      }
                    }}
                    placeholder={t('announce.commentPlaceholder')}
                    className={cn(
                      'flex-1 px-3 py-2.5 rounded-xl text-[13px]',
                      'bg-bg-primary border border-border',
                      'text-text-primary placeholder:text-text-quaternary',
                      'focus:outline-none focus:border-accent transition-colors',
                    )}
                  />
                  <button
                    onClick={handleSubmitComment}
                    disabled={addComment.isPending || !newComment.trim()}
                    className="px-4 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white text-[13px] font-semibold transition-colors disabled:opacity-50 shrink-0"
                  >
                    {addComment.isPending ? '...' : t('announce.commentSubmit')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── 이전/다음 공지 네비게이션 — 작성 시간 기준 인접 글 / Prev/Next navigation — adjacent posts by creation time ── */}
          {adjacent && (adjacent.prev || adjacent.next) && (
            <div className="bg-bg-secondary rounded-2xl border border-border/50 divide-y divide-border/40 overflow-hidden">
              {adjacent.next && (
                <Link
                  href={`/announcements/${adjacent.next.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-bg-tertiary/50 transition-colors group"
                >
                  <div className="flex items-center gap-1.5 shrink-0 text-text-quaternary">
                    <ChevronLeft className="w-4 h-4" />
                    <span className="text-[12px] font-semibold w-[42px]">{t('announce.nextPost')}</span>
                  </div>
                  <span className="text-[13px] text-text-secondary group-hover:text-text-primary transition-colors truncate">
                    {adjacent.next.title}
                  </span>
                </Link>
              )}
              {adjacent.prev && (
                <Link
                  href={`/announcements/${adjacent.prev.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-bg-tertiary/50 transition-colors group"
                >
                  <div className="flex items-center gap-1.5 shrink-0 text-text-quaternary">
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-[12px] font-semibold w-[42px]">{t('announce.prevPost')}</span>
                  </div>
                  <span className="text-[13px] text-text-secondary group-hover:text-text-primary transition-colors truncate">
                    {adjacent.prev.title}
                  </span>
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      {/* Delete announcement confirm modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAnnouncement}
        title={t('announce.delete')}
        message={t('announce.deleteConfirm')}
        confirmLabel={t('announce.delete')}
        cancelLabel={t('modal.cancel')}
        confirmVariant="danger"
        loading={deleteAnnouncement.isPending}
      />

      {/* Delete comment confirm modal */}
      <ConfirmModal
        isOpen={!!commentToDelete}
        onClose={() => setCommentToDelete(null)}
        onConfirm={handleDeleteComment}
        title={t('announce.deleteCommentTitle')}
        message={t('announce.deleteCommentConfirm')}
        confirmLabel={t('announce.deleteCommentTitle')}
        cancelLabel={t('modal.cancel')}
        confirmVariant="danger"
        loading={deleteComment.isPending}
      />

    </div>
  );
}
