/**
 * @file 회원가입 페이지
 * @description 사용자 정보를 입력하여 회원가입하는 페이지
 *
 * @file Register Page
 * @description Registration page for new user account creation
 */
'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ConfirmModal from '@/components/ui/ConfirmModal';
import ValidationFeedback from '@/components/ui/ValidationFeedback';
import PhoneVerification from '@/components/auth/PhoneVerification';
import ResidentNumberInput from '@/components/auth/ResidentNumberInput';
import AddressSearch from '@/components/auth/AddressSearch';
import { useAuthStore } from '@/stores/auth';
import { useTranslation } from '@/hooks/useTranslation';
import { useDuplicateCheck } from '@/hooks/useDuplicateCheck';
import {
  validatePassword,
  validatePasswordMatch,
  validateEmail,
  validateUsername,
  validateResidentNumber,
} from '@/lib/validation';
import api from '@/lib/api';
import type { AuthResponse } from '@/types';

export default function RegisterPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const { t } = useTranslation();

  // 폼 필드 / Form fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [rrnFront, setRrnFront] = useState('');
  const [rrnBack, setRrnBack] = useState('');
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [zipCode, setZipCode] = useState('');

  // UI 상태 / UI state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // 첫번째 입력 필드 자동 포커스 / Auto-focus first input field
  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  // 중복 확인 / Duplicate checks
  const { status: usernameStatus, checkNow: checkUsernameNow } = useDuplicateCheck('username', username, 3);
  const { status: emailStatus, checkNow: checkEmailNow } = useDuplicateCheck('email', email, 5);
  const { status: phoneStatus } = useDuplicateCheck('phone', phone, 10);

  // 유효성 검사 / Validations
  const usernameValidation = useMemo(() => validateUsername(username), [username]);
  const emailValid = useMemo(() => validateEmail(email), [email]);
  const passwordRules = useMemo(() => validatePassword(password), [password]);
  const passwordMatch = useMemo(() => validatePasswordMatch(password, passwordConfirm), [password, passwordConfirm]);
  const rrnValid = useMemo(() => validateResidentNumber(rrnFront, rrnBack), [rrnFront, rrnBack]);

  const allPasswordRulesPassed = passwordRules.every((r) => r.passed);

  const canSubmit =
    username.length >= 3 &&
    usernameValidation.format &&
    usernameValidation.length &&
    usernameStatus === 'available' &&
    emailValid &&
    emailStatus === 'available' &&
    allPasswordRulesPassed &&
    passwordMatch &&
    name.trim().length > 0 &&
    rrnValid &&
    phoneVerified &&
    phoneStatus !== 'taken' &&
    address.length > 0 &&
    addressDetail.trim().length > 0 &&
    zipCode.length > 0;

  // 폼 제출 시 확인 모달 표시 / Show confirm modal on form submit
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setShowConfirmModal(true);
  }, [canSubmit]);

  // 모달 확인 후 실제 회원가입 요청 / Actual registration after modal confirm
  const handleConfirmRegister = useCallback(async () => {
    setError('');
    setLoading(true);

    try {
      await api.post('/api/auth/register', {
        username,
        email,
        password,
        passwordConfirm,
        name: name.trim(),
        phone,
        residentNumber: rrnFront + rrnBack,
        address,
        addressDetail: addressDetail.trim(),
        zipCode,
      });

      // 가입 후 자동 로그인 / Auto-login after registration
      const { data: loginResp } = await api.post<AuthResponse>(
        '/api/auth/login',
        { identifier: email, password },
      );
      const payload = loginResp.data ?? loginResp;
      login(payload.user, payload.accessToken);
      setShowConfirmModal(false);
      router.push('/dashboard');
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || t('auth.register.error'));
      setShowConfirmModal(false);
    } finally {
      setLoading(false);
    }
  }, [username, email, password, passwordConfirm, name, phone, rrnFront, rrnBack, address, addressDetail, zipCode, login, router, t]);

  const getDuplicateMessage = (status: string): string | undefined => {
    switch (status) {
      case 'checking': return t('validation.duplicate.checking');
      case 'taken': return t('validation.duplicate.taken');
      case 'available': return undefined;
      default: return undefined;
    }
  };

  const getDuplicateColor = (status: string): string => {
    switch (status) {
      case 'taken': return 'text-danger';
      case 'available': return 'text-rise';
      default: return 'text-text-quaternary';
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-10">
          <h1 className="text-[26px] font-extrabold text-text-primary">{t('auth.register.title')}</h1>
          <p className="text-[14px] text-text-tertiary mt-2.5 font-medium leading-relaxed">
            {t('auth.register.subtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 사용자명 / Username */}
          <div>
            <label className="block text-[13px] text-text-secondary font-semibold mb-2">
              {t('auth.register.username')} <span className="text-danger">*</span>
            </label>
            <Input
              ref={firstInputRef}
              type="text"
              placeholder={t('auth.register.usernamePlaceholder')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onBlur={checkUsernameNow}
              error={username.length > 0 && (!usernameValidation.format || !usernameValidation.length)
                ? t('validation.username.format')
                : usernameStatus === 'taken'
                  ? t('validation.duplicate.taken')
                  : undefined}
              englishOnly
              required
            />
            {username.length >= 3 && usernameStatus !== 'idle' && (
              <p className={`mt-1 text-[12px] font-medium ${getDuplicateColor(usernameStatus)}`}>
                {usernameStatus === 'available' ? t('validation.duplicate.available') : getDuplicateMessage(usernameStatus)}
              </p>
            )}
          </div>

          {/* 이메일 / Email */}
          <div>
            <label className="block text-[13px] text-text-secondary font-semibold mb-2">
              {t('auth.register.email')} <span className="text-danger">*</span>
            </label>
            <Input
              type="email"
              placeholder={t('auth.register.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={checkEmailNow}
              error={email.length > 0 && !emailValid ? t('validation.email.format') : undefined}
              englishOnly
              required
            />
            {email.length >= 5 && emailValid && emailStatus !== 'idle' && (
              <p className={`mt-1 text-[12px] font-medium ${getDuplicateColor(emailStatus)}`}>
                {emailStatus === 'available' ? t('validation.duplicate.available') : getDuplicateMessage(emailStatus)}
              </p>
            )}
          </div>

          {/* 비밀번호 / Password */}
          <div>
            <label className="block text-[13px] text-text-secondary font-semibold mb-2">
              {t('auth.register.password')} <span className="text-danger">*</span>
            </label>
            <Input
              type="password"
              placeholder={t('auth.register.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              englishOnly
              required
            />
            <ValidationFeedback rules={passwordRules} show={password.length > 0} />
          </div>

          {/* 비밀번호 확인 / Password Confirm */}
          <div>
            <label className="block text-[13px] text-text-secondary font-semibold mb-2">
              {t('auth.register.passwordConfirm')} <span className="text-danger">*</span>
            </label>
            <Input
              type="password"
              placeholder={t('auth.register.passwordConfirmPlaceholder')}
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              error={passwordConfirm.length > 0 && !passwordMatch ? t('validation.passwordConfirm.match') : undefined}
              englishOnly
              required
            />
            {passwordConfirm.length > 0 && passwordMatch && (
              <p className="mt-1 text-[12px] font-medium text-rise">{t('validation.passwordConfirm.ok')}</p>
            )}
          </div>

          {/* 성명 / Name */}
          <div>
            <label className="block text-[13px] text-text-secondary font-semibold mb-2">
              {t('auth.register.name')} <span className="text-danger">*</span>
            </label>
            <Input
              type="text"
              placeholder={t('auth.register.namePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* 주민등록번호 / Resident Number */}
          <div>
            <label className="block text-[13px] text-text-secondary font-semibold mb-2">
              {t('auth.register.residentNumber')} <span className="text-danger">*</span>
            </label>
            <ResidentNumberInput
              front={rrnFront}
              back={rrnBack}
              onFrontChange={setRrnFront}
              onBackChange={setRrnBack}
              error={rrnFront.length === 6 && rrnBack.length === 7 && !rrnValid
                ? t('validation.residentNumber.format')
                : undefined}
            />
          </div>

          {/* 전화번호 / Phone */}
          <div>
            <label className="block text-[13px] text-text-secondary font-semibold mb-2">
              {t('auth.register.phone')} <span className="text-danger">*</span>
            </label>
            <PhoneVerification
              phone={phone}
              onPhoneChange={setPhone}
              onVerified={() => setPhoneVerified(true)}
              verified={phoneVerified}
              error={phone.length >= 10 && phoneStatus === 'taken' ? t('validation.duplicate.taken') : undefined}
            />
          </div>

          {/* 주소 / Address */}
          <div>
            <label className="block text-[13px] text-text-secondary font-semibold mb-2">
              {t('auth.register.address')} <span className="text-danger">*</span>
            </label>
            <AddressSearch
              address={address}
              addressDetail={addressDetail}
              zipCode={zipCode}
              onAddressChange={(addr, zip) => { setAddress(addr); setZipCode(zip); }}
              onAddressDetailChange={setAddressDetail}
              addressDetailError={address.length > 0 && addressDetail.trim().length === 0 ? t('validation.required') : undefined}
            />
          </div>

          {error && (
            <p className="text-[13px] text-danger text-center py-1">{error}</p>
          )}

          <div className="pt-3">
            <Button
              type="submit"
              size="lg"
              fullWidth
              disabled={loading || !canSubmit}
            >
              {loading ? t('auth.register.loading') : t('auth.register.submit')}
            </Button>
          </div>
        </form>

        <p className="text-center text-[14px] text-text-tertiary mt-8">
          {t('auth.register.hasAccount')}{' '}
          <Link
            href="/login"
            className="text-accent font-bold hover:underline"
          >
            {t('auth.register.login')}
          </Link>
        </p>
      </div>

      {/* 회원가입 확인 모달 / Registration Confirm Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmRegister}
        title={t('modal.registerTitle')}
        message={t('modal.registerMessage')}
        confirmLabel={t('modal.registerConfirm')}
        loading={loading}
      />
    </div>
  );
}
