/**
 * VirtuEx - Database Seeder
 *
 * Seeds initial data for development:
 * - Test users (admin, trader1, trader2)
 * - Initial balances ($100,000 per user)
 * - Global chat room
 *
 * Assets are auto-seeded by market-data service on startup.
 *
 * Usage: pnpm db:seed
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as bcrypt from 'bcrypt';
import { createCipheriv, scryptSync, randomBytes } from 'crypto';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Prisma clients for each service DB
import { PrismaClient as AuthPrisma } from '../backend/services/user-auth/generated/prisma';
import { PrismaClient as PortfolioPrisma } from '../backend/services/portfolio/generated/prisma';
import { PrismaClient as ChatPrisma } from '../backend/services/chat/generated/prisma';

const authDb = new AuthPrisma({ datasources: { db: { url: process.env.USER_AUTH_DATABASE_URL } } });
const portfolioDb = new PortfolioPrisma({ datasources: { db: { url: process.env.PORTFOLIO_DATABASE_URL } } });
const chatDb = new ChatPrisma({ datasources: { db: { url: process.env.CHAT_DATABASE_URL } } });

const SALT_ROUNDS = 12;
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const DEPOSIT_AMOUNT = '100000.00000000'; // $100,000

function encryptRrn(raw: string, secret: string): string {
  const key = scryptSync(secret, 'virtuex-salt', KEY_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(raw, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

interface SeedUser {
  email: string;
  username: string;
  password: string;
  name: string;
  role: 'SYSTEM' | 'ADMIN' | 'USER';
  phone: string;
  rrn: string;
  address: string;
  zipCode: string;
}

const SEED_USERS: SeedUser[] = [
  {
    email: 'admin@virtuex.com',
    username: 'admin',
    password: 'admin1234!',
    name: '관리자',
    role: 'ADMIN',
    phone: '01012345678',
    rrn: '8501011234567',
    address: '서울특별시 강남구 테헤란로 123',
    zipCode: '06130',
  },
  {
    email: 'trader1@virtuex.com',
    username: 'trader1',
    password: 'trader1234!',
    name: '김투자',
    role: 'USER',
    phone: '01098765432',
    rrn: '9001012345678',
    address: '서울특별시 서초구 서초대로 456',
    zipCode: '06620',
  },
  {
    email: 'trader2@virtuex.com',
    username: 'trader2',
    password: 'trader1234!',
    name: '이매매',
    role: 'USER',
    phone: '01011112222',
    rrn: '9203033456789',
    address: '경기도 성남시 분당구 판교로 789',
    zipCode: '13487',
  },
];

// ─── 1. Seed Users ───────────────────────────────────────────────────
async function seedUsers(): Promise<{ id: string; username: string; name: string }[]> {
  console.log('\n[1/3] Seeding users...');
  const jwtSecret = process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production-must-be-at-least-32-chars-long';
  const createdUsers: { id: string; username: string; name: string }[] = [];

  // Find existing SYSTEM user for approvedBy reference
  const systemUser = await authDb.user.findFirst({ where: { role: 'SYSTEM' } });
  const approvedById = systemUser?.id;

  if (!approvedById) {
    console.log('  ⚠ No SYSTEM user found. Run user-auth seed first (pnpm --filter user-auth db:seed)');
    console.log('  Skipping user creation.');
    return [];
  }

  for (const u of SEED_USERS) {
    const existing = await authDb.user.findFirst({ where: { username: u.username } });
    if (existing) {
      console.log(`  ✓ ${u.username} (${u.name}) already exists — skipping`);
      createdUsers.push({ id: existing.id, username: existing.username, name: existing.name });
      continue;
    }

    const passwordHash = await bcrypt.hash(u.password, SALT_ROUNDS);
    const encryptedRrn = encryptRrn(u.rrn, jwtSecret);

    const user = await authDb.user.create({
      data: {
        email: u.email,
        username: u.username,
        passwordHash,
        name: u.name,
        role: u.role,
        isActive: true,
        approvalStatus: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: approvedById,
        phone: u.phone,
        encryptedRrn,
        address: u.address,
        zipCode: u.zipCode,
      },
    });

    console.log(`  + ${user.username} (${user.name}) — ${user.role}`);
    createdUsers.push({ id: user.id, username: user.username, name: user.name });
  }

  // Also include the SYSTEM user in the list for portfolio/chat seeding
  if (systemUser) {
    createdUsers.unshift({ id: systemUser.id, username: systemUser.username, name: systemUser.name });
  }

  return createdUsers;
}

// ─── 2. Seed Portfolio (Deposits) ────────────────────────────────────
async function seedPortfolios(users: { id: string; username: string; name: string }[]) {
  console.log('\n[2/3] Seeding portfolios...');

  for (const u of users) {
    // Check if account already exists
    const existing = await portfolioDb.account.findUnique({ where: { userId: u.id } });
    if (existing) {
      console.log(`  ✓ ${u.username} — account exists (cash: $${Number(existing.availableCash).toLocaleString()})`);
      continue;
    }

    await portfolioDb.$transaction(async (tx) => {
      await tx.account.create({
        data: {
          userId: u.id,
          availableCash: DEPOSIT_AMOUNT,
          reservedCash: '0.00000000',
        },
      });

      await tx.transaction.create({
        data: {
          userId: u.id,
          type: 'DEPOSIT',
          cashDelta: DEPOSIT_AMOUNT,
        },
      });
    });

    console.log(`  + ${u.username} — deposited $100,000`);
  }
}

// ─── 3. Seed Chat Room ──────────────────────────────────────────────
async function seedChatRooms(users: { id: string; username: string; name: string }[]) {
  console.log('\n[3/3] Seeding chat rooms...');

  if (users.length === 0) {
    console.log('  ⚠ No users — skipping chat room creation');
    return;
  }

  // Check for existing global room
  const existingGlobal = await chatDb.room.findFirst({
    where: { name: '전체 채팅방', type: 'GROUP' },
  });

  if (existingGlobal) {
    console.log(`  ✓ Global chat room already exists (id: ${existingGlobal.id})`);
    // Add any new users who aren't already participants
    for (const u of users) {
      const isParticipant = await chatDb.participant.findFirst({
        where: { roomId: existingGlobal.id, userId: u.id, leftAt: null },
      });
      if (!isParticipant) {
        await chatDb.participant.create({
          data: { roomId: existingGlobal.id, userId: u.id, username: u.username, name: u.name },
        });
        console.log(`    + Added ${u.username} to global room`);
      }
    }
    return;
  }

  const creatorId = users[0].id;
  const room = await chatDb.room.create({
    data: {
      name: '전체 채팅방',
      type: 'GROUP',
      createdBy: creatorId,
      participants: {
        create: users.map((u) => ({
          userId: u.id,
          username: u.username,
          name: u.name,
        })),
      },
    },
  });

  console.log(`  + Global chat room created (id: ${room.id})`);
  console.log(`    Participants: ${users.map((u) => u.username).join(', ')}`);

  // Send a welcome message from the system user
  const systemUser = users.find((u) => u.username === 'system');
  if (systemUser) {
    await chatDb.message.create({
      data: {
        roomId: room.id,
        senderId: systemUser.id,
        senderUsername: systemUser.username,
        senderName: systemUser.name,
        senderRole: 'SYSTEM',
        content: 'VirtuEx 전체 채팅방에 오신 것을 환영합니다! 🎉',
      },
    });
    console.log(`    + Welcome message sent`);
  }
}

// ─── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║     VirtuEx - Database Seeder        ║');
  console.log('╚══════════════════════════════════════╝');

  const users = await seedUsers();
  await seedPortfolios(users);
  await seedChatRooms(users);

  console.log('\n✅ Seed complete!\n');
}

main()
  .catch((e) => {
    console.error('\n❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await authDb.$disconnect();
    await portfolioDb.$disconnect();
    await chatDb.$disconnect();
  });
