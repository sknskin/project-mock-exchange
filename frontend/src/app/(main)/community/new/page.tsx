/**
 * @file 커뮤니티 게시글 작성/수정 페이지
 * @description TipTap 에디터, 첨부파일, ConfirmModal 적용
 *
 * @file Community Post Create/Edit Page
 * @description Post creation and editing with TipTap rich editor, file attachments, and ConfirmModal
 */
'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import AuthGuard from '@/components/layout/AuthGuard';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useTranslation } from '@/hooks/useTranslation';
import { useCreatePost, useUpdatePost, useCommunityPost, useUploadCommunityAttachment } from '@/hooks/useCommunity';
import { ArrowLeft, Send, Paperclip, X, Lock, Globe } from 'lucide-react';
import { cn } from '@/lib/format';
import { useToastStore } from '@/stores/toast';

// TipTap 리치 에디터 동적 임포트 (SSR 비활성화) / Dynamic import of TipTap rich editor (SSR disabled)
const RichEditor = dynamic(() => import('@/components/ui/RichEditor'), { ssr: false });

// 게시판 카테고리 옵션 / Discussion category options
const CATEGORIES = [
  { value: 'FREE', ko: '자유토론', en: 'Discussion' },
  { value: 'INFO', ko: '정보공유', en: 'Info' },
  { value: 'QUESTION', ko: '질문', en: 'Question' },
  { value: 'STRATEGY', ko: '전략', en: 'Strategy' },
  { value: 'ANALYSIS', ko: '분석', en: 'Analysis' },
  { value: 'PROOF', ko: '인증', en: 'Proof' },
];

/**
 * Suspense 래퍼 — useSearchParams 사용을 위해 필요
 * Suspense wrapper — required for useSearchParams usage in Next.js 15
 */
/** 커뮤니티 게시글 작성/수정 페이지 컴포넌트 — Suspense 래퍼
 * Community post create/edit page component — Suspense wrapper */
export default function CommunityNewPostPage() {
  return (
    <Suspense fallback={<div className="py-24 text-center text-text-quaternary animate-pulse">Loading...</div>}>
      <CommunityNewPostContent />
    </Suspense>
  );
}

/** 게시글 작성/수정 폼 — TipTap 에디터 + 카테고리 + 첨부파일
 * Post create/edit form — TipTap editor + category + attachments */
function CommunityNewPostContent() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  // URL 파라미터 ?edit=<id> 로 수정 모드 진입 / Enter edit mode via ?edit=<id> URL param
  const editId = searchParams.get('edit');

  // 폼 상태 / Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('FREE');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'MEMBERS_ONLY'>('PUBLIC');
  const [files, setFiles] = useState<File[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // API 뮤테이션 훅 / API mutation hooks
  const createPost = useCreatePost();
  const updatePost = useUpdatePost();
  const uploadAttachment = useUploadCommunityAttachment();
  // 수정 모드일 때 기존 게시글 데이터 조회 / Fetch existing post data in edit mode
  const { data: editPost } = useCommunityPost(editId ?? '');

  // 수정 모드 초기화 — 기존 데이터로 폼 채우기 / Initialize edit mode — populate form with existing data
  useEffect(() => {
    if (editPost && editId) {
      setTitle(editPost.title);
      setContent(editPost.content);
      setCategory(editPost.category);
      if (editPost.visibility === 'MEMBERS_ONLY') setVisibility('MEMBERS_ONLY');
    }
  }, [editPost, editId]);

  const isEditing = !!editId;
  // 게시글 생성/수정/파일 업로드 중 하나라도 진행 중이면 true / True if any mutation is pending
  const isPending = createPost.isPending || updatePost.isPending || uploadAttachment.isPending;

  /**
   * 게시글 제출 핸들러 — 수정 시 updatePost, 신규 시 createPost + 첨부파일 순차 업로드
   * Submit handler — updatePost for edit, createPost for new + sequential file uploads
   */
  const handleSubmit = async () => {
    setShowConfirm(false);
    if (!title.trim() || !content.trim()) return;

    const failedFiles: string[] = [];

    if (isEditing) {
      await updatePost.mutateAsync({ id: editId!, title: title.trim(), content: content.trim(), category, visibility });
      // Upload new files for edit — individual try-catch per file
      for (const file of files) {
        try {
          await uploadAttachment.mutateAsync({ postId: editId!, file });
        } catch {
          failedFiles.push(file.name);
        }
      }
      if (failedFiles.length > 0) {
        useToastStore.getState().addToast(
          locale === 'ko'
            ? `파일 업로드 실패: ${failedFiles.join(', ')}`
            : `Failed to upload: ${failedFiles.join(', ')}`,
          'error',
        );
      }
      router.push(`/community/${editId}`);
    } else {
      const result = await createPost.mutateAsync({ title: title.trim(), content: content.trim(), category, visibility });
      const newId = result?.data?.id;
      if (newId && files.length > 0) {
        for (const file of files) {
          try {
            await uploadAttachment.mutateAsync({ postId: newId, file });
          } catch {
            failedFiles.push(file.name);
          }
        }
        if (failedFiles.length > 0) {
          useToastStore.getState().addToast(
            locale === 'ko'
              ? `파일 업로드 실패: ${failedFiles.join(', ')}`
              : `Failed to upload: ${failedFiles.join(', ')}`,
            'error',
          );
        }
      }
      router.push(newId ? `/community/${newId}` : '/community');
    }
  };

  // 허용 파일 타입 / Allowed file types
  const ALLOWED_FILE_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  /** 파일 선택 시 허용 타입/크기 검증 후 추가
   * Validate file type/size on selection and add */
  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected) return;
    const validFiles: File[] = [];
    for (const file of Array.from(selected)) {
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        // ERR-M-01: alert() 대신 토스트 알림 사용 / Use toast notification instead of alert()
        useToastStore.getState().addToast(
          locale === 'ko'
            ? `허용되지 않는 파일 형식입니다: ${file.name}`
            : `File type not allowed: ${file.name}`,
          'error',
        );
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        // ERR-M-01: alert() 대신 토스트 알림 사용 / Use toast notification instead of alert()
        useToastStore.getState().addToast(
          locale === 'ko'
            ? `파일 크기가 10MB를 초과합니다: ${file.name}`
            : `File exceeds 10MB limit: ${file.name}`,
          'error',
        );
        continue;
      }
      validFiles.push(file);
    }
    if (validFiles.length > 0) setFiles((prev) => [...prev, ...validFiles]);
    e.target.value = '';
  };

  /** 첨부 파일 목록에서 특정 파일 제거
   * Remove a specific file from attachments list */
  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <AuthGuard>
      <div className="pb-16">
        {/* Header */}
        <div className="py-6 flex items-center gap-3 h-[88px]">
          <button onClick={() => router.back()} className="flex items-center justify-center w-8 h-8 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-[20px] font-extrabold text-text-primary">
            {isEditing ? t('community.post.edit') : t('community.post.write')}
          </h1>
        </div>

        <div className="bg-bg-secondary/60 border border-border/60 rounded-2xl p-5 sm:p-6 space-y-5">
          {/* Category */}
          <div>
            <label className="block text-[13px] font-semibold text-text-secondary mb-2">
              {t('community.post.category')}
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors',
                    category === cat.value
                      ? 'bg-accent text-white'
                      : 'bg-bg-tertiary text-text-quaternary hover:text-text-secondary',
                  )}
                >
                  {locale === 'ko' ? cat.ko : cat.en}
                </button>
              ))}
            </div>
          </div>

          {/* Visibility / 공개 범위 */}
          <div>
            <label className="block text-[13px] font-semibold text-text-secondary mb-2">
              {t('community.post.visibility')}
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setVisibility('PUBLIC')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors',
                  visibility === 'PUBLIC'
                    ? 'bg-accent text-white'
                    : 'bg-bg-tertiary text-text-quaternary hover:text-text-secondary',
                )}
              >
                <Globe className="w-3.5 h-3.5" />
                {t('community.post.visibilityPublic')}
              </button>
              <button
                onClick={() => setVisibility('MEMBERS_ONLY')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors',
                  visibility === 'MEMBERS_ONLY'
                    ? 'bg-warning text-white'
                    : 'bg-bg-tertiary text-text-quaternary hover:text-text-secondary',
                )}
              >
                <Lock className="w-3.5 h-3.5" />
                {t('community.post.visibilityMembersOnly')}
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-[13px] font-semibold text-text-secondary mb-2">
              {t('community.post.titleLabel')}
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('community.post.titlePlaceholder')}
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-bg-tertiary border border-border/50 text-[14px] text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-accent/50"
              maxLength={200}
            />
          </div>

          {/* Content — RichEditor */}
          <div>
            <label className="block text-[13px] font-semibold text-text-secondary mb-2">
              {t('community.post.contentLabel')}
            </label>
            <RichEditor
              content={content}
              onChange={setContent}
              placeholder={t('community.post.contentPlaceholder')}
            />
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-[13px] font-semibold text-text-secondary mb-2">
              {t('community.post.attachments')}
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border/60 rounded-xl p-4 text-center cursor-pointer hover:border-accent/40 transition-colors"
            >
              <Paperclip className="w-5 h-5 mx-auto text-text-quaternary mb-1" />
              <span className="text-[12px] text-text-quaternary">
                {t('community.post.attachHint')}
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileAdd}
            />
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {files.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-tertiary border border-border/50 text-[12px] text-text-secondary"
                  >
                    <Paperclip className="w-3 h-3" />
                    <span className="max-w-[150px] truncate">{file.name}</span>
                    <button onClick={() => removeFile(i)} className="text-text-quaternary hover:text-rise transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => router.back()}
              className="px-5 py-2.5 rounded-xl bg-bg-tertiary text-text-secondary text-[13px] font-semibold hover:bg-bg-quaternary transition-colors"
            >
              {t('community.post.cancel')}
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              disabled={!title.trim() || !content.trim() || isPending}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-accent text-white text-[13px] font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {isEditing ? t('community.post.update') : t('community.post.submit')}
            </button>
          </div>
        </div>

        {/* Confirm Modal */}
        <ConfirmModal
          isOpen={showConfirm}
          onClose={() => setShowConfirm(false)}
          onConfirm={handleSubmit}
          title={isEditing ? t('community.post.edit') : t('community.post.write')}
          message={isEditing ? t('community.post.updateConfirm') : t('community.post.createConfirm')}
          loading={isPending}
        />
      </div>
    </AuthGuard>
  );
}
