/**
 * @file 공지사항 수정 페이지
 * @description 관리자 전용 공지사항 수정 페이지 (제목, 내용, 고정, 첨부파일)
 *
 * @file Edit Announcement Page
 * @description Admin-only page for editing an announcement
 */
'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pin, Paperclip, X, FileText, Trash2, Upload } from 'lucide-react';
import {
  useAnnouncementDetail,
  useUpdateAnnouncement,
  useUploadAttachment,
  useDeleteAttachment,
} from '@/hooks/useAdmin';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/stores/auth';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { cn } from '@/lib/format';

export default function EditAnnouncementPage({
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
  const uploadAttachment = useUploadAttachment();
  const deleteAttachment = useDeleteAttachment();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState<string | null>(null);

  // Pending new files to upload on save
  const [newFiles, setNewFiles] = useState<File[]>([]);

  // Initialize form when data loads
  useEffect(() => {
    if (data && !initialized) {
      setTitle(data.title);
      setContent(data.content);
      setIsPinned(data.isPinned);
      setInitialized(true);
    }
  }, [data, initialized]);

  // Redirect non-admin users
  useEffect(() => {
    if (user && user.role !== 'SYSTEM' && user.role !== 'ADMIN') {
      router.replace(`/announcements/${id}`);
    }
  }, [user, router, id]);

  if (user && user.role !== 'SYSTEM' && user.role !== 'ADMIN') return null;

  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter((f) => f.size <= 5 * 1024 * 1024);
    setNewFiles((prev) => [...prev, ...valid]);
    e.target.value = '';
  };

  const handleRemoveNewFile = (index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setShowConfirm(true);
  };

  const handleConfirmSave = async () => {
    try {
      await updateAnnouncement.mutateAsync({
        id,
        title: title.trim(),
        content: content.trim(),
        isPinned,
      });
      // Upload new files
      for (const file of newFiles) {
        await uploadAttachment.mutateAsync({ announcementId: id, file });
      }
      setShowConfirm(false);
      router.push(`/announcements/${id}`);
    } catch {
      // mutation error handled
    }
  };

  const handleDeleteAttachment = async () => {
    if (!attachmentToDelete) return;
    try {
      await deleteAttachment.mutateAsync(attachmentToDelete);
      setAttachmentToDelete(null);
    } catch {
      // handled
    }
  };

  const isSaving = updateAnnouncement.isPending || uploadAttachment.isPending;

  if (isLoading) {
    return (
      <div className="py-20 text-center text-text-quaternary text-[14px]">
        {t('common.loading')}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-20 text-center text-text-quaternary text-[14px]">
        {t('common.noData')}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 py-6">
        <Link
          href={`/announcements/${id}`}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-[20px] font-extrabold text-text-primary">
          {t('announce.edit')}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div className="space-y-1.5">
          <label className="block text-[13px] font-semibold text-text-secondary">
            {t('announce.titleLabel')}
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('announce.titlePlaceholder')}
            required
            className="w-full bg-bg-secondary border border-border rounded-xl px-4 py-3 text-[14px] text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        {/* Content */}
        <div className="space-y-1.5">
          <label className="block text-[13px] font-semibold text-text-secondary">
            {t('announce.contentLabel')}
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('announce.contentPlaceholder')}
            required
            rows={8}
            className="w-full bg-bg-secondary border border-border rounded-xl px-4 py-3 text-[14px] text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-accent transition-colors resize-none min-h-[120px] sm:min-h-[200px]"
          />
        </div>

        {/* Pin toggle */}
        <button
          type="button"
          onClick={() => setIsPinned(!isPinned)}
          className={cn(
            'flex items-center gap-3 w-full px-4 py-3 rounded-xl border transition-colors',
            isPinned
              ? 'border-accent/30 bg-accent/5'
              : 'border-border bg-bg-secondary',
          )}
        >
          <div
            className={cn(
              'relative w-10 h-[22px] rounded-full transition-colors',
              isPinned ? 'bg-accent' : 'bg-border',
            )}
          >
            <div
              className={cn(
                'absolute top-[3px] w-4 h-4 rounded-full bg-white shadow transition-transform',
                isPinned ? 'translate-x-[22px]' : 'translate-x-[3px]',
              )}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Pin className={cn('w-4 h-4 rotate-45', isPinned ? 'text-accent' : 'text-text-tertiary')} />
            <span className={cn('text-[14px] font-medium', isPinned ? 'text-accent' : 'text-text-secondary')}>
              {t('announce.pin')}
            </span>
          </div>
        </button>

        {/* Existing Attachments */}
        {data.attachments?.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Paperclip className="w-4 h-4 text-text-tertiary" />
              <span className="text-[13px] font-semibold text-text-secondary">
                {t('announce.attachments')}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {data.attachments.map((att) => (
                <div key={att.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-bg-secondary border border-border">
                  <FileText className="w-4 h-4 text-text-quaternary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-text-primary font-medium truncate">{att.originalName}</p>
                    <p className="text-[11px] text-text-quaternary">{formatFileSize(att.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachmentToDelete(att.id)}
                    className="p-1.5 rounded-lg text-text-quaternary hover:text-danger hover:bg-danger/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New files to upload */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border bg-bg-secondary hover:border-accent/40 transition-colors cursor-pointer">
            <Upload className="w-4 h-4 text-text-tertiary" />
            <span className="text-[13px] text-text-tertiary font-medium">{t('announce.addFile')}</span>
            <span className="text-[11px] text-text-quaternary ml-auto">{t('announce.fileSize')}</span>
            <input
              type="file"
              onChange={handleAddFiles}
              className="hidden"
              accept="*/*"
              multiple
            />
          </label>
          {newFiles.length > 0 && (
            <div className="flex flex-col gap-2">
              {newFiles.map((file, idx) => (
                <div key={idx} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-accent/5 border border-accent/20">
                  <FileText className="w-4 h-4 text-accent shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-text-primary font-medium truncate">{file.name}</p>
                    <p className="text-[11px] text-text-quaternary">{formatFileSize(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveNewFile(idx)}
                    className="p-1.5 rounded-lg text-text-quaternary hover:text-danger hover:bg-danger/10 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href={`/announcements/${id}`}
            className="px-4 py-2.5 rounded-xl text-[14px] font-semibold text-text-tertiary hover:text-text-primary hover:bg-bg-secondary border border-border transition-colors"
          >
            {t('modal.cancel')}
          </Link>
          <button
            type="submit"
            disabled={isSaving || !title.trim() || !content.trim()}
            className="px-5 py-2.5 rounded-xl text-[14px] font-semibold bg-accent text-white hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t('announce.update')}
              </span>
            ) : (
              t('announce.update')
            )}
          </button>
        </div>
      </form>

      {/* Save confirm modal */}
      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmSave}
        title={t('announce.edit')}
        message={t('announce.editConfirm')}
        confirmLabel={t('announce.update')}
        cancelLabel={t('modal.cancel')}
        loading={isSaving}
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
    </div>
  );
}
