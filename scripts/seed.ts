/**
 * VirtuEx - 데이터베이스 시드 스크립트
 *
 * 개발 환경 초기 데이터를 생성합니다:
 * - 테스트 사용자 생성 (admin1, admin2) — system 계정은 user-auth 시드에서 별도 생성
 * - 리더보드 테스트를 위한 초기 잔고 및 보유 종목 생성
 * - 전체 채팅방 생성 및 참여자 등록
 *
 * 자산(종목) 데이터는 market-data 서비스 시작 시 자동으로 시드됩니다.
 *
 * 사전 조건:
 *   1. Docker 인프라 실행 (PostgreSQL, Redis, Kafka)
 *   2. user-auth 시드 완료: pnpm --filter user-auth db:seed
 *
 * 실행 방법: pnpm db:seed
 *
 * 멱등성(Idempotent):
 *   이미 존재하는 데이터는 건너뛰므로 여러 번 실행해도 안전합니다.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as bcrypt from 'bcrypt';
import { createCipheriv, scryptSync, randomBytes } from 'crypto';

// .env 파일에서 환경 변수를 로드합니다 (프로젝트 루트 기준)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ─── 각 마이크로서비스별 Prisma 클라이언트 임포트 ────────────────────
// VirtuEx는 서비스별로 독립된 데이터베이스를 사용합니다 (Database-per-Service 패턴)
import { PrismaClient as AuthPrisma } from '../backend/services/user-auth/generated/prisma';
import { PrismaClient as PortfolioPrisma } from '../backend/services/portfolio/generated/prisma';
import { PrismaClient as ChatPrisma } from '../backend/services/chat/generated/prisma';

// 각 서비스 DB에 연결하는 Prisma 인스턴스 생성
const authDb = new AuthPrisma({ datasources: { db: { url: process.env.USER_AUTH_DATABASE_URL } } });       // mex_auth DB
const portfolioDb = new PortfolioPrisma({ datasources: { db: { url: process.env.PORTFOLIO_DATABASE_URL } } }); // mex_portfolio DB
const chatDb = new ChatPrisma({ datasources: { db: { url: process.env.CHAT_DATABASE_URL } } });               // mex_chat DB

// ─── 상수 정의 ───────────────────────────────────────────────────────
const SALT_ROUNDS = 12;          // bcrypt 해시 라운드 수 (비밀번호 해싱 강도)
const ALGORITHM = 'aes-256-gcm'; // 주민등록번호 암호화 알고리즘
const KEY_LENGTH = 32;           // AES-256 키 길이 (바이트)
const IV_LENGTH = 16;            // 초기화 벡터(IV) 길이 (바이트)

/**
 * 주민등록번호(RRN)를 AES-256-GCM 방식으로 암호화합니다.
 *
 * 암호화 결과 형식: "{IV(hex)}:{인증태그(hex)}:{암호문(hex)}"
 * - IV: 매 호출마다 랜덤 생성 → 동일 입력이라도 다른 암호문 생성
 * - 인증 태그: 데이터 무결성 검증용 (GCM 모드 고유)
 * - 키: JWT_SECRET에서 scrypt로 파생
 *
 * @param raw    - 평문 주민등록번호 (예: "9311171052812")
 * @param secret - JWT_SECRET 환경변수 값 (키 파생에 사용)
 * @returns 암호화된 문자열 ("iv:authTag:encrypted" 형식)
 */
function encryptRrn(raw: string, secret: string): string {
  const key = scryptSync(secret, 'virtuex-salt', KEY_LENGTH); // JWT_SECRET으로부터 암호화 키 파생
  const iv = randomBytes(IV_LENGTH);                           // 랜덤 초기화 벡터 생성
  const cipher = createCipheriv(ALGORITHM, key, iv);           // AES-256-GCM 암호화기 생성
  let encrypted = cipher.update(raw, 'utf8', 'hex');           // 평문 → 암호문 변환
  encrypted += cipher.final('hex');                            // 마지막 블록 처리
  const authTag = cipher.getAuthTag();                         // GCM 인증 태그 추출
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * 숫자를 소수점 8자리 문자열로 변환합니다.
 * 포트폴리오 DB의 Decimal(20,8) 필드에 맞는 정밀도입니다.
 *
 * @example dec(128000)  → "128000.00000000"
 * @example dec(0.5)     → "0.50000000"
 */
function dec(n: number): string {
  return n.toFixed(8);
}

// ─── 시드 사용자 정의 ────────────────────────────────────────────────
// system 계정은 user-auth 시드(backend/services/user-auth/prisma/seed.ts)에서 생성되므로
// 여기서는 추가 관리자 계정만 정의합니다.

interface SeedUser {
  email: string;
  username: string;   // 로그인 ID
  password: string;   // 평문 비밀번호 (bcrypt로 해싱하여 저장)
  name: string;       // 실명 (리더보드, 헤더 등에 표시)
  role: 'SYSTEM' | 'ADMIN' | 'USER';  // 사용자 역할
  phone: string;      // 전화번호
  rrn: string;        // 주민등록번호 (AES-256-GCM으로 암호화하여 저장)
  address: string;    // 주소
  zipCode: string;    // 우편번호
}

const SEED_USERS: SeedUser[] = [
  {
    email: 'admin1@virtuex.com',
    username: 'admin1',
    password: 'admin1234!',
    name: '관리자1',
    role: 'ADMIN',           // 관리자 역할: 회원관리, 공지사항 관리 가능
    phone: '01012345678',
    rrn: '8501011234567',
    address: '서울특별시 강남구 테헤란로 123',
    zipCode: '06130',
  },
  {
    email: 'admin2@virtuex.com',
    username: 'admin2',
    password: 'admin1234!',
    name: '관리자2',
    role: 'ADMIN',
    phone: '01098765432',
    rrn: '9001012345678',
    address: '서울특별시 서초구 서초대로 456',
    zipCode: '06620',
  },
];

// ─── 포트폴리오 시드 정의 ────────────────────────────────────────────
// 리더보드에 다양한 순위와 수익률을 보여주기 위해
// 각 사용자별로 다른 입금액과 매수 종목을 설정합니다.
//
// 수익/손실은 매수가(avgCostBasis)와 현재 시장가(basePrice 기반 실시간 시뮬레이션)의
// 차이로 자동 계산됩니다.
//
// 리더보드 계산 공식:
//   총자산 = 가용현금 + 예약현금 + Σ(보유수량 × 현재시세)
//   수익률 = (총자산 - 순입금액) / 순입금액 × 100

/** 개별 매수 주문 정의 */
interface BuyOrder {
  symbol: string;    // 종목 심볼 (예: "BTC-USD", "AAPL")
  quantity: number;  // 매수 수량
  price: number;     // 매수 단가 (USD)
}

/** 사용자별 포트폴리오 시드 정의 */
interface PortfolioSeed {
  username: string;       // 대상 사용자의 username (seedUsers에서 생성된 사용자와 매칭)
  depositAmount: number;  // 초기 입금액 (USD)
  buys: BuyOrder[];       // 매수 주문 목록
}

const PORTFOLIO_SEEDS: PortfolioSeed[] = [
  {
    // ──────────────────────────────────────────────────────────────
    // system (시스템관리자) — 안정적 장기 투자 스타일
    //
    // 입금: $200,000
    // 매수: BTC 1.0개 (@$40,000) + AAPL 100주 (@$180) + NVDA 20주 (@$700)
    // 매수 총액: $40,000 + $18,000 + $14,000 = $72,000
    // 잔여 현금: $128,000
    //
    // 예상 수익: BTC(+5%), AAPL(+2.8%), NVDA(+2.9%) → 전체 약 +1~3% 수익
    // ──────────────────────────────────────────────────────────────
    username: 'system',
    depositAmount: 200000,
    buys: [
      { symbol: 'BTC-USD', quantity: 1.0, price: 40000 },  // 기준가(basePrice) $42,000 → 약 +5% 수익 예상
      { symbol: 'AAPL', quantity: 100, price: 180 },        // 기준가(basePrice) $185 → 약 +2.8% 수익 예상
      { symbol: 'NVDA', quantity: 20, price: 700 },         // 기준가(basePrice) $720 → 약 +2.9% 수익 예상
    ],
  },
  {
    // ──────────────────────────────────────────────────────────────
    // admin1 (관리자1) — 적극적 성장 투자 스타일
    //
    // 입금: $150,000
    // 매수: ETH 10개 (@$2,300) + TSLA 50주 (@$240) + SOL 200개 (@$85)
    // 매수 총액: $23,000 + $12,000 + $17,000 = $52,000
    // 잔여 현금: $98,000
    //
    // 예상 수익: ETH(+8.7%), TSLA(+4.2%), SOL(+11.8%) → 전체 약 +3~5% 수익
    // ──────────────────────────────────────────────────────────────
    username: 'admin1',
    depositAmount: 150000,
    buys: [
      { symbol: 'ETH-USD', quantity: 10, price: 2300 },    // 기준가(basePrice) $2,500 → 약 +8.7% 수익 예상
      { symbol: 'TSLA', quantity: 50, price: 240 },         // 기준가(basePrice) $250 → 약 +4.2% 수익 예상
      { symbol: 'SOL-USD', quantity: 200, price: 85 },      // 기준가(basePrice) $95 → 약 +11.8% 수익 예상
    ],
  },
  {
    // ──────────────────────────────────────────────────────────────
    // admin2 (관리자2) — 보수적 투자 스타일 (일부 종목 손실 발생)
    //
    // 입금: $80,000
    // 매수: MSFT 30주 (@$390) + BTC 0.3개 (@$45,000)
    // 매수 총액: $11,700 + $13,500 = $25,200
    // 잔여 현금: $54,800
    //
    // 예상 손실: MSFT(-2.6%), BTC(-6.7%) → 전체 약 -1~2% 손실
    // ──────────────────────────────────────────────────────────────
    username: 'admin2',
    depositAmount: 80000,
    buys: [
      { symbol: 'MSFT', quantity: 30, price: 390 },         // 기준가(basePrice) $380 → 약 -2.6% 손실 예상
      { symbol: 'BTC-USD', quantity: 0.3, price: 45000 },   // 기준가(basePrice) $42,000 → 약 -6.7% 손실 예상
    ],
  },
];

// =====================================================================
// [1단계] 사용자 시드
// =====================================================================
// mex_auth 데이터베이스에 테스트 사용자를 생성합니다.
// - SYSTEM 사용자가 존재해야 합니다 (approvedBy 참조용)
// - 이미 존재하는 사용자는 건너뜁니다 (멱등성 보장)
// - 비밀번호는 bcrypt로 해싱, 주민번호는 AES-256-GCM으로 암호화하여 저장
// =====================================================================
async function seedUsers(): Promise<{ id: string; username: string; name: string }[]> {
  console.log('\n[1/3] 사용자 시드 중...');
  const jwtSecret = process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production-must-be-at-least-32-chars-long';
  const createdUsers: { id: string; username: string; name: string }[] = [];

  // SYSTEM 사용자 조회 — 신규 사용자의 approvedBy(승인자) 참조에 필요
  const systemUser = await authDb.user.findFirst({ where: { role: 'SYSTEM' } });
  const approvedById = systemUser?.id;

  if (!approvedById) {
    console.log('  ⚠ SYSTEM 사용자가 없습니다. user-auth 시드를 먼저 실행하세요:');
    console.log('    pnpm --filter user-auth db:seed');
    return [];
  }

  // SYSTEM 사용자를 목록 첫번째에 추가 (포트폴리오/채팅방 시드에서도 사용)
  createdUsers.push({ id: systemUser.id, username: systemUser.username, name: systemUser.name });
  console.log(`  ✓ ${systemUser.username} (${systemUser.name}) — SYSTEM (기존 사용자)`);

  // SEED_USERS에 정의된 각 사용자를 순회하며 생성
  for (const u of SEED_USERS) {
    // 이미 같은 username의 사용자가 있으면 건너뜀 (멱등성)
    const existing = await authDb.user.findFirst({ where: { username: u.username } });
    if (existing) {
      console.log(`  ✓ ${u.username} (${u.name}) — 이미 존재하여 건너뜀`);
      createdUsers.push({ id: existing.id, username: existing.username, name: existing.name });
      continue;
    }

    // 비밀번호 해싱 및 주민번호 암호화
    const passwordHash = await bcrypt.hash(u.password, SALT_ROUNDS);
    const encryptedRrn = encryptRrn(u.rrn, jwtSecret);

    // 사용자 레코드 생성 (승인 상태: APPROVED, 활성 상태: true)
    const user = await authDb.user.create({
      data: {
        email: u.email,
        username: u.username,
        passwordHash,
        name: u.name,
        role: u.role,
        isActive: true,
        approvalStatus: 'APPROVED',   // 테스트 사용자이므로 즉시 승인 처리
        approvedAt: new Date(),
        approvedBy: approvedById,     // SYSTEM 사용자가 승인
        phone: u.phone,
        encryptedRrn,
        address: u.address,
        zipCode: u.zipCode,
      },
    });

    console.log(`  + ${user.username} (${user.name}) — ${user.role} 생성 완료`);
    createdUsers.push({ id: user.id, username: user.username, name: user.name });
  }

  return createdUsers;
}

// =====================================================================
// [2단계] 포트폴리오 시드 (입금 + 매수 + 보유종목)
// =====================================================================
// mex_portfolio 데이터베이스에 다음 데이터를 생성합니다:
//   1. accounts 테이블: 사용자별 계좌 (가용현금, 예약현금)
//   2. transactions 테이블: 입금(DEPOSIT) + 매수(BUY) 거래 내역
//   3. holdings 테이블: 보유 종목 (수량, 평균매수가, 총매수금액)
//
// 모든 금액은 Decimal(20,8) 정밀도로 저장되며,
// 하나의 트랜잭션(DB 트랜잭션) 내에서 원자적으로 처리됩니다.
// =====================================================================
async function seedPortfolios(users: { id: string; username: string; name: string }[]) {
  console.log('\n[2/3] 포트폴리오 시드 중...');

  for (const seed of PORTFOLIO_SEEDS) {
    // PORTFOLIO_SEEDS에 정의된 username과 일치하는 사용자 찾기
    const user = users.find((u) => u.username === seed.username);
    if (!user) {
      console.log(`  ⚠ ${seed.username} 사용자를 찾을 수 없어 건너뜁니다`);
      continue;
    }

    // 이미 계좌가 있으면 건너뜀 (멱등성)
    const existing = await portfolioDb.account.findUnique({ where: { userId: user.id } });
    if (existing) {
      console.log(`  ✓ ${seed.username} — 계좌 존재 (현금: $${Number(existing.availableCash).toLocaleString()})`);
      continue;
    }

    // 매수 총비용 계산 → 입금액에서 차감하여 잔여 현금 산출
    let totalBuyCost = 0;
    for (const buy of seed.buys) {
      totalBuyCost += buy.quantity * buy.price;
    }
    const remainingCash = seed.depositAmount - totalBuyCost;

    // DB 트랜잭션으로 계좌 + 거래내역 + 보유종목을 원자적으로 생성
    await portfolioDb.$transaction(async (tx) => {
      // (1) 계좌 생성: 매수 후 남은 현금을 가용 잔고로 설정
      await tx.account.create({
        data: {
          userId: user.id,
          availableCash: dec(remainingCash),  // 입금액 - 매수총액 = 가용 현금
          reservedCash: dec(0),               // 미체결 주문 예약금 (초기: 0)
        },
      });

      // (2) 입금 거래 내역 생성 (리더보드 수익률 계산의 기준이 되는 순입금액)
      await tx.transaction.create({
        data: {
          userId: user.id,
          type: 'DEPOSIT',                    // 거래 유형: 입금
          cashDelta: dec(seed.depositAmount),  // 현금 변동: +입금액
        },
      });

      // (3) 각 매수 주문에 대해 거래 내역 + 보유종목 생성
      for (const buy of seed.buys) {
        const totalCost = buy.quantity * buy.price;  // 매수 총비용 = 수량 × 단가

        // 매수 거래 내역 (현금 감소)
        await tx.transaction.create({
          data: {
            userId: user.id,
            type: 'BUY',                       // 거래 유형: 매수
            symbol: buy.symbol,                // 종목 심볼
            quantity: dec(buy.quantity),        // 매수 수량
            price: dec(buy.price),             // 매수 단가
            cashDelta: dec(-totalCost),         // 현금 변동: -매수금액 (음수)
          },
        });

        // 보유종목 레코드 생성 (userId + symbol이 유니크)
        await tx.holding.create({
          data: {
            userId: user.id,
            symbol: buy.symbol,                // 종목 심볼
            quantity: dec(buy.quantity),        // 보유 수량
            avgCostBasis: dec(buy.price),       // 평균 매수가 (단가)
            totalCost: dec(totalCost),          // 총 매수 비용
          },
        });
      }
    });

    // 생성 결과 출력
    const holdingsSummary = seed.buys.map((b) => `${b.symbol} ${b.quantity}개`).join(', ');
    console.log(`  + ${seed.username} — $${seed.depositAmount.toLocaleString()} 입금, 매수: ${holdingsSummary}`);
    console.log(`    잔여 현금: $${remainingCash.toLocaleString()}`);
  }
}

// =====================================================================
// [2.5단계] 일반 사용자(user2~user12) 초기 자금 시드
// =====================================================================
// auth DB에서 승인(APPROVED) + 활성화(isActive) 상태인 일반 사용자(USER 역할)를 조회하여
// user1을 제외한 user2~user12에 $100,000 초기 자금을 입금합니다.
// - user1은 수동 관리 대상이므로 제외
// - 이미 계좌가 있는 사용자는 건너뜁니다 (멱등성)
// =====================================================================
async function seedUserPortfolios() {
  console.log('\n[2.5/3] 일반 사용자 초기 자금 시드 중...');

  // auth DB에서 승인 + 활성화된 USER 역할 사용자 조회 (user1 제외)
  const activeUsers = await authDb.user.findMany({
    where: {
      role: 'USER',
      isActive: true,
      approvalStatus: 'APPROVED',
      username: { not: 'user1' },  // user1은 수동 입금 대상이므로 제외
    },
    orderBy: { username: 'asc' },
  });

  if (activeUsers.length === 0) {
    console.log('  ⚠ 승인된 일반 사용자가 없습니다 (user1 제외)');
    return;
  }

  const INITIAL_DEPOSIT = 100000; // $100,000 초기 자금

  for (const user of activeUsers) {
    // 이미 계좌가 있으면 건너뜀 (멱등성)
    const existing = await portfolioDb.account.findUnique({ where: { userId: user.id } });
    if (existing) {
      console.log(`  ✓ ${user.username} (${user.name}) — 계좌 이미 존재 ($${Number(existing.availableCash).toLocaleString()})`);
      continue;
    }

    // 계좌 생성 + 입금 거래 내역을 원자적으로 생성
    await portfolioDb.$transaction(async (tx) => {
      await tx.account.create({
        data: {
          userId: user.id,
          availableCash: dec(INITIAL_DEPOSIT),  // $100,000 가용 현금
          reservedCash: dec(0),
        },
      });

      await tx.transaction.create({
        data: {
          userId: user.id,
          type: 'DEPOSIT',
          cashDelta: dec(INITIAL_DEPOSIT),
        },
      });
    });

    console.log(`  + ${user.username} (${user.name}) — $${INITIAL_DEPOSIT.toLocaleString()} 입금 완료`);
  }
}

// =====================================================================
// [3단계] 채팅방 시드
// =====================================================================
// mex_chat 데이터베이스에 전체 채팅방을 생성합니다:
//   1. rooms 테이블: "전체 채팅방" (GROUP 타입)
//   2. participants 테이블: 모든 시드 사용자를 참여자로 등록
//   3. messages 테이블: system 사용자의 환영 메시지
//
// 이미 존재하는 채팅방이 있으면 새 사용자만 참여자로 추가합니다.
// =====================================================================
async function seedChatRooms(users: { id: string; username: string; name: string }[]) {
  console.log('\n[3/3] 채팅방 시드 중...');

  if (users.length === 0) {
    console.log('  ⚠ 사용자가 없어 채팅방 생성을 건너뜁니다');
    return;
  }

  // 기존 전체 채팅방이 있는지 확인
  const existingGlobal = await chatDb.room.findFirst({
    where: { name: '전체 채팅방', type: 'GROUP' },
  });

  if (existingGlobal) {
    console.log(`  ✓ 전체 채팅방 이미 존재 (id: ${existingGlobal.id})`);

    // 기존 채팅방에 새 사용자가 참여하지 않았으면 추가
    // (room_id + user_id 유니크 제약 → findFirst로 존재 여부 확인)
    for (const u of users) {
      const isParticipant = await chatDb.participant.findFirst({
        where: { roomId: existingGlobal.id, userId: u.id },
      });
      if (!isParticipant) {
        await chatDb.participant.create({
          data: { roomId: existingGlobal.id, userId: u.id, username: u.username, name: u.name },
        });
        console.log(`    + ${u.username}을(를) 전체 채팅방에 추가`);
      }
    }
    return;
  }

  // 전체 채팅방 신규 생성 (첫 번째 사용자를 방장으로 설정)
  const creatorId = users[0].id;
  const room = await chatDb.room.create({
    data: {
      name: '전체 채팅방',
      type: 'GROUP',               // 그룹 채팅방 (1:1 DM이 아닌 단체방)
      createdBy: creatorId,        // 방 생성자 (system 사용자)
      participants: {
        create: users.map((u) => ({
          userId: u.id,
          username: u.username,
          name: u.name,
        })),
      },
    },
  });

  console.log(`  + 전체 채팅방 생성 완료 (id: ${room.id})`);
  console.log(`    참여자: ${users.map((u) => u.username).join(', ')}`);

  // system 사용자로 환영 메시지 전송
  const systemUser = users.find((u) => u.username === 'system');
  if (systemUser) {
    await chatDb.message.create({
      data: {
        roomId: room.id,
        senderId: systemUser.id,
        senderUsername: systemUser.username,
        senderName: systemUser.name,
        senderRole: 'SYSTEM',       // 시스템 메시지로 표시
        content: 'VirtuEx 전체 채팅방에 오신 것을 환영합니다!',
      },
    });
    console.log(`    + 환영 메시지 전송 완료`);
  }
}

// ─── 메인 실행 함수 ──────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║     VirtuEx - 데이터베이스 시드      ║');
  console.log('╚══════════════════════════════════════╝');

  // 1단계: 사용자 생성 (mex_auth DB)
  const users = await seedUsers();

  // 2단계: 포트폴리오 생성 (mex_portfolio DB) — 입금, 매수, 보유종목
  await seedPortfolios(users);

  // 2.5단계: 일반 사용자(user2~user12) 초기 자금 $100,000 입금
  await seedUserPortfolios();

  // 3단계: 채팅방 생성 (mex_chat DB) — 전체 채팅방 + 환영 메시지
  await seedChatRooms(users);

  console.log('\n✅ 시드 완료!\n');
}

// 스크립트 실행 및 에러 처리
main()
  .catch((e) => {
    console.error('\n❌ 시드 실패:', e);
    process.exit(1);
  })
  .finally(async () => {
    // 모든 DB 연결 정리 (프로세스 정상 종료 보장)
    await authDb.$disconnect();
    await portfolioDb.$disconnect();
    await chatDb.$disconnect();
  });
