/**
 * @file 마이페이지 수정
 * @description 사용자 프로필 수정 페이지 (이름, 전화번호, 주소)
 *
 * @file Edit My Page
 * @description User profile edit page (name, phone, address)
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useProfile, useUpdateProfile } from '@/hooks/useAdmin';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/stores/auth';
import AddressSearch from '@/components/auth/AddressSearch';

export default function MyPageEditPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  // 폼 상태 — 빈 문자열로 초기화 후 프로필 로드 시 채워짐 / Form state — initialized empty, populated when profile loads
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    addressDetail: '',
    zipCode: '',
  });
  const [error, setError] = useState('');
  // initialized 플래그로 프로필 데이터의 중복 초기화 방지 / initialized flag prevents duplicate form population from profile data
  const [initialized, setInitialized] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // 프로필 데이터 로드 시 폼 초기화 — initialized 플래그로 한 번만 실행
  // Populate form from profile data — runs only once via initialized flag
  useEffect(() => {
    if (profile && !initialized) {
      setForm({
        name: profile.name ?? '',
        phone: profile.phone ?? '',
        address: profile.address ?? '',
        addressDetail: profile.addressDetail ?? '',
        zipCode: profile.zipCode ?? '',
      });
      setInitialized(true);
    }
  }, [profile, initialized]);

  const handleSave = () => {
    setConfirmOpen(true);
  };

  const handleConfirmSave = async () => {
    setConfirmOpen(false);
    setError('');
    try {
      await updateProfile.mutateAsync(form);
      router.push('/mypage');
    } catch {
      setError(t('common.error'));
    }
  };

  if (!isAuthenticated) return null;

  // 로딩 스켈레톤 — 폼 필드 레이아웃을 모방합니다
  // Loading skeleton — mimics form field layout
  if (isLoading) {
    return (
      <div className="pb-24">
        <div className="flex items-center gap-3 py-6 h-[88px]">
          <div className="w-8 h-8 animate-pulse bg-bg-secondary rounded-lg" />
          <div className="h-5 w-32 animate-pulse bg-bg-secondary rounded" />
        </div>
        <div className="space-y-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-16 animate-pulse bg-bg-secondary rounded" />
              <div className="h-11 w-full animate-pulse bg-bg-secondary rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 py-6 h-[88px]">
        <Link
          href="/mypage"
          className="flex items-center justify-center min-w-[44px] min-h-[44px] w-8 h-8 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-[20px] font-extrabold text-text-primary">
          {t('mypage.edit')}
        </h1>
      </div>

      {error && (
        <div className="mb-5 rounded-xl px-4 py-3 bg-danger/10 border border-danger/20 text-[13px] text-danger font-medium">
          {error}
        </div>
      )}

      <div className="space-y-5">
        {/* Name */}
        <div className="space-y-1.5">
          <label className="block text-[13px] font-semibold text-text-secondary">
            {t('mypage.name')}
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            autoFocus
            className="w-full bg-bg-secondary border border-border rounded-xl px-4 py-3 text-[14px] text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-accent/60 transition-colors"
          />
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <label className="block text-[13px] font-semibold text-text-secondary">
            {t('mypage.phone')}
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="w-full bg-bg-secondary border border-border rounded-xl px-4 py-3 text-[14px] text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-accent/60 transition-colors"
          />
        </div>

        {/* 주소 — 회원가입과 동일한 AddressSearch 모달 컴포넌트 재사용 / Address — reuses same AddressSearch modal component as registration */}
        <div className="space-y-1.5">
          <label className="block text-[13px] font-semibold text-text-secondary">
            {t('mypage.address')}
          </label>
          <AddressSearch
            address={form.address}
            addressDetail={form.addressDetail}
            zipCode={form.zipCode}
            onAddressChange={(address, zipCode) =>
              setForm((f) => ({ ...f, address, zipCode }))
            }
            onAddressDetailChange={(detail) =>
              setForm((f) => ({ ...f, addressDetail: detail }))
            }
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/mypage"
            className="h-11 px-5 rounded-xl text-[14px] font-semibold text-text-tertiary hover:text-text-primary hover:bg-bg-secondary border border-border transition-colors"
          >
            {t('mypage.cancel')}
          </Link>
          <button
            onClick={handleSave}
            disabled={updateProfile.isPending}
            className="h-11 px-5 rounded-xl text-[14px] font-semibold bg-accent text-white hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {updateProfile.isPending ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t('common.saving')}
              </span>
            ) : (
              t('common.save')
            )}
          </button>
        </div>
      </div>

      {/* 수정 확인 모달 — 저장 전 최종 확인 / Edit confirm modal — final confirmation before save */}
      {confirmOpen && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/60" onClick={() => setConfirmOpen(false)} />
          <div className="fixed inset-0 z-[61] flex items-center justify-center pointer-events-none px-4">
            <div className="relative bg-bg-primary border border-border rounded-2xl p-6 w-full max-w-[360px] max-w-[calc(100vw-2rem)] shadow-2xl pointer-events-auto">
              <h3 className="text-[16px] font-bold text-text-primary mb-2">
                {t('mypage.confirmEdit')}
              </h3>
              <p className="text-[13px] text-text-tertiary mb-6">
                {t('mypage.confirmEditDesc')}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleConfirmSave}
                  disabled={updateProfile.isPending}
                  className="flex-1 h-11 rounded-xl bg-accent hover:bg-accent/90 text-white text-[14px] font-semibold transition-colors disabled:opacity-50"
                >
                  {updateProfile.isPending ? '...' : t('mypage.confirm')}
                </button>
                <button
                  onClick={() => setConfirmOpen(false)}
                  disabled={updateProfile.isPending}
                  className="flex-1 h-11 rounded-xl border border-border text-[14px] font-semibold text-text-secondary hover:bg-bg-secondary transition-colors disabled:opacity-50"
                >
                  {t('mypage.cancel')}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
