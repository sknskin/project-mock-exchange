'use client';

import { useTranslation } from '@/hooks/useTranslation';

interface TechItem {
  name: string;
  icon: string; // CDN URL for tech logo
}

const techItems: TechItem[] = [
  { name: 'Next.js', icon: 'https://cdn.simpleicons.org/nextdotjs/white' },
  { name: 'React', icon: 'https://cdn.simpleicons.org/react/61DAFB' },
  { name: 'TypeScript', icon: 'https://cdn.simpleicons.org/typescript/3178C6' },
  { name: 'Tailwind CSS', icon: 'https://cdn.simpleicons.org/tailwindcss/06B6D4' },
  { name: 'Zustand', icon: 'https://cdn.simpleicons.org/react/FFD43B' },
  { name: 'TanStack Query', icon: 'https://cdn.simpleicons.org/reactquery/FF4154' },
  { name: 'Socket.IO', icon: 'https://cdn.simpleicons.org/socketdotio/white' },
  { name: 'NestJS', icon: 'https://cdn.simpleicons.org/nestjs/E0234E' },
  { name: 'Prisma', icon: 'https://cdn.simpleicons.org/prisma/white' },
  { name: 'PostgreSQL', icon: 'https://cdn.simpleicons.org/postgresql/4169E1' },
  { name: 'Redis', icon: 'https://cdn.simpleicons.org/redis/FF4438' },
  { name: 'Apache Kafka', icon: 'https://cdn.simpleicons.org/apachekafka/white' },
  { name: 'Docker', icon: 'https://cdn.simpleicons.org/docker/2496ED' },
  { name: 'Turborepo', icon: 'https://cdn.simpleicons.org/turborepo/white' },
  { name: 'pnpm', icon: 'https://cdn.simpleicons.org/pnpm/F69220' },
  { name: 'WebSocket', icon: 'https://cdn.simpleicons.org/websocket/white' },
];

// Duplicate for seamless infinite scroll
const doubledItems = [...techItems, ...techItems];

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-border mt-12 md:mt-20">
      <div className="max-w-[1080px] mx-auto px-5 sm:px-8 lg:px-10 pt-10 md:pt-14">
        {/* Top: Brand + Description horizontal */}
        <div className="flex items-center gap-4 mb-8">
          <span className="font-extrabold text-[18px] text-text-primary tracking-tight shrink-0">
            MockX
          </span>
          <span className="text-[13px] text-text-tertiary">
            — {t('footer.description')}
          </span>
        </div>

        {/* Tech Stack Marquee */}
        <div className="relative overflow-hidden py-6 -mx-5 sm:-mx-8 lg:-mx-10">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-bg-primary to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-bg-primary to-transparent z-10 pointer-events-none" />

          <div className="flex animate-marquee">
            {doubledItems.map((tech, i) => (
              <div
                key={`${tech.name}-${i}`}
                className="flex flex-col items-center gap-2 px-5 shrink-0"
              >
                <div className="w-10 h-10 rounded-xl bg-bg-secondary/80 flex items-center justify-center p-2">
                  <img
                    src={tech.icon}
                    alt={tech.name}
                    className="w-5 h-5 object-contain"
                    loading="lazy"
                  />
                </div>
                <span className="text-[10px] font-medium text-text-quaternary whitespace-nowrap">
                  {tech.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-border">
        <div className="max-w-[1080px] mx-auto px-5 sm:px-8 lg:px-10 py-5">
          <p className="text-[11px] text-text-quaternary">
            {t('footer.rights')}
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </footer>
  );
}
