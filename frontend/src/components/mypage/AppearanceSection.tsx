/**
 * @file 알림 설정 섹션 컴포넌트
 * @description 알림 토글 (거래, 가격, 채팅 등) — 낙관적 업데이트 패턴
 *
 * @file Notification Preferences Section Component
 * @description Notification toggles (trade, price, chat, etc.) — optimistic update pattern
 */
'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettingsStore, type NotificationPrefs } from '@/stores/settings';
import { useToastStore } from '@/stores/toast';
import { cn } from '@/lib/format';
import api from '@/lib/api';
import type { TranslationKey } from '@/lib/i18n';

/**
 * 알림 토글 스위치 — 낙관적 업데이트(optimistic update) 패턴 적용
 * 1. 즉시 UI 반영 → 2. 서버 요청 → 3. 실패 시 원래 값으로 롤백
 *
 * Notification toggle switch — uses optimistic update pattern:
 * 1. Update UI immediately → 2. Send server request → 3. Rollback on failure
 */
function NotifToggle({ label, prefKey }: { label: string; prefKey: keyof NotificationPrefs }) {
  const { t } = useTranslation();
  const value = useSettingsStore((s) => s.notificationPrefs[prefKey]);
  const setPref = useSettingsStore((s) => s.setNotificationPref);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const applyToggle = async (newValue: boolean) => {
    setPref(prefKey, newValue);
    try {
      await api.put('/api/user/notification-settings', {
        [`notif.${prefKey}`]: newValue.toString(),
      });
    } catch {
      setPref(prefKey, !newValue);
      useToastStore.getState().addToast(t('mypage.notificationSaveFailed'), 'error');
    }
  };

  const handleToggle = () => {
    if (value) {
      // 활성→비활성: 확인 모달 표시 / Active→Inactive: show confirm modal
      setConfirmOpen(true);
    } else {
      // 비활성→활성: 바로 적용 / Inactive→Active: apply immediately
      applyToggle(true);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between py-2.5">
        <span className="text-[14px] text-text-primary">{label}</span>
        <button
          onClick={handleToggle}
          aria-label={label}
          className={cn(
            'relative w-10 h-[22px] rounded-full transition-colors',
            value ? 'bg-accent' : 'bg-bg-tertiary',
          )}
        >
          <span className={cn(
            'absolute top-[3px] w-4 h-4 rounded-full bg-white shadow transition-transform',
            value ? 'left-[22px]' : 'left-[3px]',
          )} />
        </button>
      </div>
      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={async () => {
          setConfirmOpen(false);
          await applyToggle(false);
        }}
        title={t('mypage.notif.disableConfirmTitle')}
        message={t(`mypage.notif.disableConfirmMessage.${prefKey}` as Parameters<typeof t>[0])}
      />
    </>
  );
}

interface AppearanceSectionProps {
  t: (key: TranslationKey) => string;
}

/**
 * 알림 설정 섹션 — 거래, 가격, 채팅, 공지 등 알림 토글
 * Notification preferences section — trade, price, chat, announcement toggles
 */
export default function AppearanceSection({ t }: AppearanceSectionProps) {
  return (
    <div className="bg-bg-secondary rounded-2xl px-5 py-4">
      <div className="flex items-center gap-2 mb-3">
        <Bell className="w-3.5 h-3.5 text-text-tertiary" />
        <h2 className="text-[13px] font-bold text-text-tertiary uppercase tracking-wide">
          {t('mypage.notificationPrefs')}
        </h2>
      </div>
      <div className="flex flex-col divide-y divide-border/40">
        <NotifToggle label={t('mypage.notif.trade')} prefKey="trade" />
        <NotifToggle label={t('mypage.notif.priceAlert')} prefKey="priceAlert" />
        <NotifToggle label={t('mypage.notif.chat')} prefKey="chat" />
        <NotifToggle label={t('mypage.notif.chatBadge')} prefKey="chatBadge" />
        <NotifToggle label={t('mypage.notif.announcement')} prefKey="announcement" />
        <NotifToggle label={t('mypage.notif.registration')} prefKey="registration" />
      </div>
    </div>
  );
}
