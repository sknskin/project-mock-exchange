/**
 * @file 글로벌 오류 페이지
 * @description 루트 레이아웃 포함 전체가 깨질 때 표시되는 최상위 에러 바운더리
 *
 * @file Global Error Page
 * @description Top-level error boundary shown when the root layout itself fails
 */
'use client';

import { useState, useEffect } from 'react';

type Locale = 'ko' | 'en';
type Theme = 'dark' | 'light';

const texts = {
  ko: {
    title: '서비스 오류',
    desc: '서비스에 일시적인 문제가 발생했습니다.\n잠시 후 다시 시도해주세요.',
    persistent: '지속적으로 오류가 발생하는 경우 관리자에게 연락해주세요.',
    retry: '다시 시도',
    home: '홈으로',
  },
  en: {
    title: 'Service Error',
    desc: 'A temporary issue occurred.\nPlease try again shortly.',
    persistent: 'If the issue persists, please contact the administrator.',
    retry: 'Retry',
    home: 'Home',
  },
};

export default function GlobalError({
  _error,
  reset,
}: {
  _error: Error & { digest?: string };
  reset: () => void;
}) {
  const [locale, setLocale] = useState<Locale>('ko');
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    try {
      const settings = JSON.parse(localStorage.getItem('virtuex-settings') || '{}');
      if (settings.state?.locale) setLocale(settings.state.locale);
      if (settings.state?.theme) setTheme(settings.state.theme);
    } catch { /* ignore parse errors */ }
  }, []);

  const tt = texts[locale];
  const isLight = theme === 'light';

  return (
    <html lang={locale} className={isLight ? 'light' : ''}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>VirtuEx - {tt.title}</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            background: ${isLight ? '#F8F9FA' : '#17171C'};
            color: ${isLight ? '#1A1A1A' : '#ECECEC'};
            font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container { text-align: center; padding: 2rem; max-width: 480px; }
          .icon {
            width: 80px; height: 80px; margin: 0 auto 2rem;
            background: rgba(240, 68, 82, 0.1);
            border-radius: 1rem;
            display: flex; align-items: center; justify-content: center;
          }
          .icon svg { width: 40px; height: 40px; color: #F04452; }
          h1 { font-size: 24px; font-weight: 800; margin-bottom: 0.75rem; }
          .desc {
            font-size: 14px;
            color: ${isLight ? '#6B7683' : '#8B95A1'};
            line-height: 1.6;
            margin-bottom: 0.5rem;
            white-space: pre-line;
          }
          .persistent {
            font-size: 13px;
            color: ${isLight ? '#8B95A1' : '#6B7683'};
            line-height: 1.5;
            margin-bottom: 1.5rem;
          }
          .contact {
            display: flex; align-items: center; justify-content: center; gap: 1rem;
            padding: 0.75rem 1rem; margin-bottom: 1.5rem;
            background: ${isLight ? 'rgba(0,0,0,0.04)' : 'rgba(30,30,36,0.6)'};
            border: 1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'};
            border-radius: 0.75rem;
          }
          .contact a {
            font-size: 12px;
            color: ${isLight ? '#8B95A1' : '#6B7683'};
            text-decoration: none;
            transition: color 0.2s;
          }
          .contact a:hover { color: #3182F6; }
          .contact .sep {
            width: 1px; height: 12px;
            background: ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)'};
          }
          .buttons { display: flex; gap: 0.75rem; justify-content: center; }
          .btn {
            height: 40px; padding: 0 1.5rem; font-size: 14px; font-weight: 700;
            border: none; border-radius: 0.75rem; cursor: pointer;
            transition: background 0.2s;
          }
          .btn-primary { background: #3182F6; color: white; }
          .btn-primary:hover { background: rgba(49,130,246,0.85); }
          .btn-secondary {
            background: ${isLight ? '#E8EBED' : '#1E1E24'};
            color: ${isLight ? '#4E5968' : '#8B95A1'};
          }
          .btn-secondary:hover {
            background: ${isLight ? '#D1D6DB' : '#2A2A32'};
          }
        `}</style>
      </head>
      <body>
        <div className="container">
          <div className="icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <h1>{tt.title}</h1>
          <p className="desc">{tt.desc}</p>
          <p className="persistent">{tt.persistent}</p>
          <div className="contact">
            <a href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'support@virtuex.com'}`}>{process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'support@virtuex.com'}</a>
            <div className="sep" />
            <a href={`tel:${process.env.NEXT_PUBLIC_CONTACT_PHONE || ''}`}>{process.env.NEXT_PUBLIC_CONTACT_PHONE || ''}</a>
          </div>
          <div className="buttons">
            <button className="btn btn-primary" onClick={reset}>{tt.retry}</button>
            <a className="btn btn-secondary" href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>{tt.home}</a>
          </div>
        </div>
      </body>
    </html>
  );
}
