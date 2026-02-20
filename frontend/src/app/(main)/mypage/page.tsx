/**
 * @file 마이페이지
 * @description 사용자 프로필 조회/수정 및 비밀번호 변경 페이지
 *
 * @file My Page
 * @description User profile view/edit and password change page
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Edit2, Save, X } from 'lucide-react';
import { useProfile, useUpdateProfile, useChangePassword } from '@/hooks/useAdmin';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/format';

// ===== Role badge =====
function RoleBadge({ role, t }: { role: string; t: (key: Parameters<ReturnType<typeof useTranslation>['t']>[0]) => string }) {
  if (role === 'SYSTEM') {
    return (
      <span className="text-[13px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400">
        {t('common.system')}
      </span>
    );
  }
  if (role === 'ADMIN') {
    return (
      <span className="text-[13px] font-semibold px-2.5 py-0.5 rounded-full bg-accent/15 text-accent">
        {t('common.admin')}
      </span>
    );
  }
  return (
    <span className="text-[13px] font-semibold px-2.5 py-0.5 rounded-full bg-bg-tertiary text-text-secondary">
      {t('common.user')}
    </span>
  );
}

export default function MyPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();

  // Redirect unauthenticated users
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();

  // ===== Edit mode state =====
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    address: '',
    addressDetail: '',
    zipCode: '',
  });
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // ===== Password modal state =====
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Sync editForm with fetched profile
  useEffect(() => {
    if (profile) {
      setEditForm({
        name: profile.name ?? '',
        phone: profile.phone ?? '',
        address: profile.address ?? '',
        addressDetail: profile.addressDetail ?? '',
        zipCode: profile.zipCode ?? '',
      });
    }
  }, [profile]);

  // ===== Edit mode handlers =====
  const handleEnterEdit = () => {
    setProfileError('');
    setProfileSuccess('');
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    if (profile) {
      setEditForm({
        name: profile.name ?? '',
        phone: profile.phone ?? '',
        address: profile.address ?? '',
        addressDetail: profile.addressDetail ?? '',
        zipCode: profile.zipCode ?? '',
      });
    }
    setProfileError('');
    setProfileSuccess('');
    setIsEditMode(false);
  };

  const handleSaveProfile = async () => {
    setProfileError('');
    setProfileSuccess('');
    try {
      await updateProfile.mutateAsync(editForm);
      setProfileSuccess(t('mypage.profileUpdated'));
      setIsEditMode(false);
    } catch {
      setProfileError(t('common.error'));
    }
  };

  // ===== Password modal handlers =====
  const handleOpenPasswordModal = () => {
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordError('');
    setPasswordSuccess('');
    setIsPasswordModalOpen(true);
  };

  const handleClosePasswordModal = () => {
    setIsPasswordModalOpen(false);
    setPasswordError('');
    setPasswordSuccess('');
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordForm.newPassword.length < 8) {
      setPasswordError(t('validation.password.minLength'));
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError(t('validation.passwordConfirm.match'));
      return;
    }

    try {
      await changePassword.mutateAsync(passwordForm);
      setPasswordSuccess(t('mypage.passwordChanged'));
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch {
      setPasswordError(t('mypage.passwordError'));
    }
  };

  const formatJoinDate = (value: string | null | undefined): string => {
    if (!value) return '-';
    return new Date(value).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  if (!isAuthenticated) return null;

  return (
    <div className="pb-24">
      {/* Page header */}
      <div className="py-6 flex items-center justify-between">
        <h1 className="text-[20px] font-extrabold text-text-primary">
          {t('mypage.title')}
        </h1>
        {!isEditMode ? (
          <button
            onClick={handleEnterEdit}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-bg-secondary border border-border text-[13px] font-semibold text-text-secondary hover:text-text-primary hover:border-accent/50 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
            {t('mypage.editMode')}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancelEdit}
              disabled={updateProfile.isPending}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border text-[13px] font-semibold text-text-secondary hover:bg-bg-secondary transition-colors disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" />
              {t('mypage.cancel')}
            </button>
            <button
              onClick={handleSaveProfile}
              disabled={updateProfile.isPending}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent hover:bg-accent/85 text-white text-[13px] font-semibold transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {updateProfile.isPending ? '...' : t('mypage.save')}
            </button>
          </div>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="py-20 text-center text-text-quaternary text-[14px]">
          {t('common.loading')}
        </div>
      )}

      {/* Profile content */}
      {!isLoading && profile && (
        <div className="flex flex-col gap-5">
          {/* Profile success/error feedback */}
          {profileSuccess && (
            <div className="rounded-xl px-4 py-3 bg-green-500/10 border border-green-500/20 text-[13px] text-green-400 font-medium">
              {profileSuccess}
            </div>
          )}
          {profileError && (
            <div className="rounded-xl px-4 py-3 bg-danger/10 border border-danger/20 text-[13px] text-danger font-medium">
              {profileError}
            </div>
          )}

          {/* Basic Info card */}
          <div className="bg-bg-secondary rounded-2xl p-5">
            <h2 className="text-[14px] font-bold text-text-tertiary uppercase tracking-wide mb-4">
              {t('admin.users.basicInfo')}
            </h2>

            <div className="flex flex-col divide-y divide-border/50">
              {/* Name */}
              <div className="flex justify-between items-center py-3">
                <span className="text-[14px] text-text-tertiary shrink-0">{t('mypage.name')}</span>
                {isEditMode ? (
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    className="bg-bg-secondary border border-border rounded-xl px-4 py-3 text-[14px] text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-accent/60 transition-colors text-right w-[60%]"
                  />
                ) : (
                  <span className="text-[14px] text-text-primary font-medium text-right max-w-[60%] break-all">
                    {profile.name || '-'}
                  </span>
                )}
              </div>

              {/* Email — always read-only */}
              <div className="flex justify-between items-center py-3">
                <span className="text-[14px] text-text-tertiary shrink-0">{t('mypage.email')}</span>
                <span className="text-[14px] text-text-primary font-medium text-right max-w-[60%] break-all">
                  {profile.email || '-'}
                </span>
              </div>

              {/* Username — always read-only */}
              <div className="flex justify-between items-center py-3">
                <span className="text-[14px] text-text-tertiary shrink-0">{t('mypage.username')}</span>
                <span className="text-[14px] text-text-primary font-medium font-mono text-right max-w-[60%] break-all">
                  {profile.username || '-'}
                </span>
              </div>

              {/* Phone */}
              <div className="flex justify-between items-center py-3">
                <span className="text-[14px] text-text-tertiary shrink-0">{t('mypage.phone')}</span>
                {isEditMode ? (
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                    className="bg-bg-secondary border border-border rounded-xl px-4 py-3 text-[14px] text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-accent/60 transition-colors text-right w-[60%]"
                  />
                ) : (
                  <span className="text-[14px] text-text-primary font-medium text-right max-w-[60%] break-all">
                    {profile.phone || '-'}
                  </span>
                )}
              </div>

              {/* Address */}
              <div className={cn('py-3', isEditMode ? 'flex flex-col gap-2' : 'flex justify-between items-start')}>
                <span className="text-[14px] text-text-tertiary shrink-0">{t('mypage.address')}</span>
                {isEditMode ? (
                  <div className="flex flex-col gap-2 w-full">
                    <input
                      type="text"
                      value={editForm.zipCode}
                      onChange={(e) => setEditForm((f) => ({ ...f, zipCode: e.target.value }))}
                      placeholder={t('auth.register.zipCode')}
                      className="bg-bg-secondary border border-border rounded-xl px-4 py-3 text-[14px] text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-accent/60 transition-colors"
                    />
                    <input
                      type="text"
                      value={editForm.address}
                      onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                      placeholder={t('auth.register.address')}
                      className="bg-bg-secondary border border-border rounded-xl px-4 py-3 text-[14px] text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-accent/60 transition-colors"
                    />
                    <input
                      type="text"
                      value={editForm.addressDetail}
                      onChange={(e) => setEditForm((f) => ({ ...f, addressDetail: e.target.value }))}
                      placeholder={t('auth.register.addressDetailPlaceholder')}
                      className="bg-bg-secondary border border-border rounded-xl px-4 py-3 text-[14px] text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-accent/60 transition-colors"
                    />
                  </div>
                ) : (
                  <span className="text-[14px] text-text-primary font-medium text-right max-w-[60%] break-all">
                    {[profile.zipCode, profile.address, profile.addressDetail].filter(Boolean).join(' ') || '-'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Account Info card */}
          <div className="bg-bg-secondary rounded-2xl p-5">
            <h2 className="text-[14px] font-bold text-text-tertiary uppercase tracking-wide mb-4">
              {t('admin.users.accountInfo')}
            </h2>

            <div className="flex flex-col divide-y divide-border/50">
              {/* Role — always read-only */}
              <div className="flex justify-between items-center py-3">
                <span className="text-[14px] text-text-tertiary">{t('mypage.role')}</span>
                <RoleBadge role={profile.role} t={t} />
              </div>

              {/* Join Date */}
              <div className="flex justify-between items-center py-3">
                <span className="text-[14px] text-text-tertiary">{t('mypage.joinDate')}</span>
                <span className="text-[14px] text-text-primary font-medium">
                  {formatJoinDate(profile.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Password change button */}
          <div className="bg-bg-secondary rounded-2xl p-5">
            <h2 className="text-[14px] font-bold text-text-tertiary uppercase tracking-wide mb-4">
              {t('mypage.changePassword')}
            </h2>
            <button
              onClick={handleOpenPasswordModal}
              className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border border-border text-[14px] font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-primary/60 transition-colors"
            >
              <Lock className="w-4 h-4" />
              {t('mypage.changePassword')}
            </button>
          </div>
        </div>
      )}

      {/* Password Change Modal (inline) */}
      {isPasswordModalOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-[60] bg-black/60"
            onClick={handleClosePasswordModal}
          />
          {/* Modal body */}
          <div className="fixed inset-0 z-[61] flex items-center justify-center pointer-events-none px-4">
            <div className="relative bg-bg-primary border border-border rounded-2xl p-6 w-full max-w-[360px] shadow-2xl pointer-events-auto">
              {/* Modal header */}
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[16px] font-bold text-text-primary">
                  {t('mypage.changePassword')}
                </h3>
                <button
                  onClick={handleClosePasswordModal}
                  className="p-1 rounded-lg text-text-quaternary hover:text-text-primary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Feedback messages */}
              {passwordSuccess && (
                <div className="mb-4 rounded-xl px-4 py-3 bg-green-500/10 border border-green-500/20 text-[13px] text-green-400 font-medium">
                  {passwordSuccess}
                </div>
              )}
              {passwordError && (
                <div className="mb-4 rounded-xl px-4 py-3 bg-danger/10 border border-danger/20 text-[13px] text-danger font-medium">
                  {passwordError}
                </div>
              )}

              {/* Form fields */}
              <div className="flex flex-col gap-3">
                {/* Current password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] text-text-tertiary">
                    {t('mypage.currentPassword')}
                  </label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))
                    }
                    autoComplete="current-password"
                    className="bg-bg-secondary border border-border rounded-xl px-4 py-3 text-[14px] text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-accent/60 transition-colors"
                  />
                </div>

                {/* New password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] text-text-tertiary">
                    {t('mypage.newPassword')}
                  </label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))
                    }
                    autoComplete="new-password"
                    className={cn(
                      'bg-bg-secondary border rounded-xl px-4 py-3 text-[14px] text-text-primary placeholder:text-text-quaternary focus:outline-none transition-colors',
                      passwordForm.newPassword.length > 0 && passwordForm.newPassword.length < 8
                        ? 'border-danger/60 focus:border-danger'
                        : 'border-border focus:border-accent/60',
                    )}
                  />
                  {passwordForm.newPassword.length > 0 && passwordForm.newPassword.length < 8 && (
                    <p className="text-[12px] text-danger">{t('validation.password.minLength')}</p>
                  )}
                </div>

                {/* Confirm password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] text-text-tertiary">
                    {t('mypage.confirmPassword')}
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))
                    }
                    autoComplete="new-password"
                    className={cn(
                      'bg-bg-secondary border rounded-xl px-4 py-3 text-[14px] text-text-primary placeholder:text-text-quaternary focus:outline-none transition-colors',
                      passwordForm.confirmPassword.length > 0 &&
                        passwordForm.newPassword !== passwordForm.confirmPassword
                        ? 'border-danger/60 focus:border-danger'
                        : passwordForm.confirmPassword.length > 0 &&
                            passwordForm.newPassword === passwordForm.confirmPassword
                          ? 'border-green-500/60 focus:border-green-500'
                          : 'border-border focus:border-accent/60',
                    )}
                  />
                  {passwordForm.confirmPassword.length > 0 && (
                    <p
                      className={cn(
                        'text-[12px]',
                        passwordForm.newPassword === passwordForm.confirmPassword
                          ? 'text-green-400'
                          : 'text-danger',
                      )}
                    >
                      {passwordForm.newPassword === passwordForm.confirmPassword
                        ? t('validation.passwordConfirm.ok')
                        : t('validation.passwordConfirm.match')}
                    </p>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleChangePassword}
                  disabled={changePassword.isPending}
                  className="flex-1 h-11 rounded-xl bg-accent hover:bg-accent/85 text-white text-[14px] font-semibold transition-colors disabled:opacity-50"
                >
                  {changePassword.isPending ? '...' : t('mypage.save')}
                </button>
                <button
                  onClick={handleClosePasswordModal}
                  disabled={changePassword.isPending}
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
