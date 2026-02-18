'use client';

import { useTranslation } from '@/hooks/useTranslation';

const techStack = {
  Frontend: ['Next.js 15', 'React 19', 'TypeScript', 'Tailwind CSS v4', 'Zustand', 'TanStack Query', 'Socket.IO'],
  Backend: ['NestJS', 'Prisma', 'PostgreSQL', 'Redis', 'Kafka', 'WebSocket'],
  Infra: ['Docker', 'Turborepo', 'pnpm'],
};

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-border mt-12 md:mt-20">
      <div className="max-w-[1080px] mx-auto px-5 sm:px-8 lg:px-10 py-10 md:py-14">
        <div className="flex flex-col md:flex-row md:items-start gap-8 md:gap-16">
          {/* Brand */}
          <div className="shrink-0">
            <span className="font-extrabold text-[18px] text-text-primary tracking-tight">
              MockX
            </span>
            <p className="text-[13px] text-text-tertiary mt-2 max-w-[240px] leading-relaxed">
              {t('footer.description')}
            </p>
          </div>

          {/* Tech Stack */}
          <div className="flex-1">
            <h3 className="text-[13px] font-bold text-text-secondary mb-4">
              {t('footer.techStack')}
            </h3>
            <div className="flex flex-wrap gap-x-10 gap-y-4">
              {Object.entries(techStack).map(([category, techs]) => (
                <div key={category}>
                  <span className="text-[11px] font-semibold text-text-quaternary uppercase tracking-wider">
                    {category}
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {techs.map((tech) => (
                      <span
                        key={tech}
                        className="px-2.5 py-1 text-[11px] font-medium text-text-tertiary bg-bg-secondary rounded-md"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-[12px] text-text-quaternary">
            {t('footer.rights')}
          </p>
        </div>
      </div>
    </footer>
  );
}
