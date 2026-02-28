import {
  validatePassword,
  validatePasswordMatch,
  validateEmail,
  validatePhone,
  validateUsername,
  validateResidentNumber,
  getPasswordStrength,
} from './validation';

describe('validatePassword', () => {
  it('should pass all rules for a strong password', () => {
    const rules = validatePassword('Test1234!');
    expect(rules.every((r) => r.passed)).toBe(true);
  });

  it('should fail minLength for short password', () => {
    const rules = validatePassword('Te1!');
    const minLength = rules.find((r) => r.key === 'validation.password.minLength');
    expect(minLength?.passed).toBe(false);
  });

  it('should fail lowercase for uppercase-only password', () => {
    const rules = validatePassword('TESTTEST1!');
    const lowercase = rules.find((r) => r.key === 'validation.password.lowercase');
    expect(lowercase?.passed).toBe(false);
  });

  it('should fail number for no-digit password', () => {
    const rules = validatePassword('testtest!');
    const number = rules.find((r) => r.key === 'validation.password.number');
    expect(number?.passed).toBe(false);
  });

  it('should fail special for no-special-char password', () => {
    const rules = validatePassword('testtest1');
    const special = rules.find((r) => r.key === 'validation.password.special');
    expect(special?.passed).toBe(false);
  });
});

describe('validatePasswordMatch', () => {
  it('should return true for matching passwords', () => {
    expect(validatePasswordMatch('password1', 'password1')).toBe(true);
  });

  it('should return false for non-matching passwords', () => {
    expect(validatePasswordMatch('password1', 'password2')).toBe(false);
  });

  it('should return false for empty password', () => {
    expect(validatePasswordMatch('', '')).toBe(false);
  });
});

describe('validateEmail', () => {
  it('should accept valid emails', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('user.name@domain.co')).toBe(true);
  });

  it('should reject invalid emails', () => {
    expect(validateEmail('test')).toBe(false);
    expect(validateEmail('test@')).toBe(false);
    expect(validateEmail('@test.com')).toBe(false);
    expect(validateEmail('test @test.com')).toBe(false);
  });
});

describe('validatePhone', () => {
  it('should accept valid Korean phone numbers', () => {
    expect(validatePhone('01012345678')).toBe(true);
    expect(validatePhone('0101234567')).toBe(true);
    expect(validatePhone('01112345678')).toBe(true);
  });

  it('should reject invalid phone numbers', () => {
    expect(validatePhone('02012345678')).toBe(false);
    expect(validatePhone('0101234')).toBe(false);
    expect(validatePhone('phone')).toBe(false);
  });
});

describe('validateUsername', () => {
  it('should pass for valid usernames', () => {
    const result = validateUsername('user_123');
    expect(result.format).toBe(true);
    expect(result.length).toBe(true);
  });

  it('should fail format for special characters', () => {
    const result = validateUsername('user@name');
    expect(result.format).toBe(false);
  });

  it('should fail length for short username', () => {
    const result = validateUsername('ab');
    expect(result.length).toBe(false);
  });

  it('should fail length for long username', () => {
    const result = validateUsername('a'.repeat(51));
    expect(result.length).toBe(false);
  });
});

describe('validateResidentNumber', () => {
  it('should accept valid resident numbers', () => {
    expect(validateResidentNumber('990101', '1234567')).toBe(true);
    expect(validateResidentNumber('990101', '2234567')).toBe(true);
  });

  it('should reject wrong front length', () => {
    expect(validateResidentNumber('99010', '1234567')).toBe(false);
  });

  it('should reject wrong back length', () => {
    expect(validateResidentNumber('990101', '123456')).toBe(false);
  });

  it('should reject invalid gender code', () => {
    expect(validateResidentNumber('990101', '0234567')).toBe(false);
    expect(validateResidentNumber('990101', '5234567')).toBe(false);
  });

  it('should reject non-numeric input', () => {
    expect(validateResidentNumber('99010a', '1234567')).toBe(false);
  });
});

describe('getPasswordStrength', () => {
  it('should return 4 for a strong password', () => {
    expect(getPasswordStrength('Test1234!')).toBe(4);
  });

  it('should return 0 for empty password', () => {
    expect(getPasswordStrength('')).toBe(0);
  });

  it('should return partial score', () => {
    // lowercase + number = 2 (no minLength, no special)
    expect(getPasswordStrength('test1')).toBe(2);
  });
});
