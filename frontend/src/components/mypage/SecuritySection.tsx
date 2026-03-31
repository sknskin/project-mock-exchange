/**
 * @file 보안 정보 섹션 컴포넌트
 * @description 2FA, SMS 인증, 본인 확인 상태 표시 + 계정 초기화
 *
 * @file Security Section Component
 * @description Displays 2FA, SMS auth, identity verification status + account reset
 */
'use client';

import { useState } from 'react';
import { Shield, RotateCcw } from 'lucide-react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useResetAccount } from '@/hooks/usePortfolio';
import { useToastStore } from '@/stores/toast';
import { cn } from '@/lib/format';
import type { TranslationKey } from '@/lib/i18n';

// 레이블-값 한 쌍을 표시하는 재사용 행 컴포넌트 / Reusable label-value row component for info display
function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-2.5">
      <span className="text-[13px] text-text-tertiary sm:w-28 sm:shrink-0">{label}</span>
      <span className="text-[14px] text-text-primary font-medium break-all">{children}</span>
    </div>
  );
}

interface SecuritySectionProps {
  totpEnabled?: boolean;
  encryptedRrn?: string | null;
  t: (key: TranslationKey) => string;
}

/**
 * 보안 정보 + 계정 초기화 섹션
 * Security info + account reset section
 */
export default function SecuritySection({ totpEnabled, encryptedRrn, t }: SecuritySectionProps) {
  const resetAccount = useResetAccount();

  // 계정 초기화 2단계 확인 상태 / Account reset two-step confirmation state
  // FRM-L-01: Step 1 = ConfirmModal, Step 2 = type "RESET" to confirm
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetStep2Open, setResetStep2Open] = useState(false);
  const [resetTypedText, setResetTypedText] = useState('');

  return (
    <>
      {/* Security Info */}
      <div className="bg-bg-secondary rounded-2xl px-5 py-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-3.5 h-3.5 text-text-tertiary" />
          <h2 className="text-[13px] font-bold text-text-tertiary uppercase tracking-wide">
            {t('mypage.securityInfo')}
          </h2>
        </div>
        <div className="flex flex-col divide-y divide-border/40">
          <InfoRow label={t('mypage.twoFactor')}>
            <span className={cn(
              'text-[13px] font-semibold px-2.5 py-0.5 rounded-full',
              totpEnabled
                ? 'bg-green-500/15 text-green-400'
                : 'bg-bg-tertiary text-text-quaternary',
            )}>
              {totpEnabled ? t('mypage.twoFactorEnabled') : t('mypage.twoFactorDisabled')}
            </span>
          </InfoRow>
          <InfoRow label={t('mypage.smsAuth')}>
            <span className="text-[13px] font-semibold px-2.5 py-0.5 rounded-full bg-green-500/15 text-green-400">
              {t('mypage.smsAuthEnabled')}
            </span>
          </InfoRow>
          <InfoRow label={t('mypage.identityVerification')}>
            <span className={cn(
              'text-[13px] font-semibold px-2.5 py-0.5 rounded-full',
              encryptedRrn
                ? 'bg-green-500/15 text-green-400'
                : 'bg-yellow-500/15 text-yellow-400',
            )}>
              {encryptedRrn ? t('mypage.identityVerified') : t('mypage.identityUnverified')}
            </span>
          </InfoRow>
        </div>
      </div>

      {/* 계정 초기화 — 보유 자산·거래 내역 삭제, 잔고 리셋 / Account Reset — delete holdings, transactions, reset balance */}
      <div className="bg-bg-secondary rounded-2xl px-5 py-4">
        <div className="flex items-center gap-2 mb-2">
          <RotateCcw className="w-3.5 h-3.5 text-danger" />
          <h2 className="text-[13px] font-bold text-danger uppercase tracking-wide">
            {t('mypage.resetAccount')}
          </h2>
        </div>
        <p className="text-[13px] text-text-tertiary leading-relaxed mb-3">
          {t('mypage.resetAccountDesc')}
        </p>
        <button
          onClick={() => setResetConfirmOpen(true)}
          disabled={resetAccount.isPending}
          className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border border-danger/40 text-[14px] font-semibold text-danger hover:bg-danger/10 transition-colors disabled:opacity-50"
        >
          <RotateCcw className="w-4 h-4" />
          {resetAccount.isPending ? t('mypage.resetting') : t('mypage.resetAccount')}
        </button>
      </div>

      {/* FRM-L-01: 계정 초기화 — 2단계 확인 (Step 1: 확인 모달, Step 2: "RESET" 입력)
         FRM-L-01: Account reset — two-step confirmation (Step 1: confirm modal, Step 2: type "RESET") */}
      <ConfirmModal
        isOpen={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        onConfirm={() => {
          setResetConfirmOpen(false);
          setResetTypedText('');
          setResetStep2Open(true);
        }}
        title={t('mypage.resetAccountConfirmTitle')}
        message={t('mypage.resetAccountConfirmMessage')}
        confirmVariant="danger"
      />

      {/* Step 2: "RESET" 입력 확인 모달 / Step 2: Type "RESET" confirmation modal */}
      {resetStep2Open && (
        <>
          <div className="fixed inset-0 z-[70] bg-black/70" onClick={() => setResetStep2Open(false)} />
          <div className="fixed inset-0 z-[71] flex items-center justify-center pointer-events-none px-4">
            <div className="relative bg-bg-primary border border-danger/30 rounded-2xl p-6 w-full max-w-[min(380px,calc(100vw-2rem))] shadow-2xl pointer-events-auto" role="dialog" aria-modal="true" aria-labelledby="reset-step2-title">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-danger/15 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4 text-danger" />
                </div>
                <h3 id="reset-step2-title" className="text-[16px] font-bold text-text-primary">
                  {t('mypage.resetAccountFinalTitle')}
                </h3>
              </div>
              <p className="text-[13px] text-text-tertiary leading-relaxed mb-4">
                {t('mypage.resetAccountFinalMessage')}
              </p>
              <input
                type="text"
                value={resetTypedText}
                onChange={(e) => setResetTypedText(e.target.value)}
                placeholder="RESET"
                autoFocus
                className="w-full bg-bg-secondary border border-border rounded-xl px-4 py-3 text-[14px] text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-danger/60 transition-colors mb-4 font-mono tracking-widest text-center"
              />
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    try {
                      await resetAccount.mutateAsync();
                      setResetStep2Open(false);
                      setResetTypedText('');
                      useToastStore.getState().addToast(t('mypage.resetAccountSuccess'), 'success');
                    } catch {
                      useToastStore.getState().addToast(t('mypage.resetAccountError'), 'error');
                    }
                  }}
                  disabled={resetTypedText !== 'RESET' || resetAccount.isPending}
                  className="flex-1 h-11 rounded-xl bg-danger hover:bg-danger/90 text-white text-[14px] font-bold transition-colors disabled:opacity-50"
                >
                  {resetAccount.isPending ? t('mypage.resetting') : t('mypage.resetAccount')}
                </button>
                <button
                  onClick={() => { setResetStep2Open(false); setResetTypedText(''); }}
                  disabled={resetAccount.isPending}
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
