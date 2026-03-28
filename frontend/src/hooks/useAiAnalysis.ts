/**
 * @file AI 뉴스 분석 공통 훅
 * @description 대시보드와 뉴스 페이지에서 공유하는 AI 분석 로직을 추출한 훅
 *
 * @file Shared AI News Analysis Hook
 * @description Hook extracting common AI analysis logic shared between dashboard and news pages
 *
 * BD-M-04: 대시보드/뉴스 AI 핸들러 중복 제거 — 공통 로직을 단일 훅으로 추출
 * BD-M-04: Remove dashboard/news AI handler duplication — extract common logic into a single hook
 */
'use client';

import { useState, useCallback } from 'react';
import api from '@/lib/api';
import { useSettingsStore } from '@/stores/settings';

// AI 분석 시 최근 뉴스 조회 한도 / AI analysis news fetch limit
const AI_ANALYSIS_FETCH_LIMIT = 50;
// 뉴스 최신 기준 시간 (24시간) / News recency cutoff (24 hours)
const NEWS_CUTOFF_MS = 24 * 60 * 60 * 1000;

/** AI 분석 결과 타입 / AI analysis result type */
export interface AiAnalysisResult {
  summary: string;
  highlights: string[];
  sentiment: string;
  sectionAnalysis?: { title: string; content: string }[];
  marketOutlook?: string;
  riskFactors?: string[];
}

/** useAiAnalysis 반환 타입 / useAiAnalysis return type */
export interface UseAiAnalysisReturn {
  loading: boolean;
  result: AiAnalysisResult | null;
  error: boolean;
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  /** AI 분석 실행 / Run AI analysis */
  runAnalysis: (category: string) => Promise<void>;
}

/** AI 뉴스 분석 공통 훅
 * Shared AI news analysis hook */
export function useAiAnalysis(): UseAiAnalysisReturn {
  const locale = useSettingsStore((s) => s.locale);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiAnalysisResult | null>(null);
  const [error, setError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const runAnalysis = useCallback(async (category: string) => {
    if (loading) return;
    setLoading(true);
    setError(false);
    setResult(null);
    setModalOpen(true);

    try {
      // 최근 24시간 뉴스만 조회 / Fetch only recent 24h news
      const { data: newsData } = await api.get('/api/news', {
        params: { category, page: 1, limit: AI_ANALYSIS_FETCH_LIMIT, dateFilter: '24h' },
      });
      const items = newsData?.data?.items ?? newsData?.items ?? [];
      const allItems = items as { title: string; summary: string | null; source: string; publishedAt: string | null; scrapedAt: string }[];
      const cutoff = new Date(Date.now() - NEWS_CUTOFF_MS);
      const recentItems = allItems
        .filter((item) => new Date(item.publishedAt || item.scrapedAt) >= cutoff && item.title && item.source)
        .slice(0, AI_ANALYSIS_FETCH_LIMIT)
        .map((item) => ({ title: item.title, summary: item.summary || undefined, source: item.source, publishedAt: item.publishedAt || undefined }));

      if (!recentItems.length) {
        setResult(null);
        setLoading(false);
        return;
      }

      const { data: apiResult } = await api.post('/api/ai/news-summary', {
        category,
        newsItems: recentItems,
        locale,
      }, { timeout: 60000 });

      const raw = apiResult?.data ?? apiResult;
      const parsed = raw?.summary ? raw : raw?.data ?? raw;

      if (parsed && typeof parsed.summary === 'string' && parsed.summary.length > 0) {
        setResult(parsed);
      } else {
        setResult(null);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [loading, locale]);

  return { loading, result, error, modalOpen, setModalOpen, runAnalysis };
}
