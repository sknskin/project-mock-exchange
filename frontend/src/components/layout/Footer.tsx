/**
 * @file 푸터 컴포넌트
 * @description 브랜드, 연락처, 기술 스택 마키, 저작권을 보여주는 푸터
 *
 * @file Footer Component
 * @description Footer with brand, contacts, tech stack marquee, and copyright
 */
'use client';

import { useCallback, useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { techItems } from '@/lib/constants';
import VirtuExLogo from '@/components/ui/VirtuExLogo';

const tripledItems = [...techItems, ...techItems, ...techItems];

const MailIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
    <path d="M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3Z" />
    <path d="m19 8.839-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z" />
  </svg>
);

const GitHubIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
    <path fillRule="evenodd" d="M10 0C4.477 0 0 4.477 0 10c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 10 4.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C17.138 18.163 20 14.418 20 10c0-5.523-4.477-10-10-10Z" clipRule="evenodd" />
  </svg>
);

const PhoneIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
    <path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1.148a1.5 1.5 0 0 1 1.465 1.175l.716 3.223a1.5 1.5 0 0 1-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 0 0 6.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 0 1 1.767-1.052l3.223.716A1.5 1.5 0 0 1 18 15.352V16.5a1.5 1.5 0 0 1-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 0 1 2.43 8.326 13.019 13.019 0 0 1 2 5V3.5Z" clipRule="evenodd" />
  </svg>
);

interface Toast {
  id: number;
  text: string;
  x: number;
  y: number;
}

let toastId = 0;

export default function Footer() {
  const { t } = useTranslation();
  const [toasts, setToasts] = useState<Toast[]>([]);

  const copyToClipboard = useCallback(async (text: string, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    const id = ++toastId;
    setToasts((prev) => [
      ...prev,
      { id, text: t('toast.copied'), x: rect.right + 8, y: rect.top + rect.height / 2 },
    ]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 1500);
  }, [t]);

  return (
    <footer className="border-t border-border mt-12 md:mt-20">
      <div className="max-w-[1080px] mx-auto px-5 sm:px-8 lg:px-10 pt-10 md:pt-14">
        {/* 상단: 브랜드 + 설명 + 연락처 / Top: Brand + Description + Contact */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 shrink-0">
                <VirtuExLogo size={20} />
                <span className="font-extrabold text-[18px] text-text-primary tracking-tight">
                  VirtuEx
                </span>
              </div>
              <span className="text-[13px] text-text-tertiary">
                — {t('footer.description')}
              </span>
            </div>
            <p className="text-[11px] text-text-quaternary pl-[28px]">
              {t('market.dataSourceDesc')}
            </p>
          </div>

          {/* 연락처 링크 / Contact Links */}
          <div className="flex items-center gap-4">
            <button
              onClick={(e) => copyToClipboard('sknskin@naver.com', e)}
              className="flex items-center gap-1.5 text-[12px] text-text-quaternary hover:text-text-secondary transition-colors cursor-pointer"
              title="sknskin@naver.com"
            >
              <MailIcon />
              <span className="hidden lg:inline">sknskin@naver.com</span>
            </button>
            <a
              href="https://github.com/sknskin/project-mock-exchange"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[12px] text-text-quaternary hover:text-text-secondary transition-colors"
              title="GitHub"
            >
              <GitHubIcon />
              <span className="hidden lg:inline">GitHub</span>
            </a>
            <button
              onClick={(e) => copyToClipboard('010-7455-4829', e)}
              className="flex items-center gap-1.5 text-[12px] text-text-quaternary hover:text-text-secondary transition-colors cursor-pointer"
              title="010-7455-4829"
            >
              <PhoneIcon />
              <span className="hidden lg:inline">010-7455-4829</span>
            </button>
          </div>
        </div>

        {/* 기술 스택 마키 / Tech Stack Marquee */}
        <div className="relative overflow-hidden py-6 -mx-5 sm:-mx-8 lg:-mx-10">
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-bg-primary to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-bg-primary to-transparent z-10 pointer-events-none" />

          <div className="animate-marquee">
            {tripledItems.map((tech, i) => (
              <div
                key={`${tech.name}-${i}`}
                className="flex flex-col items-center gap-2 px-5 shrink-0"
              >
                <div className="w-10 h-10 rounded-xl bg-bg-secondary/80 flex items-center justify-center p-2">
                  <img
                    src={tech.icon}
                    alt={tech.name}
                    className="w-5 h-5 object-contain"
                    loading="eager"
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

      {/* 저작권 / Copyright */}
      <div className="border-t border-border">
        <div className="max-w-[1080px] mx-auto px-5 sm:px-8 lg:px-10 py-5 pb-16 md:pb-5">
          <p className="text-[11px] text-text-quaternary">
            {t('footer.rights')}
          </p>
        </div>
      </div>

      {/* 커서 기준 토스트 알림 / Cursor-relative toast notifications */}
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="fixed z-50 pointer-events-none animate-toast-fade"
          style={{ left: toast.x, top: toast.y, transform: 'translateY(-50%)' }}
        >
          <div className="bg-bg-elevated border border-border text-text-primary text-[11px] font-medium px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
            {toast.text}
          </div>
        </div>
      ))}
    </footer>
  );
}
