/**
 * @file 공지사항 상세 페이지
 * @description 공지사항 내용, 인라인 편집, 삭제, 댓글/답글 기능을 제공하는 페이지
 *
 * @file Announcement Detail Page
 * @description Page for viewing announcement content, inline editing, deletion, and comments/replies
 */
'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, Trash2, Reply, Pin, Paperclip, Download, FileText } from 'lucide-react';
import {
  useAnnouncementDetail,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
  useAddComment,
  useDeleteComment,
  useTogglePin,
  useUploadAttachment,
  useDeleteAttachment,
} from '@/hooks/useAdmin';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/stores/auth';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { cn } from '@/lib/format';
import type { CommentItem } from '@/types';

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

  const updateAnnouncement = useUpdateAnnouncement();
  const deleteAnnouncement = useDeleteAnnouncement();
  const addComment = useAddComment();
  const deleteComment = useDeleteComment();
  const togglePin = useTogglePin();
  const uploadAttachment = useUploadAttachment();
  const deleteAttachment = useDeleteAttachment();

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  // Delete announcement modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Attachment delete modal
  const [attachmentToDelete, setAttachmentToDelete] = useState<string | null>(null);

  // Comment delete modal
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

  // New comment input
  const [newComment, setNewComment] = useState('');

  // Reply state: maps commentId → reply text; null means no reply box open
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // ─── Permissions ─────────────────────────────────────────────────────────────
  const isSystem = user?.role === 'SYSTEM';
  const isAdmin = user?.role === 'ADMIN';
  const isAuthor = data?.author?.id === user?.id;

  // Edit/Delete on announcement: SYSTEM always, ADMIN only if they are the author
  const canEditAnnouncement = isSystem || (isAdmin && isAuthor);

  // Format dates
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
  };

  // Role badge
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

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleEditStart = () => {
    if (!data) return;
    setEditTitle(data.title);
    setEditContent(data.content);
    setIsEditing(true);
  };

  const handleEditSave = async () => {
    if (!editTitle.trim() || !editContent.trim()) return;
    try {
      await updateAnnouncement.mutateAsync({
        id,
        title: editTitle.trim(),
        content: editContent.trim(),
      });
      setIsEditing(false);
    } catch {
      // mutation error state handles feedback
    }
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditTitle('');
    setEditContent('');
  };

  const handleTogglePin = async () => {
    try {
      await togglePin.mutateAsync(id);
    } catch {
      // mutation error state handles feedback
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return; // 5MB limit
    try {
      await uploadAttachment.mutateAsync({ announcementId: id, file });
    } catch {
      // mutation error state handles feedback
    }
    e.target.value = '';
  };

  const handleDeleteAttachment = async () => {
    if (!attachmentToDelete) return;
    try {
      await deleteAttachment.mutateAsync(attachmentToDelete);
      setAttachmentToDelete(null);
    } catch {
      // mutation error state handles feedback
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDeleteAnnouncement = async () => {
    try {
      await deleteAnnouncement.mutateAsync(id);
      router.push('/announcements');
    } catch {
      // mutation error state handles feedback
    }
  };

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

  const handleDeleteComment = async () => {
    if (!commentToDelete) return;
    try {
      await deleteComment.mutateAsync(commentToDelete);
      setCommentToDelete(null);
    } catch {
      // mutation error state handles feedback
    }
  };

  const canDeleteComment = (comment: CommentItem): boolean => {
    if (!user) return false;
    if (isSystem) return true;
    return comment.author.id === user.id;
  };

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
      <div className="flex items-center gap-3 py-4">
        <Link
          href="/announcements"
          className="p-1.5 -ml-1.5 text-text-tertiary hover:text-text-primary transition-colors rounded-lg hover:bg-bg-secondary/60"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={2} />
        </Link>
        <h1 className="text-[17px] font-bold text-text-primary">
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
            {isEditing ? (
              /* Edit mode */
              <div className="flex flex-col gap-3">
                {/* Title input */}
                <div>
                  <label className="text-[12px] text-text-tertiary font-semibold uppercase tracking-wide block mb-1.5">
                    {t('announce.titleLabel')}
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder={t('announce.titlePlaceholder')}
                    className={cn(
                      'w-full px-3 py-2.5 rounded-xl text-[15px] font-semibold',
                      'bg-bg-primary border border-border',
                      'text-text-primary placeholder:text-text-quaternary',
                      'focus:outline-none focus:border-accent transition-colors',
                    )}
                  />
                </div>

                {/* Content textarea */}
                <div>
                  <label className="text-[12px] text-text-tertiary font-semibold uppercase tracking-wide block mb-1.5">
                    {t('announce.contentLabel')}
                  </label>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder={t('announce.contentPlaceholder')}
                    rows={8}
                    className={cn(
                      'w-full px-3 py-2.5 rounded-xl text-[14px]',
                      'bg-bg-primary border border-border',
                      'text-text-primary placeholder:text-text-quaternary',
                      'focus:outline-none focus:border-accent transition-colors',
                      'resize-none leading-relaxed',
                    )}
                  />
                </div>

                {/* Save / Cancel */}
                <div className="flex gap-2.5 mt-1">
                  <button
                    onClick={handleEditSave}
                    disabled={updateAnnouncement.isPending || !editTitle.trim() || !editContent.trim()}
                    className="flex-1 h-10 rounded-xl bg-accent hover:bg-accent/90 text-white text-[13px] font-semibold transition-colors disabled:opacity-50"
                  >
                    {updateAnnouncement.isPending ? '...' : t('announce.update')}
                  </button>
                  <button
                    onClick={handleEditCancel}
                    disabled={updateAnnouncement.isPending}
                    className="flex-1 h-10 rounded-xl border border-border text-[13px] font-semibold text-text-secondary hover:bg-bg-tertiary transition-colors"
                  >
                    {t('modal.cancel')}
                  </button>
                </div>
              </div>
            ) : (
              /* View mode */
              <>
                {/* Title row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h2 className="text-[18px] font-bold text-text-primary leading-snug flex-1">
                    {data.title}
                  </h2>

                  {/* Pin / Edit / Delete buttons */}
                  {canEditAnnouncement && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={handleTogglePin}
                        disabled={togglePin.isPending}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors',
                          data.isPinned
                            ? 'text-accent border-accent/30 bg-accent/10 hover:bg-accent/20'
                            : 'text-text-secondary border-border hover:bg-bg-tertiary hover:text-text-primary',
                        )}
                      >
                        <Pin className="w-3.5 h-3.5 inline mr-1 rotate-45" />
                        {data.isPinned ? t('announce.unpin') : t('announce.pin')}
                      </button>
                      <button
                        onClick={handleEditStart}
                        className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-text-secondary border border-border hover:bg-bg-tertiary hover:text-text-primary transition-colors"
                      >
                        {t('announce.edit')}
                      </button>
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
                <div className="flex items-center gap-2 mb-4">
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
                  <span className="text-text-quaternary text-[11px]">·</span>
                  <span className="text-[12px] text-text-quaternary">
                    {formatDate(data.createdAt)}
                  </span>
                  {data.updatedAt !== data.createdAt && (
                    <>
                      <span className="text-text-quaternary text-[11px]">·</span>
                      <span className="text-[11px] text-text-quaternary italic">
                        {formatDate(data.updatedAt)}
                      </span>
                    </>
                  )}
                </div>

                {/* Divider */}
                <div className="border-t border-border/50 mb-4" />

                {/* Content */}
                <p className="text-[14px] text-text-primary leading-relaxed whitespace-pre-wrap">
                  {data.content}
                </p>

                {/* Attachments */}
                {(data.attachments?.length > 0 || canEditAnnouncement) && (
                  <div className="mt-5 pt-4 border-t border-border/50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5">
                        <Paperclip className="w-4 h-4 text-text-tertiary" />
                        <h4 className="text-[13px] font-semibold text-text-tertiary">
                          {t('announce.attachments')}
                        </h4>
                        {data.attachments?.length > 0 && (
                          <span className="text-[12px] text-text-quaternary">{data.attachments.length}</span>
                        )}
                      </div>
                      {canEditAnnouncement && (
                        <label className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold text-accent border border-accent/30 hover:bg-accent/10 transition-colors cursor-pointer">
                          <Paperclip className="w-3.5 h-3.5" />
                          {t('announce.addFile')}
                          <input
                            type="file"
                            onChange={handleFileUpload}
                            className="hidden"
                            accept="*/*"
                          />
                        </label>
                      )}
                    </div>
                    {uploadAttachment.isPending && (
                      <div className="flex items-center gap-2 py-2 text-[12px] text-text-quaternary">
                        <span className="w-3.5 h-3.5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                        업로드 중...
                      </div>
                    )}
                    {data.attachments?.length > 0 && (
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
                            {canEditAnnouncement && (
                              <button
                                onClick={() => setAttachmentToDelete(att.id)}
                                className="p-1.5 rounded-lg text-text-quaternary hover:text-danger hover:bg-danger/10 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
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

                      {/* Actions: Reply + Delete */}
                      <div className="flex items-center gap-3 mt-0.5">
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

                            {/* Reply delete action */}
                            {canDeleteComment(reply) && (
                              <button
                                onClick={() => setCommentToDelete(reply.id)}
                                className="self-start flex items-center gap-1 text-[12px] text-text-quaternary hover:text-danger transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                {t('announce.deleteComment')}
                              </button>
                            )}
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

      {/* Delete attachment confirm modal */}
      <ConfirmModal
        isOpen={!!attachmentToDelete}
        onClose={() => setAttachmentToDelete(null)}
        onConfirm={handleDeleteAttachment}
        title={t('announce.deleteFile')}
        message={t('announce.deleteFileConfirm')}
        confirmLabel={t('announce.deleteFile')}
        cancelLabel={t('modal.cancel')}
        confirmVariant="danger"
        loading={deleteAttachment.isPending}
      />

      {/* Delete comment confirm modal */}
      <ConfirmModal
        isOpen={!!commentToDelete}
        onClose={() => setCommentToDelete(null)}
        onConfirm={handleDeleteComment}
        title={t('announce.deleteComment')}
        message={t('announce.deleteComment')}
        confirmLabel={t('announce.deleteComment')}
        cancelLabel={t('modal.cancel')}
        confirmVariant="danger"
        loading={deleteComment.isPending}
      />
    </div>
  );
}
