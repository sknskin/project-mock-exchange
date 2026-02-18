/**
 * @file 전화번호 인증 컴포넌트
 * @description SMS 인증번호 발송 및 확인 플로우를 처리합니다
 *
 * @file Phone Verification Component
 * @description Handles SMS verification code sending and confirmation flow
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useTranslation } from '@/hooks/useTranslation';
import api from '@/lib/api';

interface PhoneVerificationProps {
  phone: string;
  onPhoneChange: (phone: string) => void;
  onVerified: () => void;
  verified: boolean;
  error?: string;
}

export default function PhoneVerification({
  phone,
  onPhoneChange,
  onVerified,
  verified,
  error,
}: PhoneVerificationProps) {
  const { t } = useTranslation();
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [timer, setTimer] = useState(0);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSendCode = useCallback(async () => {
    setSending(true);
    setMessage('');
    try {
      await api.post('/api/auth/sms/send', { phone });
      setCodeSent(true);
      setTimer(180);
      setMessage(t('sms.sent'));
      setMessageType('success');
    } catch {
      setMessage('Failed to send code');
      setMessageType('error');
    } finally {
      setSending(false);
    }
  }, [phone, t]);

  const handleVerify = useCallback(async () => {
    setVerifying(true);
    setMessage('');
    try {
      await api.post('/api/auth/sms/verify', { phone, code });
      setMessage(t('sms.verified'));
      setMessageType('success');
      onVerified();
    } catch {
      setMessage(t('sms.invalidCode'));
      setMessageType('error');
    } finally {
      setVerifying(false);
    }
  }, [phone, code, t, onVerified]);

  const isValidPhone = /^01[016789]\d{7,8}$/.test(phone);

  if (verified) {
    return (
      <div className="space-y-2">
        <Input
          type="tel"
          placeholder={t('auth.register.phonePlaceholder')}
          value={phone}
          disabled
        />
        <p className="text-[13px] text-rise font-medium">{t('validation.phone.verified')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            type="tel"
            placeholder={t('auth.register.phonePlaceholder')}
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value.replace(/[^0-9]/g, ''))}
            error={error}
            maxLength={11}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          size="md"
          disabled={!isValidPhone || sending || (timer > 0 && codeSent)}
          onClick={handleSendCode}
          className="shrink-0 whitespace-nowrap"
        >
          {sending ? '...' : codeSent ? t('sms.resend') : t('sms.send')}
        </Button>
      </div>

      {codeSent && !verified && (
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder={t('sms.codePlaceholder')}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
              maxLength={6}
            />
            {timer > 0 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-danger font-medium">
                {formatTimer(timer)}
              </span>
            )}
          </div>
          <Button
            type="button"
            variant="primary"
            size="md"
            disabled={code.length !== 6 || verifying || timer <= 0}
            onClick={handleVerify}
            className="shrink-0"
          >
            {verifying ? '...' : t('sms.verify')}
          </Button>
        </div>
      )}

      {message && (
        <p className={`text-[13px] font-medium ${messageType === 'error' ? 'text-danger' : 'text-rise'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
