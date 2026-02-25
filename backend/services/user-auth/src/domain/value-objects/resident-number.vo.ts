/**
 * @file 주민등록번호 값 객체
 * @description 주민등록번호의 유효성 검증과 마스킹 처리를 담당합니다
 *
 * @file Resident Number Value Object
 * @description Handles validation and masking of resident registration numbers
 */
import { createCipheriv, createDecipheriv, scryptSync, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;

export class ResidentNumber {
  private constructor(private readonly raw: string) {}

  static from(raw: string): ResidentNumber {
    const cleaned = raw.replace(/-/g, '');
    return new ResidentNumber(cleaned);
  }

  validate(): { valid: boolean; message?: string } {
    if (this.raw.length !== 13) {
      return { valid: false, message: 'Must be 13 digits' };
    }

    if (!/^\d{13}$/.test(this.raw)) {
      return { valid: false, message: 'Must contain only digits' };
    }

    const genderCode = parseInt(this.raw[6], 10);
    if (genderCode < 1 || genderCode > 4) {
      return { valid: false, message: 'Invalid gender code (must be 1-4)' };
    }

    return { valid: true };
  }

  encrypt(secret: string): string {
    const key = scryptSync(secret, 'virtuex-salt', KEY_LENGTH);
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(this.raw, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    // 형식: iv:authTag:암호화된값 / Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  static decrypt(encrypted: string, secret: string): string {
    const [ivHex, authTagHex, data] = encrypted.split(':');
    const key = scryptSync(secret, 'virtuex-salt', KEY_LENGTH);
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  mask(): string {
    // YYMMDD-N****** (마스킹 형식)
    const front = this.raw.slice(0, 6);
    const genderDigit = this.raw[6];
    return `${front}-${genderDigit}******`;
  }

  toString(): string {
    return this.raw;
  }
}
