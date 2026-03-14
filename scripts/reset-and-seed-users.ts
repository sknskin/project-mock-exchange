/**
 * VirtuEx - 사용자 추가 생성 + 데이터 초기화 + 입금 스크립트
 *
 * 1. 신규 사용자 30명 생성 (PENDING 상태 — 승인 대기)
 * 2. 기존 승인 사용자 전원의 포트폴리오/주문/거래 데이터 초기화
 * 3. 기존 승인 사용자 전원에게 10억원 입금
 *
 * 실행: npx ts-node scripts/reset-and-seed-users.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as bcrypt from 'bcrypt';
import { createCipheriv, scryptSync, randomBytes } from 'crypto';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { PrismaClient as AuthPrisma } from '../backend/services/user-auth/generated/prisma';
import { PrismaClient as PortfolioPrisma } from '../backend/services/portfolio/generated/prisma';
import { PrismaClient as OrderPrisma } from '../backend/services/order-engine/generated/prisma';

const authDb = new AuthPrisma({ datasources: { db: { url: process.env.USER_AUTH_DATABASE_URL } } });
const portfolioDb = new PortfolioPrisma({ datasources: { db: { url: process.env.PORTFOLIO_DATABASE_URL } } });
const orderDb = new OrderPrisma({ datasources: { db: { url: process.env.ORDER_ENGINE_DATABASE_URL } } });

const SALT_ROUNDS = 12;
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;

function encryptRrn(raw: string, secret: string): string {
  const key = scryptSync(secret, 'virtuex-salt', KEY_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(raw, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function dec(n: number): string {
  return n.toFixed(8);
}

// 한국 성+이름 조합으로 실명 생성
const LAST_NAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '전'];
const FIRST_NAMES = ['민준', '서연', '지호', '하은', '예준', '지우', '서준', '하윤', '도윤', '수아', '시우', '지민', '주원', '채원', '유준', '소율', '현우', '지아', '건우', '서윤', '우진', '다은', '준서', '수빈', '태윤', '은서', '지환', '소연', '민서', '유진'];

// 서울 주소 목록
const ADDRESSES = [
  '서울특별시 강남구 역삼로 123', '서울특별시 서초구 방배로 45', '서울특별시 송파구 올림픽로 67',
  '서울특별시 마포구 월드컵로 89', '서울특별시 영등포구 여의대로 12', '서울특별시 성동구 왕십리로 34',
  '서울특별시 용산구 한남대로 56', '서울특별시 종로구 세종대로 78', '서울특별시 중구 명동길 90',
  '서울특별시 강동구 천호대로 11', '서울특별시 노원구 동일로 22', '서울특별시 관악구 관악로 33',
  '서울특별시 동작구 상도로 44', '서울특별시 광진구 능동로 55', '서울특별시 은평구 통일로 66',
  '서울특별시 도봉구 도봉로 77', '서울특별시 강서구 공항대로 88', '서울특별시 구로구 디지털로 99',
  '서울특별시 금천구 가산디지털로 100', '서울특별시 양천구 목동로 111', '서울특별시 중랑구 면목로 122',
  '서울특별시 강북구 삼양로 133', '서울특별시 서대문구 연세로 144', '서울특별시 동대문구 왕산로 155',
  '부산광역시 해운대구 해운대로 166', '인천광역시 연수구 송도과학로 177', '대전광역시 유성구 대학로 188',
  '대구광역시 수성구 달구벌대로 199', '광주광역시 서구 상무대로 200', '경기도 성남시 분당구 판교로 211',
];
const ZIP_CODES = [
  '06241', '06580', '05510', '04001', '07241', '04763', '04401', '03154', '04536',
  '05398', '01698', '08832', '06978', '05029', '03407', '01413', '07663', '08389',
  '08505', '07999', '02080', '01030', '03722', '02587', '48095', '21984', '34141',
  '42188', '61945', '13487',
];

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  VirtuEx - 사용자 생성 + 데이터 초기화 + 입금  ║');
  console.log('╚══════════════════════════════════════════════╝');

  const jwtSecret = process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production-must-be-at-least-32-chars-long';

  // ─── 1단계: 기존 사용자 번호 확인 ───
  const existingUsers = await authDb.user.findMany({
    where: { username: { startsWith: 'user' } },
    select: { username: true },
    orderBy: { username: 'asc' },
  });

  // 기존 user 번호 추출 (user1, user2, ... → [1, 2, ...])
  const existingNums = existingUsers
    .map((u) => parseInt(u.username.replace('user', ''), 10))
    .filter((n) => !isNaN(n));
  const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 0;
  const startNum = maxNum + 1;
  const endNum = startNum + 29; // 30명

  console.log(`\n[1/3] 신규 사용자 30명 생성 (user${startNum}~user${endNum}, PENDING 상태)...`);

  const newUsers: { id: string; username: string }[] = [];
  for (let i = 0; i < 30; i++) {
    const num = startNum + i;
    const username = `user${num}`;
    const email = `user${num}@virtuex.com`;
    const name = LAST_NAMES[i % LAST_NAMES.length] + FIRST_NAMES[i % FIRST_NAMES.length];
    const phone = `010${String(20000000 + num).padStart(8, '0')}`;
    const rrn = `${String(85 + (i % 15)).padStart(2, '0')}0${String(1 + (i % 9))}0${String(1 + (i % 2))}${String(1000000 + num).slice(1)}`;
    const address = ADDRESSES[i % ADDRESSES.length];
    const zipCode = ZIP_CODES[i % ZIP_CODES.length];

    // 이미 존재하면 건너뜀
    const existing = await authDb.user.findFirst({ where: { username } });
    if (existing) {
      console.log(`  ✓ ${username} — 이미 존재`);
      newUsers.push({ id: existing.id, username: existing.username });
      continue;
    }

    const passwordHash = await bcrypt.hash('user1234!', SALT_ROUNDS);
    const encryptedRrn = encryptRrn(rrn, jwtSecret);

    const user = await authDb.user.create({
      data: {
        email,
        username,
        passwordHash,
        name,
        role: 'USER',
        isActive: true,
        approvalStatus: 'PENDING', // 승인 대기 상태
        phone,
        encryptedRrn,
        address,
        zipCode,
      },
    });

    newUsers.push({ id: user.id, username: user.username });
    console.log(`  + ${username} (${name}) — PENDING 생성 완료`);
  }

  // ─── 2단계: 승인된 사용자 데이터 초기화 ───
  console.log('\n[2/3] 승인된 사용자 전원의 포트폴리오/주문/거래 데이터 초기화...');

  const approvedUsers = await authDb.user.findMany({
    where: { approvalStatus: 'APPROVED', isActive: true },
    select: { id: true, username: true },
  });

  if (approvedUsers.length === 0) {
    console.log('  ⚠ 승인된 사용자가 없습니다');
  } else {
    const userIds = approvedUsers.map((u) => u.id);

    // 2-1) Order Engine DB 초기화
    const deletedOrders = await orderDb.orderRead.deleteMany({ where: { userId: { in: userIds } } });
    console.log(`  - orders_read: ${deletedOrders.count}건 삭제`);

    const deletedTrades = await orderDb.tradeRead.deleteMany({
      where: { OR: [{ buyerId: { in: userIds } }, { sellerId: { in: userIds } }] },
    });
    console.log(`  - trades_read: ${deletedTrades.count}건 삭제`);

    const deletedSettlements = await orderDb.pendingSettlement.deleteMany({ where: { userId: { in: userIds } } });
    console.log(`  - pending_settlements: ${deletedSettlements.count}건 삭제`);

    // 2-2) Portfolio DB 초기화
    const deletedHoldings = await portfolioDb.holding.deleteMany({ where: { userId: { in: userIds } } });
    console.log(`  - holdings: ${deletedHoldings.count}건 삭제`);

    const deletedTransactions = await portfolioDb.transaction.deleteMany({ where: { userId: { in: userIds } } });
    console.log(`  - transactions: ${deletedTransactions.count}건 삭제`);

    const deletedAccounts = await portfolioDb.account.deleteMany({ where: { userId: { in: userIds } } });
    console.log(`  - accounts: ${deletedAccounts.count}건 삭제`);

    // 관심종목은 삭제하지 않음 (사용자 설정 데이터)
    console.log(`  ✓ ${approvedUsers.length}명의 데이터 초기화 완료`);
  }

  // ─── 3단계: 승인된 사용자에게 10억원 입금 ───
  console.log('\n[3/3] 승인된 사용자 전원에게 ₩1,000,000,000 입금...');

  const DEPOSIT_AMOUNT = 1_000_000_000; // 10억원

  for (const user of approvedUsers) {
    await portfolioDb.$transaction(async (tx) => {
      // 계좌 생성 (upsert)
      await tx.account.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          availableCash: dec(DEPOSIT_AMOUNT),
          reservedCash: dec(0),
        },
        update: {
          availableCash: dec(DEPOSIT_AMOUNT),
          reservedCash: dec(0),
        },
      });

      // 입금 거래 내역 생성
      await tx.transaction.create({
        data: {
          userId: user.id,
          type: 'DEPOSIT',
          cashDelta: dec(DEPOSIT_AMOUNT),
        },
      });
    });

    console.log(`  + ${user.username} — ₩${DEPOSIT_AMOUNT.toLocaleString()} 입금 완료`);
  }

  console.log(`\n✅ 완료!`);
  console.log(`   - 신규 사용자: ${newUsers.length}명 (PENDING)`);
  console.log(`   - 데이터 초기화: ${approvedUsers.length}명`);
  console.log(`   - 10억원 입금: ${approvedUsers.length}명`);
}

main()
  .catch((e) => {
    console.error('\n❌ 실패:', e);
    process.exit(1);
  })
  .finally(async () => {
    await authDb.$disconnect();
    await portfolioDb.$disconnect();
    await orderDb.$disconnect();
  });
