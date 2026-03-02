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

  encrypt(secret: string, salt?: string): string {
    // 레코드별 랜덤 솔트 생성 — 하드코딩 솔트 취약점 해소
    // Per-record random salt — eliminates hardcoded salt vulnerability
    const recordSalt = salt || randomBytes(16).toString('hex');
    const key = scryptSync(secret, recordSalt, KEY_LENGTH);
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(this.raw, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    // 형식: salt:iv:authTag:암호화된값 / Format: salt:iv:authTag:encrypted
    return `${recordSalt}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  static decrypt(encrypted: string, secret: string): string {
    const parts = encrypted.split(':');
    let recordSalt: string, ivHex: string, authTagHex: string, data: string;

    if (parts.length === 4) {
      // 새 형식: salt:iv:authTag:data / New format: salt:iv:authTag:data
      [recordSalt, ivHex, authTagHex, data] = parts;
    } else {
      // 레거시 형식 호환: iv:authTag:data (기존 'virtuex-salt' 사용)
      // Legacy format compatibility: iv:authTag:data (uses old 'virtuex-salt')
      [ivHex, authTagHex, data] = parts;
      recordSalt = 'virtuex-salt';
    }

    const key = scryptSync(secret, recordSalt, KEY_LENGTH);
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
