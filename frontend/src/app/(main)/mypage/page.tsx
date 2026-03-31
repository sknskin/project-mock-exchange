/**
 * @file 마이페이지
 * @description 사용자 프로필 조회 및 비밀번호 변경 페이지 (오케스트레이터)
 *
 * @file My Page
 * @description User profile view and password change page (orchestrator)
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Edit2, User } from 'lucide-react';
import { useProfile } from '@/hooks/useAdmin';
import { useTradeHistory } from '@/hooks/useOrders';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/stores/auth';
import ProfileSection from '@/components/mypage/ProfileSection';
import SecuritySection from '@/components/mypage/SecuritySection';
import PasswordChangeModal from '@/components/mypage/PasswordChangeModal';
import AppearanceSection from '@/components/mypage/AppearanceSection';

export default function MyPage() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  const { data: profile, isLoading } = useProfile();
  const { data: trades } = useTradeHistory();
  const user = useAuthStore((s) => s.user);

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  if (!isAuthenticated) return null;

  return (
    <div className="pb-24">
      {/* Page header */}
      <div className="py-6 flex items-center justify-between h-[88px]">
        <div className="flex items-center gap-2.5">
          <User className="w-5 h-5 text-accent" />
          <h1 className="text-[20px] font-extrabold text-text-primary">
            {t('mypage.title')}
          </h1>
        </div>
        <Link
          href="/mypage/edit"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent hover:bg-accent/90 text-white text-[13px] font-semibold transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5" />
          {t('mypage.edit')}
        </Link>
      </div>

      {isLoading && (
        <div className="py-20 text-center text-text-quaternary text-[14px]">
          {t('common.loading')}
        </div>
      )}

      {!isLoading && profile && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ProfileSection
            profile={profile}
            trades={trades}
            userId={user?.id}
            locale={locale}
            t={t}
          />

          <AppearanceSection t={t} />

          {/* Password change */}
          <div className="bg-bg-secondary rounded-2xl px-5 py-4">
            <h2 className="text-[13px] font-bold text-text-tertiary uppercase tracking-wide mb-3">
              {t('mypage.changePassword')}
            </h2>
            <button
              onClick={() => setIsPasswordModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border border-border text-[14px] font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
            >
              <Lock className="w-4 h-4" />
              {t('mypage.changePassword')}
            </button>
          </div>

          <SecuritySection
            totpEnabled={profile.totpEnabled}
            encryptedRrn={profile.encryptedRrn}
            t={t}
          />
        </div>
      )}

      <PasswordChangeModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        t={t}
      />
    </div>
  );
}
