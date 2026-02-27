/**
 * @file 테스트 회원가입 배치
 * @description 통계 데이터 생성용 — 날짜별 회원가입(PENDING) 유저를 일괄 생성합니다
 *              홀수일: 3명, 짝수일: 4명
 *
 * @file Test Registration Batch
 * @description Bulk-creates PENDING users distributed by date for statistics testing
 *              Odd days: 3 users, Even days: 4 users
 *
 * @usage  npx tsx scripts/seed-test-users.ts
 * @env    USER_AUTH_DATABASE_URL, JWT_SECRET (from .env)
 */
import { PrismaClient } from '../backend/services/user-auth/generated/prisma';
import * as bcrypt from 'bcrypt';
import { createCipheriv, scryptSync, randomBytes } from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.USER_AUTH_DATABASE_URL } },
});

// ─── 설정 (Configuration) ───────────────────────────────────────────

/** 배치 생성 날짜 범위 (Date range for batch creation) */
const DATE_FROM = new Date('2026-02-01T00:00:00Z');
const DATE_TO   = new Date('2026-02-27T23:59:59Z');

/** 공통 비밀번호 (Common password for all test users) */
const PASSWORD = 'ehgml5516!';
const SALT_ROUNDS = 12;

// ─── 주소 풀 (Address pool) ─────────────────────────────────────────

const ADDRESSES = [
  { address: '서울특별시 강남구 테헤란로 152', zipCode: '06236' },
  { address: '서울특별시 서초구 반포대로 201', zipCode: '06579' },
  { address: '서울특별시 마포구 양화로 188', zipCode: '04050' },
  { address: '경기도 성남시 분당구 판교로 256번길 7', zipCode: '13487' },
  { address: '경기도 수원시 영통구 광교로 145', zipCode: '16229' },
  { address: '인천광역시 연수구 센트럴로 350', zipCode: '21984' },
  { address: '부산광역시 해운대구 센텀중앙로 97', zipCode: '48058' },
  { address: '대전광역시 유성구 대학로 99', zipCode: '34134' },
  { address: '대구광역시 동구 동대구로 461', zipCode: '41166' },
  { address: '광주광역시 서구 상무중앙로 110', zipCode: '61945' },
  { address: '경기도 용인시 기흥구 덕영대로 1732', zipCode: '16954' },
  { address: '서울특별시 송파구 올림픽로 300', zipCode: '05551' },
  { address: '서울특별시 영등포구 여의대로 108', zipCode: '07325' },
  { address: '경기도 고양시 일산동구 중앙로 1261', zipCode: '10402' },
  { address: '서울특별시 종로구 세종대로 172', zipCode: '03186' },
];

const DETAIL_SUFFIXES = [
  '101동 501호', '202동 1203호', '303동 801호', '404동 305호',
  'A동 1502호', 'B동 702호', 'C동 903호', '1층', '3층', '5층',
];

// ─── 암호화 유틸 (Encryption utility) ───────────────────────────────

function encryptRrn(raw: string, secret: string): string {
  const key = scryptSync(secret, 'virtuex-salt', 32);
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(raw, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/** 가상의 주민번호 생성 (Generate plausible RRN: YYMMDDGNNNNNN) */
function generateRrn(index: number): string {
  const year = 90 + (index % 11); // 90~00
  const month = (index % 12) + 1;
  const day = (index % 28) + 1;
  const gender = index % 2 === 0 ? 1 : 2; // 1900년대 남/여
  const serial = String(100000 + index).slice(-6);
  return `${String(year).padStart(2, '0')}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}${gender}${serial.slice(0, 5)}${index % 10}`;
}

// ─── 메인 (Main) ───────────────────────────────────────────────────

async function main() {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  console.log('=== VirtuEx - 테스트 회원가입 배치 ===');
  console.log(`날짜 범위: ${DATE_FROM.toISOString().slice(0, 10)} ~ ${DATE_TO.toISOString().slice(0, 10)} (UTC)`);
  console.log(`비밀번호: ${PASSWORD}\n`);

  // 1. 기존 유저 중 가장 높은 번호 찾기 / Find the highest existing user number
  const existingUsers = await prisma.user.findMany({
    where: { username: { startsWith: 'user' } },
    select: { username: true },
  });

  let maxNum = 0;
  for (const u of existingUsers) {
    const num = parseInt(u.username.replace('user', ''), 10);
    if (!isNaN(num) && num > maxNum) maxNum = num;
  }
  console.log(`기존 유저: user1 ~ user${maxNum} (${existingUsers.length}명)`);

  // 2. ADMIN/SYSTEM 유저 ID 조회 (알림 생성용) / Fetch admin IDs for notifications
  const admins = await prisma.user.findMany({
    where: { role: { in: ['SYSTEM', 'ADMIN'] }, isActive: true },
    select: { id: true },
  });

  // 3. 날짜별 유저 생성 계획 / Plan users per date
  const passwordHash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);
  let nextNum = maxNum + 1;
  let totalCreated = 0;

  const currentDate = new Date(DATE_FROM);
  while (currentDate <= DATE_TO) {
    const day = currentDate.getUTCDate();
    const count = day % 2 === 1 ? 3 : 4; // 홀수일 3명, 짝수일 4명

    const usersToCreate = [];
    const notificationsToCreate = [];

    for (let i = 0; i < count; i++) {
      const num = nextNum++;
      const username = `user${num}`;
      const name = `사용자${num}`;
      const email = `user${num}@virtuex.com`;
      const phone = `0101234${String(num).padStart(4, '0')}`;
      const rrn = generateRrn(num);
      const encryptedRrn = encryptRrn(rrn, jwtSecret);
      const addr = ADDRESSES[num % ADDRESSES.length];
      const detail = DETAIL_SUFFIXES[num % DETAIL_SUFFIXES.length];

      // 당일 내 시간 분산 (00:00 ~ 14:00 UTC = 09:00 ~ 23:00 KST) / Distribute within the day
      const hour = Math.floor((i / count) * 14);
      const minute = Math.floor(Math.random() * 60);
      const createdAt = new Date(currentDate);
      createdAt.setUTCHours(hour, minute, Math.floor(Math.random() * 60), 0);

      usersToCreate.push({
        email,
        username,
        passwordHash,
        name,
        role: 'USER' as const,
        isActive: true,
        approvalStatus: 'PENDING' as const,
        phone,
        encryptedRrn,
        address: addr.address,
        addressDetail: detail,
        zipCode: addr.zipCode,
        createdAt,
      });
    }

    // 배치 삽입 / Batch insert
    for (const userData of usersToCreate) {
      const user = await prisma.user.create({ data: userData });

      // ADMIN/SYSTEM에게 알림 생성 (auth.service.ts와 동일)
      if (admins.length > 0) {
        for (const admin of admins) {
          notificationsToCreate.push({
            userId: admin.id,
            type: 'REGISTRATION_REQUEST' as const,
            title: '새 회원가입 요청',
            message: `${userData.username} (${userData.email})님이 회원가입을 요청했습니다.`,
            link: `/admin/users/${user.id}`,
            createdAt: userData.createdAt,
          });
        }
      }
    }

    if (notificationsToCreate.length > 0) {
      await prisma.notification.createMany({ data: notificationsToCreate });
    }

    const y = currentDate.getUTCFullYear();
    const m = String(currentDate.getUTCMonth() + 1).padStart(2, '0');
    const d = String(currentDate.getUTCDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    const dayLabel = day % 2 === 1 ? '홀수' : '짝수';
    console.log(`  ${dateStr} (${dayLabel}일): ${count}명 — user${nextNum - count}~user${nextNum - 1}`);
    totalCreated += count;

    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  console.log(`\n총 ${totalCreated}명 생성 완료 (user${maxNum + 1} ~ user${nextNum - 1})`);
  console.log(`모든 유저 상태: PENDING (승인 대기)`);
  console.log('Done!');
}

main()
  .catch((e) => {
    console.error('Batch failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
