/**
 * @file 유효성 검증 유틸리티
 * @description 이메일, 비밀번호, 전화번호 등의 유효성 검증 함수
 *
 * @file Validation Utilities
 * @description Validation functions for email, password, phone number, etc.
 */
// 유효성 검증 규칙 결과 / Validation rule result
export interface ValidationRule {
  /** 번역 키 (UI 표시용) / Translation key (for UI display) */
  key: string;
  /** 규칙 통과 여부 / Whether rule passed */
  passed: boolean;
}

// 비밀번호 유효성 검증 — 최소 8자, 소문자, 숫자, 특수문자 / Password validation — min 8 chars, lowercase, number, special char
export function validatePassword(password: string): ValidationRule[] {
  return [
    { key: 'validation.password.minLength', passed: password.length >= 8 },
    { key: 'validation.password.lowercase', passed: /[a-z]/.test(password) },
    { key: 'validation.password.number', passed: /\d/.test(password) },
    { key: 'validation.password.special', passed: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) },
  ];
}

// 비밀번호 일치 확인 / Confirm password match
export function validatePasswordMatch(password: string, confirm: string): boolean {
  return password.length > 0 && password === confirm;
}

// 이메일 형식 검증 / Email format validation
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// 한국 전화번호 형식 검증 (010, 011 등) / Korean phone number format validation
export function validatePhone(phone: string): boolean {
  return /^01[016789]\d{7,8}$/.test(phone);
}

// 사용자명 검증 — 영문/숫자/언더스코어, 3~50자 / Username validation — alphanumeric+underscore, 3-50 chars
export function validateUsername(username: string): { format: boolean; length: boolean } {
  return {
    format: /^[a-zA-Z0-9_]+$/.test(username),
    length: username.length >= 3 && username.length <= 50,
  };
}

// 주민등록번호 검증 — 앞 6자리 + 뒤 7자리, 성별코드 1~4 / Korean resident number validation — front 6 + back 7 digits, gender code 1-4
export function validateResidentNumber(front: string, back: string): boolean {
  if (front.length !== 6 || back.length !== 7) return false;
  if (!/^\d{6}$/.test(front) || !/^\d{7}$/.test(back)) return false;
  const genderCode = parseInt(back[0], 10);
  return genderCode >= 1 && genderCode <= 4;
}

// 비밀번호 강도 계산 (0~4, 통과한 규칙 수) / Password strength score (0-4, number of passed rules)
export function getPasswordStrength(password: string): number {
  const rules = validatePassword(password);
  return rules.filter((r) => r.passed).length;
}
