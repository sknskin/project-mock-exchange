/**
 * @file 프론트엔드 공유 상수
 * @description 기술 스택 목록 등 여러 컴포넌트에서 공유하는 상수
 *
 * @file Frontend Shared Constants
 * @description Shared constants used across multiple components (tech stack, etc.)
 */
export interface TechItem {
  name: string;
  icon: string;
}

export const techItems: TechItem[] = [
  { name: 'Next.js', icon: 'https://cdn.simpleicons.org/nextdotjs/FFFFFF' },
  { name: 'React', icon: 'https://cdn.simpleicons.org/react/61DAFB' },
  { name: 'TypeScript', icon: 'https://cdn.simpleicons.org/typescript/3178C6' },
  { name: 'Tailwind CSS', icon: 'https://cdn.simpleicons.org/tailwindcss/06B6D4' },
  { name: 'Zustand', icon: 'https://cdn.simpleicons.org/react/FFD43B' },
  { name: 'TanStack Query', icon: 'https://cdn.simpleicons.org/reactquery/FF4154' },
  { name: 'Socket.IO', icon: 'https://cdn.simpleicons.org/socketdotio/FFFFFF' },
  { name: 'NestJS', icon: 'https://cdn.simpleicons.org/nestjs/E0234E' },
  { name: 'Prisma', icon: 'https://cdn.simpleicons.org/prisma/FFFFFF' },
  { name: 'PostgreSQL', icon: 'https://cdn.simpleicons.org/postgresql/4169E1' },
  { name: 'Redis', icon: 'https://cdn.simpleicons.org/redis/FF4438' },
  { name: 'Apache Kafka', icon: 'https://cdn.simpleicons.org/apachekafka/FFFFFF' },
  { name: 'Docker', icon: 'https://cdn.simpleicons.org/docker/2496ED' },
  { name: 'Turborepo', icon: 'https://cdn.simpleicons.org/turborepo/FFFFFF' },
  { name: 'pnpm', icon: 'https://cdn.simpleicons.org/pnpm/F69220' },
  { name: 'Passport', icon: 'https://cdn.simpleicons.org/passport/34E27A' },
];
