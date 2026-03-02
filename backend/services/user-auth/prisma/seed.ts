/**
 * @file 시스템 계정 시드
 * @description 기존 회원 삭제 후 시스템 계정을 생성합니다
 *
 * @file System Account Seed
 * @description Deletes all existing users and creates the system account
 */
import { PrismaClient } from '../generated/prisma';
import * as bcrypt from 'bcrypt';
import { createCipheriv, scryptSync, randomBytes } from 'crypto';

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;

function encryptRrn(raw: string, secret: string, salt: string = 'virtuex-salt'): string {
  const key = scryptSync(secret, salt, KEY_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(raw, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

async function main() {
  console.log('=== VirtuEx - System Account Seed ===\n');

  // 1. 기존 회원 전부 삭제 / Delete all existing users
  const deleted = await prisma.user.deleteMany();
  console.log(`Deleted ${deleted.count} existing user(s)`);

  // 2. 시스템 계정 생성 / Create system account
  const passwordHash = await bcrypt.hash('SystemPass123!@#', SALT_ROUNDS);
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  const encryptionSalt = process.env.ENCRYPTION_SALT || 'virtuex-salt';
  const encryptedRrn = encryptRrn('0000001234567', jwtSecret, encryptionSalt);

  const systemUser = await prisma.user.create({
    data: {
      email: 'system@naver.com',
      username: 'system',
      passwordHash,
      name: '시스템관리자',
      role: 'SYSTEM',
      isActive: true,
      approvalStatus: 'APPROVED',
      approvedAt: new Date(),
      phone: '01000000000',
      encryptedRrn,
      address: '서울특별시 강남구 테헤란로 123',
      zipCode: '16909',
    },
  });

  // 3. approvedBy를 본인 ID로 업데이트 / Set approvedBy to self
  await prisma.user.update({
    where: { id: systemUser.id },
    data: { approvedBy: systemUser.id },
  });

  console.log(`\nSystem account created:`);
  console.log(`  ID:       ${systemUser.id}`);
  console.log(`  Name:     ${systemUser.name}`);
  console.log(`  Username: ${systemUser.username}`);
  console.log(`  Email:    ${systemUser.email}`);
  console.log(`  Role:     ${systemUser.role}`);
  console.log(`  Status:   ${systemUser.approvalStatus}`);
  console.log(`\nDone!`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
