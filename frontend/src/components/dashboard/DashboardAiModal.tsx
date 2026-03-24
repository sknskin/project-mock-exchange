/**
 * @file 대시보드 AI 시장 분석 모달
 * @description 뉴스 기반 AI 시장 분석 결과를 보여주는 모달 (로딩, 에러, 결과 상태 처리)
 *
 * @file Dashboard AI Market Analysis Modal
 * @description Modal displaying AI market analysis results based on news (handles loading, error, result states)
 */
'use client';

import { useRef } from 'react';
import { Sparkles, Loader2, X } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettingsStore } from '@/stores/settings';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { cn } from '@/lib/format';

/** AI 분석 결과 타입 / AI analysis result type */
export interface AiAnalysisResult {
  summary: string;
  highlights: string[];
  sentiment: string;
  sectionAnalysis?: { title: string; content: string }[];
}

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

interface DashboardAiModalProps {
  /** 모달 열림 여부
   * Whether the modal is open */
  isOpen: boolean;
  /** 모달 닫기 콜백
   * Callback to close the modal */
  onClose: () => void;
  /** AI 분석 로딩 중 여부
   * Whether AI analysis is loading */
  loading: boolean;
  /** AI 분석 에러 발생 여부
   * Whether AI analysis encountered an error */
  error: boolean;
  /** AI 분석 결과 (null이면 데이터 없음)
   * AI analysis result (null means no data) */
  result: AiAnalysisResult | null;
}

export default function DashboardAiModal({ isOpen, onClose, loading, error, result }: DashboardAiModalProps) {
  const { t } = useTranslation();
  const locale = useSettingsStore((s) => s.locale);

  // MOD-M-01: AI 분석 모달 포커스 트랩 — 접근성 향상 / AI analysis modal focus trap — accessibility improvement
  const aiModalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(aiModalRef, isOpen);
  useScrollLock(isOpen);

  if (!isOpen) return null;

  return (
    <div ref={aiModalRef} className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="dashboard-ai-title">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-modal-backdrop" onClick={() => !loading && onClose()} />
      <div className="relative w-full max-w-3xl bg-bg-primary border border-border rounded-2xl shadow-xl max-h-[90vh] flex flex-col overflow-hidden animate-modal-content">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            <h2 id="dashboard-ai-title" className="text-[16px] font-bold text-text-primary">
              {t('dashboard.aiAnalysis.title')}
            </h2>
          </div>
          <button onClick={() => !loading && onClose()} aria-label="Close" className="p-1.5 rounded-lg hover:bg-bg-secondary transition-colors">
            <X className="w-4.5 h-4.5 text-text-quaternary" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">
          {loading ? (
            <div className="flex flex-col items-center gap-4 py-16">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
              <p className="text-[14px] text-text-tertiary">{t('dashboard.aiAnalysis.loading')}</p>
              <p className="text-[12px] text-text-quaternary">{locale === 'ko' ? '심층 분석 중입니다. 잠시만 기다려주세요...' : 'Performing deep analysis. Please wait...'}</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-[14px] text-red-500">{t('dashboard.aiAnalysis.error')}</p>
            </div>
          ) : !result ? (
            <div className="text-center py-12">
              <p className="text-[14px] text-text-quaternary">{t('dashboard.aiAnalysis.noData')}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 시장 심리 / Market Sentiment */}
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-medium text-text-tertiary">{t('dashboard.aiAnalysis.sentiment')}</span>
                <span className={cn('px-3 py-1 rounded-full text-[12px] font-bold', SENTIMENT_COLOR[result.sentiment] ?? SENTIMENT_COLOR.NEUTRAL)}>
                  {t((SENTIMENT_KEY[result.sentiment] ?? SENTIMENT_KEY.NEUTRAL) as never)}
                </span>
              </div>

              {/* 시장 요약 / Market Summary */}
              <div className="p-4 rounded-xl bg-bg-secondary/50 border border-border/50">
                <h3 className="text-[13px] font-bold text-accent mb-2.5">{t('dashboard.aiAnalysis.summary')}</h3>
                <p className="text-[14px] text-text-primary leading-[1.8] whitespace-pre-line">{result.summary}</p>
              </div>

              {/* 핵심 포인트 / Key Highlights */}
              {result.highlights && result.highlights.length > 0 && (
                <div>
                  <h3 className="text-[13px] font-bold text-text-secondary mb-3">{t('dashboard.aiAnalysis.highlights')}</h3>
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
            </div>
          )}
        </div>

        <div className="flex justify-end px-5 py-3 border-t border-border shrink-0">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2 rounded-xl text-[13px] font-semibold text-text-secondary hover:bg-bg-secondary transition-colors"
          >
            {t('news.aiAnalysis.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
