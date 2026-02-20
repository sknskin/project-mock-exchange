/**
 * @file 공지사항 작성 페이지
 * @description 관리자 전용 공지사항 작성 페이지
 *
 * @file New Announcement Page
 * @description Admin-only page for creating a new announcement
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useCreateAnnouncement } from '@/hooks/useAdmin';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/stores/auth';

export default function NewAnnouncementPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const { mutateAsync: createAnnouncement, isPending } = useCreateAnnouncement();

  // Redirect non-admin users
  useEffect(() => {
    if (user && user.role !== 'SYSTEM' && user.role !== 'ADMIN') {
      router.replace('/announcements');
    }
  }, [user, router]);

  // Guard: render nothing while redirecting
  if (user && user.role !== 'SYSTEM' && user.role !== 'ADMIN') {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    try {
      await createAnnouncement({ title: title.trim(), content: content.trim() });
      router.push('/announcements');
    } catch {
      // mutation error handled by React Query
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 py-6">
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
            rows={12}
            className="w-full bg-bg-secondary border border-border rounded-xl px-4 py-3 text-[14px] text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-accent transition-colors resize-none"
          />
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
            disabled={isPending || !title.trim() || !content.trim()}
            className="px-5 py-2.5 rounded-xl text-[14px] font-semibold bg-accent text-white hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? (
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
    </div>
  );
}
