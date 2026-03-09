/**
 * @file 프론트엔드 공유 상수
 * @description 기술 스택 목록 등 여러 컴포넌트에서 공유하는 상수
 *
 * @file Frontend Shared Constants
 * @description Shared constants used across multiple components (tech stack, etc.)
 */
// 기술 스택 아이템 인터페이스 / Tech stack item interface
export interface TechItem {
  /** 기술 이름
   * Technology name */
  name: string;
  /** 아이콘 CDN URL
   * Icon CDN URL */
  icon: string;
  /** 라이트 모드에서 색상 반전 여부
   * Whether to invert color in light mode */
  invertInLight?: boolean;
}

// 푸터에 표시할 기술 스택 목록 / Tech stack list displayed in footer marquee
export const techItems: TechItem[] = [
  { name: 'Next.js', icon: 'https://cdn.simpleicons.org/nextdotjs/FFFFFF', invertInLight: true },
  { name: 'React', icon: 'https://cdn.simpleicons.org/react/61DAFB' },
  { name: 'TypeScript', icon: 'https://cdn.simpleicons.org/typescript/3178C6' },
  { name: 'Tailwind CSS', icon: 'https://cdn.simpleicons.org/tailwindcss/06B6D4' },
  { name: 'Zustand', icon: 'https://cdn.simpleicons.org/react/FFD43B' },
  { name: 'TanStack Query', icon: 'https://cdn.simpleicons.org/reactquery/FF4154' },
  { name: 'Socket.IO', icon: 'https://cdn.simpleicons.org/socketdotio/FFFFFF', invertInLight: true },
  { name: 'NestJS', icon: 'https://cdn.simpleicons.org/nestjs/E0234E' },
  { name: 'Prisma', icon: 'https://cdn.simpleicons.org/prisma/FFFFFF', invertInLight: true },
  { name: 'PostgreSQL', icon: 'https://cdn.simpleicons.org/postgresql/4169E1' },
  { name: 'Redis', icon: 'https://cdn.simpleicons.org/redis/FF4438' },
  { name: 'Apache Kafka', icon: 'https://cdn.simpleicons.org/apachekafka/FFFFFF', invertInLight: true },
  { name: 'Docker', icon: 'https://cdn.simpleicons.org/docker/2496ED' },
  { name: 'Turborepo', icon: 'https://cdn.simpleicons.org/turborepo/FFFFFF', invertInLight: true },
  { name: 'pnpm', icon: 'https://cdn.simpleicons.org/pnpm/F69220' },
  { name: 'Passport', icon: 'https://cdn.simpleicons.org/passport/34E27A' },
];
