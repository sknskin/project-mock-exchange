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

  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    addressDetail: '',
    zipCode: '',
  });
  const [error, setError] = useState('');
  const [initialized, setInitialized] = useState(false);

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

  const handleSave = async () => {
    setError('');
    try {
      await updateProfile.mutateAsync(form);
      router.push('/mypage');
    } catch {
      setError(t('common.error'));
    }
  };

  if (!isAuthenticated) return null;

  if (isLoading) {
    return (
      <div className="py-20 text-center text-text-quaternary text-[14px]">
        {t('common.loading')}
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 py-6">
        <Link
          href="/mypage"
          className="flex items-center justify-center w-8 h-8 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors"
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

        {/* Address — uses AddressSearch modal (same as registration) */}
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
            className="px-4 py-2.5 rounded-xl text-[14px] font-semibold text-text-tertiary hover:text-text-primary hover:bg-bg-secondary border border-border transition-colors"
          >
            {t('mypage.cancel')}
          </Link>
          <button
            onClick={handleSave}
            disabled={updateProfile.isPending}
            className="px-5 py-2.5 rounded-xl text-[14px] font-semibold bg-accent text-white hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {updateProfile.isPending ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t('mypage.save')}
              </span>
            ) : (
              t('mypage.save')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
