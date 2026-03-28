/**
 * @file 공용 AI 분석 모달 컴포넌트
 * @description 뉴스/대시보드 등에서 공유하는 AI 분석 결과 표시 모달
 *
 * @file Shared AI Analysis Modal Component
 * @description Shared modal for displaying AI analysis results across news/dashboard pages
 *
 * ETC-M-01: 뉴스 AI 모달 인라인 중복 제거 — 공용 모달 컴포넌트 추출
 * ETC-M-01: Remove inline AI modal duplication in news — extract shared modal component
 */
'use client';

import { useRef } from 'react';
import { Sparkles, Loader2, X } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettingsStore } from '@/stores/settings';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { cn } from '@/lib/format';
import type { AiAnalysisResult } from '@/hooks/useAiAnalysis';

const SENTIMENT_COLOR: Record<string, string> = {
  BULLISH: 'text-green-500 bg-green-500/10',
  BEARISH: 'text-red-500 bg-red-500/10',
  NEUTRAL: 'text-text-tertiary bg-bg-secondary',
  MIXED: 'text-yellow-500 bg-yellow-500/10',
};

const SENTIMENT_KEY: Record<string, string> = {
  BULLISH: 'news.aiAnalysis.sentiment.BULLISH',
  BEARISH: 'news.aiAnalysis.sentiment.BEARISH',
  NEUTRAL: 'news.aiAnalysis.sentiment.NEUTRAL',
  MIXED: 'news.aiAnalysis.sentiment.MIXED',
};

interface AiAnalysisModalProps {
  /** 모달 열림 여부 / Whether the modal is open */
  isOpen: boolean;
  /** 모달 닫기 콜백 / Close callback */
  onClose: () => void;
  /** 로딩 상태 / Loading state */
  loading: boolean;
  /** 에러 발생 여부 / Error state */
  error: boolean;
  /** 분석 결과 / Analysis result */
  result: AiAnalysisResult | null;
  /** 모달 제목 (선택) / Modal title (optional) */
  title?: string;
  /** 카테고리 라벨 (선택) / Category label (optional) */
  categoryLabel?: string;
}

export default function AiAnalysisModal({
  isOpen,
  onClose,
  loading,
  error,
  result,
  title,
  categoryLabel,
}: AiAnalysisModalProps) {
  const { t } = useTranslation();
  const locale = useSettingsStore((s) => s.locale);
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, isOpen);
  useScrollLock(isOpen);

  if (!isOpen) return null;

  return (
    <div ref={modalRef} className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="ai-modal-title">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-modal-backdrop" onClick={() => !loading && onClose()} />
      <div className="relative w-full max-w-3xl bg-bg-primary border border-border rounded-2xl shadow-xl max-h-[90vh] flex flex-col overflow-hidden animate-modal-content">
        {/* 헤더 / Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            <h2 id="ai-modal-title" className="text-[16px] font-bold text-text-primary">
              {title || t('news.aiAnalysis.title')}
            </h2>
            {categoryLabel && (
              <span className="text-[12px] text-text-quaternary">{categoryLabel}</span>
            )}
          </div>
          <button onClick={() => !loading && onClose()} aria-label="Close" className="p-1.5 rounded-lg hover:bg-bg-secondary transition-colors">
            <X className="w-4.5 h-4.5 text-text-quaternary" />
          </button>
        </div>

        {/* 콘텐츠 / Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">
          {loading ? (
            <div className="flex flex-col items-center gap-4 py-16">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
              <p className="text-[14px] text-text-tertiary">{t('news.aiAnalysis.loading')}</p>
              <p className="text-[12px] text-text-quaternary">{locale === 'ko' ? '심층 분석 중입니다. 잠시만 기다려주세요...' : 'Performing deep analysis. Please wait...'}</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-[14px] text-red-500">{t('news.aiAnalysis.error')}</p>
            </div>
          ) : !result ? (
            <div className="text-center py-12">
              <p className="text-[14px] text-text-quaternary">{t('news.aiAnalysis.noData')}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 시장 심리 / Market Sentiment */}
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-medium text-text-tertiary">{t('news.aiAnalysis.sentiment')}</span>
                <span className={cn('px-3 py-1 rounded-full text-[12px] font-bold', SENTIMENT_COLOR[result.sentiment] ?? SENTIMENT_COLOR.NEUTRAL)}>
                  {t((SENTIMENT_KEY[result.sentiment] ?? SENTIMENT_KEY.NEUTRAL) as never)}
                </span>
              </div>

              {/* 시장 요약 / Market Summary */}
              <div className="p-4 rounded-xl bg-bg-secondary/50 border border-border/50">
                <h3 className="text-[13px] font-bold text-accent mb-2.5">{t('news.aiAnalysis.summary')}</h3>
                <p className="text-[14px] text-text-primary leading-[1.8] whitespace-pre-line">{result.summary}</p>
              </div>

              {/* 핵심 포인트 / Key Highlights */}
              {result.highlights && result.highlights.length > 0 && (
                <div>
                  <h3 className="text-[13px] font-bold text-text-secondary mb-3">{t('news.aiAnalysis.highlights')}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {result.highlights.map((h, i) => (
                      <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-bg-secondary/30 border border-border/30">
                        <span className="text-accent font-bold text-[13px] mt-0.5 shrink-0">{i + 1}</span>
                        <span className="text-[13px] text-text-primary leading-relaxed">{h}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 섹션별 분석 / Section Analysis */}
              {result.sectionAnalysis && result.sectionAnalysis.length > 0 && (
                <div className="space-y-4">
                  {result.sectionAnalysis.map((section, i) => (
                    <div key={i} className="border border-border/50 rounded-xl overflow-hidden">
                      <div className="px-4 py-2.5 bg-bg-secondary/50 border-b border-border/50">
                        <h3 className="text-[13px] font-bold text-text-primary">{section.title}</h3>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-[13px] text-text-secondary leading-[1.9] whitespace-pre-line">{section.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 시장 전망 / Market Outlook */}
              {result.marketOutlook && (
                <div className="p-4 rounded-xl bg-accent/5 border border-accent/20">
                  <h3 className="text-[13px] font-bold text-accent mb-2.5">
                    {locale === 'ko' ? '시장 전망' : 'Market Outlook'}
                  </h3>
                  <p className="text-[13px] text-text-primary leading-[1.9] whitespace-pre-line">{result.marketOutlook}</p>
                </div>
              )}

              {/* 리스크 요인 / Risk Factors */}
              {result.riskFactors && result.riskFactors.length > 0 && (
                <div>
                  <h3 className="text-[13px] font-bold text-red-500/80 mb-3">
                    {locale === 'ko' ? '리스크 요인' : 'Risk Factors'}
                  </h3>
                  <ul className="space-y-2">
                    {result.riskFactors.map((r, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-[13px] text-text-secondary">
                        <span className="text-red-500/60 mt-0.5 shrink-0">!</span>
                        <span className="leading-relaxed">{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 푸터 / Footer */}
        {!loading && (
          <div className="flex justify-end px-5 py-3 border-t border-border shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-bg-secondary text-text-primary hover:bg-bg-tertiary transition-colors"
            >
              {t('news.aiAnalysis.close')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
