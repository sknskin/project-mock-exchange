/**
 * @file 서비스 오류 컴포넌트
 * @description 서버 연결 실패 등 서비스 오류 시 표시되는 재사용 가능한 에러 UI
 *
 * @file Service Error Component
 * @description Reusable error UI for server connection failures and service errors
 */
'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/format';
import VirtuExLogo from '@/components/ui/VirtuExLogo';

// LD-M-01: 에러 유형 — 네트워크/서버/인증 분기 표시
// LD-M-01: Error type — differentiated display for network/server/auth errors
type ErrorType = 'network' | 'server' | 'auth';

interface ServiceErrorProps {
  onRetry?: () => void;
  /** LD-M-01: 에러 유형 — 'network' | 'server' | 'auth' (기본: 'network')
   * LD-M-01: Error type — 'network' | 'server' | 'auth' (default: 'network') */
  errorType?: ErrorType;
}

const envEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
const envPhone = process.env.NEXT_PUBLIC_CONTACT_PHONE;

// 플레이스홀더/더미 값 감지 — 실제 연락처가 아닌 기본값은 숨김
// Detect placeholder/dummy values — hide default contact info
const isPlaceholder = (v?: string) =>
  !v || /^0{2,}|@example\.com|support@virtuex\.com|000-/.test(v);

// LD-M-01: 에러 유형별 아이콘 배경색 / Error type-specific icon background color
const ERROR_TYPE_BG: Record<ErrorType, string> = {
  network: 'bg-danger/10',
  server: 'bg-warning/10',
  auth: 'bg-accent/10',
};

// LD-M-01: 에러 유형별 아이콘 텍스트 색상 / Error type-specific icon text color
const ERROR_TYPE_COLOR: Record<ErrorType, string> = {
  network: 'text-danger',
  server: 'text-warning',
  auth: 'text-accent',
};

export default function ServiceError({ onRetry, errorType = 'network' }: ServiceErrorProps) {
  const { t } = useTranslation();
  const contactEmail = isPlaceholder(envEmail) ? undefined : envEmail;
  const contactPhone = isPlaceholder(envPhone) ? undefined : envPhone;

  // LD-M-01: 에러 유형별 제목/설명 키 분기 / Branch title/description keys by error type
  const titleKey = errorType === 'auth' ? 'error.authFailed' as const
    : errorType === 'server' ? 'error.serverError' as const
    : 'error.connectionFailed' as const;
  const descKey = errorType === 'auth' ? 'error.authDesc' as const
    : errorType === 'server' ? 'error.serverDesc' as const
    : 'error.connectionDesc' as const;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] pt-8 px-5 text-center">
      {/* 아이콘 / Icon */}
      <div className="relative mb-8">
        <div className={cn('w-20 h-20 rounded-2xl flex items-center justify-center', ERROR_TYPE_BG[errorType])}>
          {/* A11Y-L-01: 장식용 SVG에 aria-hidden 추가 / Add aria-hidden to decorative SVG */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className={cn('w-10 h-10', ERROR_TYPE_COLOR[errorType])}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>
      </div>

      {/* LD-M-01: 에러 유형별 제목 + 설명 / Title + Description branched by error type */}
      <h2 className="text-[22px] font-extrabold text-text-primary mb-3">
        {t(titleKey)}
      </h2>
      <p className="text-[14px] text-text-secondary max-w-[400px] leading-relaxed mb-2">
        {t(descKey)}
      </p>
      <p className="text-[13px] text-text-tertiary max-w-[400px] leading-relaxed mb-6">
        {t('error.persistent')}
      </p>

      {/* 연락처 (env 변수 기반) / Contact (from env vars) */}
      {(contactEmail || contactPhone) && (
        <div className="flex items-center gap-4 mb-6 px-4 py-3 rounded-xl bg-bg-secondary/60 border border-border">
          {contactEmail && (
            <a
              href={`mailto:${contactEmail}`}
              className="flex items-center gap-1.5 text-[12px] text-text-tertiary hover:text-accent transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5" aria-hidden="true">
                <path d="M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3Z" />
                <path d="m19 8.839-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z" />
              </svg>
              {contactEmail}
            </a>
          )}
          {contactEmail && contactPhone && <span className="w-px h-3 bg-border" />}
          {contactPhone && (
            <a
              href={`tel:${contactPhone}`}
              className="flex items-center gap-1.5 text-[12px] text-text-tertiary hover:text-accent transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5" aria-hidden="true">
                <path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1.148a1.5 1.5 0 0 1 1.465 1.175l.716 3.223a1.5 1.5 0 0 1-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 0 0 6.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 0 1 1.767-1.052l3.223.716A1.5 1.5 0 0 1 18 15.352V16.5a1.5 1.5 0 0 1-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 0 1 2.43 8.326 13.019 13.019 0 0 1 2 5V3.5Z" clipRule="evenodd" />
              </svg>
              {contactPhone}
            </a>
          )}
        </div>
      )}

      {/* 버튼 / Buttons */}
      {onRetry && (
        <button
          onClick={onRetry}
          className="h-10 px-6 text-[14px] font-bold text-white bg-accent rounded-xl hover:bg-accent/85 transition-colors"
        >
          {t('error.retry')}
        </button>
      )}

      {/* 로고 / Logo */}
      <div className="mt-10 flex items-center gap-2 opacity-30">
        <VirtuExLogo size={16} />
        <span className="text-[11px] font-semibold text-text-quaternary">VirtuEx</span>
      </div>
    </div>
  );
}
