/**
 * @file 뉴스 페이지
 * @description 암호화폐, 국내주식, 해외주식 카테고리별 뉴스 조회 페이지 (검색, 날짜 필터, 페이지네이션)
 *
 * @file News Page
 * @description News browsing page with crypto, domestic stock, and foreign stock categories (search, date filter, pagination)
 */
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ExternalLink, Newspaper, Search, Sparkles, X, Loader2 } from 'lucide-react';
import { useNews } from '@/hooks/useNews';
import { useTranslation } from '@/hooks/useTranslation';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useQueryClient } from '@tanstack/react-query';
import { useSettingsStore } from '@/stores/settings';
import Pagination from '@/components/ui/Pagination';
import RefreshControl from '@/components/ui/RefreshControl';
import api from '@/lib/api';
import { cn } from '@/lib/format';

type NewsTab = 'CRYPTO' | 'DOMESTIC_STOCK' | 'FOREIGN_STOCK';

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

// 필터 적용 시 클라이언트 측 페이지네이션을 위한 대량 조회 한도 / Large batch fetch limit for client-side pagination when filtered
const FILTERED_FETCH_LIMIT = 200;

export default function NewsPage() {
  const { t } = useTranslation();
  const locale = useSettingsStore((s) => s.locale);
  const dateLocale = locale === 'ko' ? 'ko-KR' : 'en-US';

  // 카테고리 탭 상태 (암호화폐, 국내주식, 해외주식) / Category tab state (crypto, domestic, foreign)
  const [activeTab, setActiveTabRaw] = useState<NewsTab>('CRYPTO');
  const setActiveTab = useCallback((v: NewsTab) => { setActiveTabRaw(v); window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);

  // 페이지네이션 상태 / Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 검색 및 날짜 필터 상태 / Search and date filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | '24h' | '7d' | '30d'>('24h');

  // AI 분석 상태 / AI analysis state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{ summary: string; highlights: string[]; sentiment: string; sectionAnalysis?: { title: string; content: string }[]; marketOutlook?: string; riskFactors?: string[] } | null>(null);
  const [aiError, setAiError] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  useScrollLock(aiModalOpen);

  // ESC 닫기 / ESC close when modal is open
  useEffect(() => {
    if (!aiModalOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !aiLoading) setAiModalOpen(false); };
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); };
  }, [aiModalOpen, aiLoading]);

  const isFiltered = searchQuery.trim() !== '' || dateFilter !== 'all';

  /**
   * 필터 적용 시 대량 조회 후 클라이언트 측 페이지네이션, 아닐 때 서버 측 페이지네이션
   * When filtered: fetch large batch for client-side pagination; otherwise: server-side pagination
   */
  const apiPage = isFiltered ? 1 : page;
  const apiLimit = isFiltered ? FILTERED_FETCH_LIMIT : pageSize;

  const { data, isLoading } = useNews({ category: activeTab, page: apiPage, limit: apiLimit });

  // 검색/날짜 필터 변경 시 페이지 초기화 / Reset page when search or date filter changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery, dateFilter]);

  // 쿼리 클라이언트 (수동 갱신용) / Query client for manual refresh
  const queryClient = useQueryClient();

  const tabs: { key: NewsTab; label: string }[] = [
    { key: 'CRYPTO', label: t('news.crypto') },
    { key: 'DOMESTIC_STOCK', label: t('news.domesticStock') },
    { key: 'FOREIGN_STOCK', label: t('news.foreignStock') },
  ];

  const handleTabChange = (tab: NewsTab) => {
    setActiveTab(tab);
    setPage(1);
  };

  const dateFilterOptions: { key: typeof dateFilter; label: string }[] = [
    { key: 'all', label: t('news.dateFilter.all') },
    { key: '24h', label: t('news.dateFilter.24h') },
    { key: '7d', label: t('news.dateFilter.7d') },
    { key: '30d', label: t('news.dateFilter.30d') },
  ];

  // 날짜 필터에 해당하는 기준 시점 계산 / Calculate date cutoff for the selected filter
  const getDateCutoff = () => {
    if (dateFilter === 'all') return null;
    const now = new Date();
    if (dateFilter === '24h') return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    if (dateFilter === '7d') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  };

  // 검색어 + 날짜 기준 클라이언트 필터링 / Client-side filtering by search query + date
  const filteredItems = useMemo(() => (data?.items ?? []).filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    if (q && !item.title.toLowerCase().includes(q) && !(item.summary?.toLowerCase().includes(q))) {
      return false;
    }
    const cutoff = getDateCutoff();
    if (cutoff) {
      const itemDate = new Date(item.publishedAt || item.scrapedAt);
      if (itemDate < cutoff) return false;
    }
    return true;
  }), [data?.items, searchQuery, dateFilter]);

  // 필터 적용 시 클라이언트 측 슬라이싱 페이지네이션 / Client-side slice pagination for filtered results
  const displayItems = isFiltered
    ? filteredItems.slice((page - 1) * pageSize, page * pageSize)
    : filteredItems;

  const paginationTotal = isFiltered ? filteredItems.length : (data?.total ?? 0);
  const paginationTotalPages = isFiltered
    ? Math.ceil(filteredItems.length / pageSize)
    : (data?.totalPages ?? 0);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['news'] });
  }, [queryClient]);

  const handleAiAnalysis = useCallback(async () => {
    if (aiLoading) return;
    setAiLoading(true);
    setAiError(false);
    setAiResult(null);
    setAiModalOpen(true);
    try {
      // 뉴스 조회와 AI 분석 요청을 병렬로 시작 — 워터폴 제거
      // Start news fetch and AI analysis in parallel — eliminates waterfall
      const newsPromise = api.get('/api/news', { params: { category: activeTab, page: 1, limit: 200 } });

      const { data: newsData } = await newsPromise;
      const items = newsData?.data?.items ?? newsData?.items ?? [];
      const allItems = items as { title: string; summary: string | null; source: string; publishedAt: string | null; scrapedAt: string }[];
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentItems = allItems
        .filter((item) => new Date(item.publishedAt || item.scrapedAt) >= cutoff && item.title && item.source)
        .slice(0, 50)
        .map((item) => ({ title: item.title, summary: item.summary || undefined, source: item.source, publishedAt: item.publishedAt || undefined }));

      if (!recentItems.length) {
        setAiResult(null);
        setAiLoading(false);
        return;
      }

      const { data: result } = await api.post('/api/ai/news-summary', {
        category: activeTab,
        newsItems: recentItems,
        locale,
      }, { timeout: 60000 });
      // 응답이 { summary, highlights, sentiment } 또는 래핑된 형태일 수 있음
      // Response may be { summary, highlights, sentiment } or wrapped
      const raw = result?.data ?? result;
      const parsed = raw?.summary ? raw : raw?.data ?? raw;
      // 빈 응답 처리 / Handle empty response
      if (parsed && typeof parsed.summary === 'string' && parsed.summary.length > 0) {
        setAiResult(parsed);
      } else {
        setAiResult(null);
      }
    } catch {
      setAiError(true);
    } finally {
      setAiLoading(false);
    }
  }, [activeTab, aiLoading, locale, queryClient]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(dateLocale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="py-6 flex items-center justify-between h-[88px]">
        <div className="flex items-center gap-2.5">
          <Newspaper className="w-5 h-5 text-accent" />
          <h1 className="text-[20px] font-extrabold text-text-primary">
            {t('news.title')}
          </h1>
        </div>
        <RefreshControl intervalSeconds={60} onRefresh={handleRefresh} />
      </div>

      {/* Tab bar */}
      <div className="flex items-center border-b border-border mb-5">
        <div className="flex flex-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={cn(
                'relative px-4 py-2.5 text-[13px] sm:text-[14px] font-semibold transition-colors',
                activeTab === tab.key
                  ? 'text-accent'
                  : 'text-text-tertiary hover:text-text-primary',
              )}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent rounded-t" />
              )}
            </button>
          ))}
        </div>
        {/* AI 분석 버튼 — 탭 섹션 최우측 / AI Analysis button — rightmost in tab section */}
        <button
          onClick={handleAiAnalysis}
          disabled={aiLoading}
          className={cn(
            'flex items-center justify-center gap-2 h-10 min-w-[120px] px-4 rounded-xl text-[13px] font-semibold transition-all duration-150 border shrink-0 ml-auto mb-1',
            aiLoading
              ? 'border-border text-text-quaternary cursor-not-allowed'
              : 'border-accent/30 text-accent hover:bg-accent/10',
          )}
        >
          {aiLoading ? (
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 shrink-0" />
          )}
          {t('news.aiAnalysis')}
        </button>
      </div>

      {/* Search + Date filter + AI Analysis */}
      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-quaternary pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('news.search')}
            className="w-full bg-bg-secondary border border-border rounded-xl pl-9 pr-9 py-2.5 text-[14px] text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-accent/60 transition-colors"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-text-quaternary hover:text-text-primary transition-colors" aria-label="Clear search">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          {dateFilterOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => { setDateFilter(opt.key); setPage(1); }}
              className={cn(
                'px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors whitespace-nowrap',
                dateFilter === opt.key
                  ? 'bg-accent/15 text-accent'
                  : 'text-text-quaternary hover:text-text-tertiary',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* News list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-bg-secondary animate-pulse"
            />
          ))}
        </div>
      ) : !data || displayItems.length === 0 ? (
        <div className="py-24 text-center">
          <Newspaper className="w-10 h-10 mx-auto mb-3 text-text-quaternary" />
          <p className="text-text-quaternary text-[14px]">
            {t('news.noItems')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayItems.map((item) => (
            <a
              key={item.id}
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'block p-4 rounded-xl border border-border',
                'bg-bg-secondary hover:bg-bg-tertiary hover:border-accent/40',
                'transition-colors cursor-pointer group',
              )}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <h2 className="text-[15px] font-semibold text-text-primary leading-snug line-clamp-1 flex-1">
                  {item.title}
                </h2>
                <ExternalLink className="w-3.5 h-3.5 text-text-quaternary shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              {item.summary && (
                <p className="text-[13px] text-text-tertiary leading-relaxed line-clamp-2 mb-2.5">
                  {item.summary}
                </p>
              )}

              <div className="flex items-center gap-2 text-[12px] text-text-quaternary">
                <span className="font-medium text-text-tertiary">
                  {item.source}
                </span>
                <span>·</span>
                <span>
                  {item.publishedAt
                    ? formatDate(item.publishedAt)
                    : formatDate(item.scrapedAt)}
                </span>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && paginationTotalPages > 0 && (
        <Pagination
          page={page}
          totalPages={paginationTotalPages}
          total={paginationTotal}
          limit={pageSize}
          onPageChange={(p) => setPage(p)}
          onLimitChange={(n) => { setPageSize(n); setPage(1); }}
        />
      )}

      {/* AI 분석 모달 / AI Analysis Modal */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="ai-analysis-title">
          {/* 배경 오버레이 / Background overlay */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-modal-backdrop" onClick={() => !aiLoading && setAiModalOpen(false)} />
          {/* 모달 본문 / Modal body */}
          <div className="relative w-full max-w-3xl bg-bg-primary border border-border rounded-2xl shadow-xl max-h-[90vh] flex flex-col overflow-hidden animate-modal-content">
            {/* 모달 헤더 / Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent" />
                <h2 id="ai-analysis-title" className="text-[16px] font-bold text-text-primary">
                  {t('news.aiAnalysis.title')}
                </h2>
                <span className="text-[12px] text-text-quaternary">
                  {tabs.find((tab) => tab.key === activeTab)?.label}
                </span>
              </div>
              <button onClick={() => !aiLoading && setAiModalOpen(false)} aria-label="Close" className="p-1.5 rounded-lg hover:bg-bg-secondary transition-colors">
                <X className="w-4.5 h-4.5 text-text-quaternary" />
              </button>
            </div>

            {/* 모달 콘텐츠 / Modal content */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">
              {aiLoading ? (
                <div className="flex flex-col items-center gap-4 py-16">
                  <Loader2 className="w-8 h-8 text-accent animate-spin" />
                  <p className="text-[14px] text-text-tertiary">{t('news.aiAnalysis.loading')}</p>
                  <p className="text-[12px] text-text-quaternary">{locale === 'ko' ? '심층 분석 중입니다. 잠시만 기다려주세요...' : 'Performing deep analysis. Please wait...'}</p>
                </div>
              ) : aiError ? (
                <div className="text-center py-12">
                  <p className="text-[14px] text-red-500">{t('news.aiAnalysis.error')}</p>
                </div>
              ) : !aiResult ? (
                <div className="text-center py-12">
                  <p className="text-[14px] text-text-quaternary">{t('news.aiAnalysis.noData')}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* 시장 심리 / Market Sentiment */}
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] font-medium text-text-tertiary">{t('news.aiAnalysis.sentiment')}</span>
                    <span className={cn('px-3 py-1 rounded-full text-[12px] font-bold', SENTIMENT_COLOR[aiResult.sentiment] ?? SENTIMENT_COLOR.NEUTRAL)}>
                      {t((SENTIMENT_KEY[aiResult.sentiment] ?? SENTIMENT_KEY.NEUTRAL) as never)}
                    </span>
                  </div>

                  {/* 시장 요약 / Market Summary */}
                  <div className="p-4 rounded-xl bg-bg-secondary/50 border border-border/50">
                    <h3 className="text-[13px] font-bold text-accent mb-2.5">{t('news.aiAnalysis.summary')}</h3>
                    <p className="text-[14px] text-text-primary leading-[1.8] whitespace-pre-line">{aiResult.summary}</p>
                  </div>

                  {/* 핵심 포인트 / Key Highlights */}
                  {aiResult.highlights.length > 0 && (
                    <div>
                      <h3 className="text-[13px] font-bold text-text-secondary mb-3">{t('news.aiAnalysis.highlights')}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {aiResult.highlights.map((h, i) => (
                          <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-bg-secondary/30 border border-border/30">
                            <span className="text-accent font-bold text-[13px] mt-0.5 shrink-0">{i + 1}</span>
                            <span className="text-[13px] text-text-primary leading-relaxed">{h}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 섹션별 분석 / Section Analysis */}
                  {aiResult.sectionAnalysis && aiResult.sectionAnalysis.length > 0 && (
                    <div className="space-y-4">
                      {aiResult.sectionAnalysis.map((section, i) => (
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
                  {aiResult.marketOutlook && (
                    <div className="p-4 rounded-xl bg-accent/5 border border-accent/20">
                      <h3 className="text-[13px] font-bold text-accent mb-2.5">
                        {locale === 'ko' ? '시장 전망' : 'Market Outlook'}
                      </h3>
                      <p className="text-[13px] text-text-primary leading-[1.9] whitespace-pre-line">{aiResult.marketOutlook}</p>
                    </div>
                  )}

                  {/* 리스크 요인 / Risk Factors */}
                  {aiResult.riskFactors && aiResult.riskFactors.length > 0 && (
                    <div>
                      <h3 className="text-[13px] font-bold text-red-500/80 mb-3">
                        {locale === 'ko' ? '리스크 요인' : 'Risk Factors'}
                      </h3>
                      <ul className="space-y-2">
                        {aiResult.riskFactors.map((r, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-[13px] text-text-secondary">
                            <span className="text-red-500/60 mt-0.5 shrink-0">⚠</span>
                            <span className="leading-relaxed">{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 모달 푸터 / Modal footer */}
            {!aiLoading && (
              <div className="flex justify-end px-5 py-3 border-t border-border shrink-0">
                <button
                  onClick={() => setAiModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-bg-secondary text-text-primary hover:bg-bg-tertiary transition-colors"
                >
                  {t('news.aiAnalysis.close')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
