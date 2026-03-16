/**
 * @file 공지사항 작성 페이지
 * @description 관리자 전용 공지사항 작성 페이지 (제목, 내용, 고정, 첨부파일)
 *
 * @file New Announcement Page
 * @description Admin-only page for creating a new announcement with attachments
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pin, Upload, FileText, X } from 'lucide-react';
import { useCreateAnnouncement, useUploadAttachment } from '@/hooks/useAdmin';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/stores/auth';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { cn } from '@/lib/format';

/** 공지사항 작성 페이지 컴포넌트 — 제목/내용/고정/첨부파일 입력 후 생성
 * New announcement page component — create with title, content, pin, and attachments */
export default function NewAnnouncementPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);

  // 공지사항 생성 + 첨부파일 업로드 뮤테이션 / Announcement creation + file upload mutations
  const { mutateAsync: createAnnouncement, isPending: isCreating } = useCreateAnnouncement();
  const { mutateAsync: uploadAttachment, isPending: isUploading } = useUploadAttachment();

  // 비관리자 리다이렉트 — SYSTEM/ADMIN 외 접근 차단 / Redirect non-admin — block access for non-SYSTEM/ADMIN users
  useEffect(() => {
    if (user && user.role !== 'SYSTEM' && user.role !== 'ADMIN') {
      router.replace('/announcements');
    }
  }, [user, router]);

  if (user && user.role !== 'SYSTEM' && user.role !== 'ADMIN') return null;

  // 파일 추가 — 5MB 이하만 허용 / Add files — only allows files under 5MB
  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    const valid = newFiles.filter((f) => f.size <= 5 * 1024 * 1024);
    setFiles((prev) => [...prev, ...valid]);
    e.target.value = '';
  };

  /** 첨부 파일 목록에서 특정 파일 제거
   * Remove a specific file from attachments list */
  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  /** 바이트를 읽기 쉬운 파일 크기로 변환
   * Convert bytes to human-readable file size */
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  /** 폼 제출 시 확인 모달 표시
   * Show confirm modal on form submit */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setShowConfirm(true);
  };

  // 생성 또는 업로드 중 하나라도 진행 중이면 true / True if either creation or upload is in progress
  const isSaving = isCreating || isUploading;

  /**
   * 확인 후 실제 생성 — 공지 생성 → 첨부파일 순차 업로드
   * 파일은 공지 ID가 필요하므로 생성 완료 후 순차 업로드
   *
   * Create handler — create announcement → upload files sequentially
   * Files require announcement ID, so they upload after creation completes
   */
  const handleConfirmCreate = async () => {
    try {
      const result = await createAnnouncement({ title: title.trim(), content: content.trim(), isPinned });
      if (files.length > 0 && result?.id) {
        for (const file of files) {
          await uploadAttachment({ announcementId: result.id, file });
        }
      }
      setShowConfirm(false);
      router.push('/announcements');
    } catch {
      // mutation error handled by React Query
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 py-6 h-[88px]">
        <Link
          href="/announcements"
          className="flex items-center justify-center w-8 h-8 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-[20px] font-extrabold text-text-primary">
          {t('announce.create')}
        </h1>
      </div>

      {/* Form */}
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
            autoFocus
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

        {/* File attachments */}
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
          {files.length > 0 && (
            <div className="flex flex-col gap-2">
              {files.map((file, idx) => (
                <div key={idx} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-accent/5 border border-accent/20">
                  <FileText className="w-4 h-4 text-accent shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-text-primary font-medium truncate">{file.name}</p>
                    <p className="text-[11px] text-text-quaternary">{formatFileSize(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(idx)}
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
            href="/announcements"
            className="px-4 py-2.5 rounded-xl text-[14px] font-semibold text-text-tertiary hover:text-text-primary hover:bg-bg-secondary border border-border transition-colors"
          >
            {t('announce.back')}
          </Link>
          <button
            type="submit"
            disabled={isSaving || !title.trim() || !content.trim()}
            className="px-5 py-2.5 rounded-xl text-[14px] font-semibold bg-accent text-white hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t('announce.submit')}
              </span>
            ) : (
              t('announce.submit')
            )}
          </button>
        </div>
      </form>

      {/* Create confirm modal */}
      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmCreate}
        title={t('announce.create')}
        message={t('announce.createConfirm')}
        confirmLabel={t('announce.submit')}
        cancelLabel={t('modal.cancel')}
        loading={isSaving}
      />
    </div>
  );
}
