/**
 * @file 비밀번호 변경 모달 컴포넌트
 * @description 현재/새/확인 비밀번호 입력 + 포커스 트랩 + 2단계 확인
 *
 * @file Password Change Modal Component
 * @description Current/new/confirm password inputs + focus trap + two-step confirmation
 */
'use client';

import { useState, useRef, useCallback } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { useChangePassword } from '@/hooks/useAdmin';
import { cn } from '@/lib/format';
import type { TranslationKey } from '@/lib/i18n';

interface PasswordChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  t: (key: TranslationKey) => string;
}

/**
 * 비밀번호 변경 모달 — 포커스 트랩 + 확인 비밀번호 매칭 + 2단계 확인
 * Password change modal — focus trap + confirm password matching + two-step confirmation
 */
export default function PasswordChangeModal({ isOpen, onClose, t }: PasswordChangeModalProps) {
  const changePassword = useChangePassword();
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [confirmPasswordOpen, setConfirmPasswordOpen] = useState(false);
  // 비밀번호 필드별 표시/숨기기 토글 상태 / Password show/hide toggle state per field
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  /**
   * 비밀번호 모달 포커스 트랩 — Tab/Shift+Tab으로 포커스가 모달 밖으로 나가지 않도록
   * 첫 번째 ↔ 마지막 포커스 가능 요소 사이를 순환시킴 (접근성 WCAG 2.1)
   *
   * Password modal focus trap — prevents Tab/Shift+Tab from leaving the modal
   * Cycles focus between first and last focusable elements (WCAG 2.1 compliance)
   */
  const passwordModalRef = useRef<HTMLDivElement>(null);
  const handlePasswordModalKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const modal = passwordModalRef.current;
    if (!modal) return;
    const focusable = modal.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, []);

  const handleClose = () => {
    onClose();
    setPasswordError('');
    setPasswordSuccess('');
  };

  const handleChangePassword = () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordForm.currentPassword.trim()) {
      setPasswordError(t('mypage.currentPasswordRequired'));
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError(t('validation.password.minLength'));
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError(t('validation.passwordConfirm.match'));
      return;
    }

    setConfirmPasswordOpen(true);
  };

  const handleConfirmChangePassword = async () => {
    setConfirmPasswordOpen(false);
    try {
      await changePassword.mutateAsync(passwordForm);
      setPasswordSuccess(t('mypage.passwordChanged'));
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch {
      setPasswordError(t('mypage.passwordError'));
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Password Change Modal */}
      <div
        className="fixed inset-0 z-[60] bg-black/60"
        onClick={handleClose}
      />
      <div className="fixed inset-0 z-[61] flex items-center justify-center pointer-events-none px-4">
        <div ref={passwordModalRef} onKeyDown={handlePasswordModalKeyDown} className="relative bg-bg-primary border border-border rounded-2xl p-6 w-full max-w-[min(360px,calc(100vw-2rem))] shadow-2xl pointer-events-auto" role="dialog" aria-modal="true" aria-labelledby="password-modal-title">
          <div className="flex items-center justify-between mb-5">
            <h3 id="password-modal-title" className="text-[16px] font-bold text-text-primary">
              {t('mypage.changePassword')}
            </h3>
            <button
              onClick={handleClose}
              className="p-1 rounded-lg text-text-quaternary hover:text-text-primary transition-colors text-[18px] font-bold"
            >
              ✕
            </button>
          </div>

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

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] text-text-tertiary">
                {t('mypage.currentPassword')}
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))
                  }
                  autoComplete="current-password"
                  className="w-full bg-bg-secondary border border-border rounded-xl px-4 py-3 pr-11 text-[14px] text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-accent/60 transition-colors"
                />
                {/* 현재 비밀번호 표시/숨기기 토글 / Current password show/hide toggle */}
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-quaternary hover:text-text-secondary transition-colors"
                  aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showCurrentPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] text-text-tertiary">
                {t('mypage.newPassword')}
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))
                  }
                  autoComplete="new-password"
                  className={cn(
                    'w-full bg-bg-secondary border rounded-xl px-4 py-3 pr-11 text-[14px] text-text-primary placeholder:text-text-quaternary focus:outline-none transition-colors',
                    passwordForm.newPassword.length > 0 && passwordForm.newPassword.length < 8
                      ? 'border-danger/60 focus:border-danger'
                      : 'border-border focus:border-accent/60',
                  )}
                />
                {/* 새 비밀번호 표시/숨기기 토글 / New password show/hide toggle */}
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-quaternary hover:text-text-secondary transition-colors"
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
              {passwordForm.newPassword.length > 0 && passwordForm.newPassword.length < 8 && (
                <p className="text-[12px] text-danger">{t('validation.password.minLength')}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] text-text-tertiary">
                {t('mypage.confirmPassword')}
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))
                  }
                  autoComplete="new-password"
                  className={cn(
                    'w-full bg-bg-secondary border rounded-xl px-4 py-3 pr-11 text-[14px] text-text-primary placeholder:text-text-quaternary focus:outline-none transition-colors',
                    passwordForm.confirmPassword.length > 0 &&
                      passwordForm.newPassword !== passwordForm.confirmPassword
                      ? 'border-danger/60 focus:border-danger'
                      : passwordForm.confirmPassword.length > 0 &&
                          passwordForm.newPassword === passwordForm.confirmPassword
                        ? 'border-green-500/60 focus:border-green-500'
                        : 'border-border focus:border-accent/60',
                  )}
                />
                {/* 비밀번호 확인 표시/숨기기 토글 / Confirm password show/hide toggle */}
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-quaternary hover:text-text-secondary transition-colors"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
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

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleChangePassword}
              disabled={changePassword.isPending}
              className="flex-1 h-11 rounded-xl bg-accent hover:bg-accent/90 text-white text-[14px] font-semibold transition-colors disabled:opacity-50"
            >
              {changePassword.isPending ? '...' : t('mypage.save')}
            </button>
            <button
              onClick={handleClose}
              disabled={changePassword.isPending}
              className="flex-1 h-11 rounded-xl border border-border text-[14px] font-semibold text-text-secondary hover:bg-bg-secondary transition-colors disabled:opacity-50"
            >
              {t('mypage.cancel')}
            </button>
          </div>
        </div>
      </div>

      {/* 비밀번호 변경 최종 확인 모달 — z-index 70으로 첫 번째 모달(z-60) 위에 표시 / Password change final confirm — z-index 70 to stack above first modal (z-60) */}
      {confirmPasswordOpen && (
        <>
          <div className="fixed inset-0 z-[70] bg-black/70" onClick={() => setConfirmPasswordOpen(false)} />
          <div className="fixed inset-0 z-[71] flex items-center justify-center pointer-events-none px-4">
            <div className="relative bg-bg-primary border border-danger/30 rounded-2xl p-6 w-full max-w-[min(380px,calc(100vw-2rem))] shadow-2xl pointer-events-auto" role="dialog" aria-modal="true" aria-labelledby="confirm-password-modal-title">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-danger/15 flex items-center justify-center">
                  <Lock className="w-4 h-4 text-danger" />
                </div>
                <h3 id="confirm-password-modal-title" className="text-[16px] font-bold text-text-primary">
                  {t('mypage.confirmPasswordChange')}
                </h3>
              </div>
              <p className="text-[13px] text-text-tertiary leading-relaxed mb-6">
                {t('mypage.confirmPasswordChangeDesc')}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleConfirmChangePassword}
                  disabled={changePassword.isPending}
                  className="flex-1 h-11 rounded-xl bg-danger hover:bg-danger/90 text-white text-[14px] font-bold transition-colors disabled:opacity-50"
                >
                  {changePassword.isPending ? '...' : t('mypage.confirm')}
                </button>
                <button
                  onClick={() => setConfirmPasswordOpen(false)}
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
    </>
  );
}
