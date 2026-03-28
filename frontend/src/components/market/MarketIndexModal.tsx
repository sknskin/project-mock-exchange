/**
 * @file 시장 지수 상세 모달
 * @description 카테고리별 글로벌 시장 지수를 실시간 데이터로 보여주는 풀스크린 모달
 *
 * @file Market Index Detail Modal
 * @description Full-screen modal showing global market indices by category with live data
 */
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { X, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import { cn, formatPercent } from '@/lib/format';
import { useSettingsStore } from '@/stores/settings';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface IndexData {
  symbol: string;
  nameKo: string;
  nameEn: string;
  category: string;
  price: number;
  change: number;
  changePercent: number;
  sparkline: number[];
}

interface MarketIndexModalProps {
  isOpen: boolean;
  onClose: () => void;
  indices: IndexData[];
  updatedAt: string | null;
  onRefresh: () => void;
  refreshing: boolean;
}

const CATEGORIES = [
  { key: 'us', labelKo: '미국 주요 지수', labelEn: 'US Major Indices', icon: '🇺🇸' },
  { key: 'futures', labelKo: '선물', labelEn: 'Futures', icon: '📈' },
  { key: 'asia', labelKo: '아시아', labelEn: 'Asia', icon: '🌏' },
  { key: 'europe', labelKo: '유럽', labelEn: 'Europe', icon: '🇪🇺' },
  { key: 'forex', labelKo: '환율', labelEn: 'Forex', icon: '💱' },
  { key: 'bonds', labelKo: '채권 금리', labelEn: 'Bond Yields', icon: '🏛️' },
  { key: 'commodities', labelKo: '원자재', labelEn: 'Commodities', icon: '🛢️' },
  { key: 'crypto', labelKo: '암호화폐', labelEn: 'Crypto', icon: '₿' },
] as const;

/* ─── 지수별 설명 / Index descriptions ─── */
const INDEX_DESC: Record<string, { ko: string; en: string }> = {
  '^GSPC':      { ko: '미국 대형주 500개를 추종하는 대표 지수', en: 'Tracks 500 large-cap US companies' },
  '^IXIC':      { ko: '기술주 중심의 미국 성장주 지수', en: 'Tech-heavy US growth stock index' },
  '^DJI':       { ko: '미국 우량 대형주 30개의 가격 가중 지수', en: 'Price-weighted index of 30 blue-chip US stocks' },
  '^SOX':       { ko: '글로벌 반도체 산업의 흐름을 나타내는 지수', en: 'Tracks the global semiconductor industry' },
  '^RUT':       { ko: '미국 소형주 2,000개를 추종하는 지수', en: 'Tracks 2,000 small-cap US stocks' },
  '^VIX':       { ko: '시장 공포 심리를 측정하는 변동성 지수', en: 'Measures market fear via expected volatility' },
  'NQ=F':       { ko: '나스닥 100 지수의 선물 계약', en: 'Futures contract on the Nasdaq-100 index' },
  'ES=F':       { ko: 'S&P 500 지수의 선물 계약', en: 'Futures contract on the S&P 500 index' },
  'YM=F':       { ko: '다우존스 지수의 선물 계약', en: 'Futures contract on the Dow Jones index' },
  '^KS11':      { ko: '한국 유가증권시장 대표 지수', en: 'Korea Exchange main board index' },
  '^KQ11':      { ko: '한국 코스닥 시장 대표 지수', en: 'Korea Exchange growth market index' },
  '^N225':      { ko: '일본 도쿄증권거래소 대형주 225개 지수', en: 'Top 225 stocks on the Tokyo Stock Exchange' },
  '^HSI':       { ko: '홍콩 증시 대형주 지수', en: 'Major Hong Kong stock market index' },
  '000001.SS':  { ko: '중국 상하이 증권거래소 종합 지수', en: 'Shanghai Stock Exchange composite index' },
  '^TWII':      { ko: '대만 증시 전체를 대표하는 가권 지수', en: 'Taiwan Stock Exchange weighted index' },
  '^FTSE':      { ko: '런던 증시 대형주 100개 지수', en: 'Top 100 companies on the London Stock Exchange' },
  '^GDAXI':     { ko: '독일 프랑크푸르트 증시 대표 지수', en: 'Germany\'s primary stock market index' },
  '^STOXX50E':  { ko: '유로존 대형 우량주 50개 지수', en: 'Top 50 blue-chip stocks in the Eurozone' },
  '^FCHI':      { ko: '프랑스 파리 증시 대표 지수', en: 'France\'s benchmark stock market index' },
  'KRW=X':      { ko: '미국 달러 대비 원화 환율', en: 'US Dollar to Korean Won exchange rate' },
  'EURUSD=X':   { ko: '유로 대비 미국 달러 환율', en: 'Euro to US Dollar exchange rate' },
  'JPY=X':      { ko: '미국 달러 대비 일본 엔화 환율', en: 'US Dollar to Japanese Yen exchange rate' },
  'GBPUSD=X':   { ko: '영국 파운드 대비 미국 달러 환율', en: 'British Pound to US Dollar exchange rate' },
  'CNY=X':      { ko: '미국 달러 대비 중국 위안 환율', en: 'US Dollar to Chinese Yuan exchange rate' },
  '^TNX':       { ko: '미국 10년물 국채 금리 — 글로벌 금리 기준', en: 'US 10-year Treasury yield — global rate benchmark' },
  '^TYX':       { ko: '미국 30년물 국채 금리 — 장기 금리 지표', en: 'US 30-year Treasury yield — long-term rate indicator' },
  '^FVX':       { ko: '미국 5년물 국채 금리 — 중기 금리 지표', en: 'US 5-year Treasury yield — mid-term rate indicator' },
  'GC=F':       { ko: '안전자산 대표 — 인플레이션 헤지 수단', en: 'Safe-haven asset — inflation hedge' },
  'SI=F':       { ko: '산업용·투자용 귀금속', en: 'Industrial and investment precious metal' },
  'CL=F':       { ko: '서부 텍사스산 원유 — 글로벌 에너지 기준가', en: 'West Texas crude oil — global energy benchmark' },
  'NG=F':       { ko: '난방·발전용 천연가스 선물', en: 'Natural gas futures for heating and power' },
  'HG=F':       { ko: '구리 선물 — 경기 선행 지표', en: 'Copper futures — leading economic indicator' },
  'BTC-USD':    { ko: '최초이자 최대 시가총액 암호화폐', en: 'First and largest cryptocurrency by market cap' },
  'ETH-USD':    { ko: '스마트 컨트랙트 기반 2위 암호화폐', en: 'Second-largest crypto, powers smart contracts' },
  'SOL-USD':    { ko: '고속·저비용 블록체인 플랫폼', en: 'High-speed, low-cost blockchain platform' },
  'XRP-USD':    { ko: '국제 송금 특화 암호화폐', en: 'Crypto specializing in cross-border payments' },
};

function MiniSparkline({ data, isRise }: { data: number[]; isRise: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    ctx.strokeStyle = isRise ? '#F04452' : '#3182F6';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';

    for (let i = 0; i < data.length; i++) {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((data[i] - min) / range) * h * 0.75 - h * 0.125;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, [data, isRise]);

  return <canvas ref={canvasRef} style={{ width: 64, height: 28 }} />;
}

function formatIndexPrice(symbol: string, price: number): string {
  if (symbol.includes('=X') || symbol.includes('JPY') || symbol.includes('CNY') || symbol.includes('GBP')) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (symbol === '^TNX' || symbol === '^TYX' || symbol === '^FVX') {
    return `${price.toFixed(3)}%`;
  }
  if (symbol === '^VIX') {
    return price.toFixed(2);
  }
  if (price >= 10000) {
    return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
  if (price >= 100) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

export default function MarketIndexModal({ isOpen, onClose, indices, updatedAt, onRefresh, refreshing }: MarketIndexModalProps) {
  const locale = useSettingsStore((s) => s.locale);
  useScrollLock(isOpen);

  // A11Y-L-02 / MOD-M-03: 포커스 트랩 — 모달 내부에 탭 포커스를 가둠
  // A11Y-L-02 / MOD-M-03: Focus trap — traps tab focus within the modal
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, isOpen);

  // ESC 닫기 / ESC close
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); };
  }, [isOpen, onClose]);

  const scrollToCategory = useCallback((key: string) => {
    document.getElementById(`idx-cat-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  if (!isOpen) return null;

  const grouped = CATEGORIES.map((cat) => ({
    ...cat,
    items: indices.filter((idx) => idx.category === cat.key),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      {/* 백드롭 / Backdrop */}
      <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm animate-modal-backdrop" />

      {/* 모달 — 바깥 클릭 시 닫힘 / Modal — closes on outside click */}
      <div
        ref={modalRef}
        className="fixed inset-0 z-[71] flex items-center justify-center p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="market-index-modal-title"
        onClick={onClose}
      >
        <div className="w-full max-w-4xl max-h-[90vh] bg-bg-primary rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden animate-modal-content" onClick={(e) => e.stopPropagation()}>
          {/* 헤더 / Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
            <div>
              <h2 id="market-index-modal-title" className="text-[16px] font-bold text-text-primary">
                {locale === 'ko' ? '글로벌 시장 지수' : 'Global Market Indices'}
              </h2>
              {updatedAt && (
                <p className="text-[11px] text-text-quaternary mt-0.5">
                  {locale === 'ko' ? '마지막 업데이트' : 'Last updated'}: {new Date(updatedAt).toLocaleTimeString(locale === 'ko' ? 'ko-KR' : 'en-US')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onRefresh}
                disabled={refreshing}
                className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors disabled:opacity-50"
              >
                <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>

          {/* 카테고리 네비 / Category nav */}
          <div className="flex items-center gap-1.5 px-5 py-2.5 border-b border-border shrink-0 overflow-x-auto scrollbar-hide">
            {grouped.map((cat) => (
              <button
                key={cat.key}
                onClick={() => scrollToCategory(cat.key)}
                className="shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-medium text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors"
              >
                <span className="mr-1">{cat.icon}</span>
                {locale === 'ko' ? cat.labelKo : cat.labelEn}
              </button>
            ))}
          </div>

          {/* 본문 / Body */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-6">
            {grouped.map((cat) => (
              <section key={cat.key} id={`idx-cat-${cat.key}`}>
                <h3 className="text-[13px] font-bold text-text-secondary mb-3 flex items-center gap-1.5">
                  <span>{cat.icon}</span>
                  {locale === 'ko' ? cat.labelKo : cat.labelEn}
                  <span className="text-[11px] font-normal text-text-quaternary ml-1">({cat.items.length})</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {cat.items.map((idx) => {
                    const isRise = idx.changePercent > 0;
                    const isFall = idx.changePercent < 0;
                    return (
                      <div
                        key={idx.symbol}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-bg-secondary/50 border border-border/50 hover:border-border transition-colors"
                      >
                        {/* 방향 아이콘 / Direction icon */}
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                          isRise ? 'bg-rise/10' : isFall ? 'bg-fall/10' : 'bg-bg-tertiary',
                        )}>
                          {isRise ? <TrendingUp className="w-4 h-4 text-rise" /> :
                           isFall ? <TrendingDown className="w-4 h-4 text-fall" /> :
                           <Minus className="w-4 h-4 text-text-quaternary" />}
                        </div>

                        {/* 이름 + 설명 / Name + description */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-text-primary truncate">
                            {locale === 'ko' ? idx.nameKo : idx.nameEn}
                          </p>
                          <p className="text-[10px] text-text-quaternary truncate">
                            {INDEX_DESC[idx.symbol]
                              ? (locale === 'ko' ? INDEX_DESC[idx.symbol].ko : INDEX_DESC[idx.symbol].en)
                              : idx.symbol}
                          </p>
                        </div>

                        {/* 스파크라인 / Sparkline */}
                        {idx.sparkline.length >= 2 && (
                          <div className="shrink-0">
                            <MiniSparkline data={idx.sparkline} isRise={isRise} />
                          </div>
                        )}

                        {/* 가격 + 등락 / Price + change */}
                        <div className="text-right shrink-0 min-w-[90px]">
                          <p className="text-[14px] font-bold text-text-primary tabular-nums">
                            {formatIndexPrice(idx.symbol, idx.price)}
                          </p>
                          <div className="flex items-center justify-end gap-1">
                            <span className={cn(
                              'text-[11px] font-semibold tabular-nums',
                              isRise && 'text-rise',
                              isFall && 'text-fall',
                              !isRise && !isFall && 'text-text-quaternary',
                            )}>
                              {formatPercent(idx.changePercent)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          {/* 푸터 / Footer */}
          <div className="px-5 py-3 border-t border-border shrink-0">
            <p className="text-[10px] text-text-quaternary text-center">
              {locale === 'ko'
                ? 'Yahoo Finance 실시간 데이터 · 60초마다 자동 갱신'
                : 'Yahoo Finance live data · Auto-refreshes every 60s'}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
