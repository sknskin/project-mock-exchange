export interface ValidationRule {
  key: string;
  passed: boolean;
}

export function validatePassword(password: string): ValidationRule[] {
  return [
    { key: 'validation.password.minLength', passed: password.length >= 8 },
    { key: 'validation.password.uppercase', passed: /[A-Z]/.test(password) },
    { key: 'validation.password.lowercase', passed: /[a-z]/.test(password) },
    { key: 'validation.password.number', passed: /\d/.test(password) },
    { key: 'validation.password.special', passed: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) },
  ];
}

export function validatePasswordMatch(password: string, confirm: string): boolean {
  return password.length > 0 && password === confirm;
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePhone(phone: string): boolean {
  return /^01[016789]\d{7,8}$/.test(phone);
}

export function validateUsername(username: string): { format: boolean; length: boolean } {
  return {
    format: /^[a-zA-Z0-9_]+$/.test(username),
    length: username.length >= 3 && username.length <= 50,
  };
}

export function validateResidentNumber(front: string, back: string): boolean {
  if (front.length !== 6 || back.length !== 7) return false;
  if (!/^\d{6}$/.test(front) || !/^\d{7}$/.test(back)) return false;
  const genderCode = parseInt(back[0], 10);
  return genderCode >= 1 && genderCode <= 4;
}

export function getPasswordStrength(password: string): number {
  const rules = validatePassword(password);
  return rules.filter((r) => r.passed).length;
}
