/**
 * @file 카피 트레이딩 내역 컴포넌트
 * @description 카피 트레이딩 실행 내역을 테이블 형태로 표시합니다
 *
 * @file Copy Trade History Component
 * @description Displays copy trading execution history in a table layout
 */
'use client';

import { useState } from 'react';
import { useCopyTradeHistory } from '@/hooks/useCopyTrade';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/format';
import { History, AlertCircle } from 'lucide-react';
import Pagination from '@/components/ui/Pagination';
import type { TranslationKey } from '@/lib/i18n';
import type { CopyTradeExecution } from '@/types';

// 상태별 배지 색상 매핑 / Status badge color mapping
const STATUS_STYLES: Record<string, string> = {
  EXECUTED: 'bg-rise/10 text-rise',
  FAILED: 'bg-fall/10 text-fall',
  SKIPPED: 'bg-warning/10 text-warning',
  PENDING: 'bg-bg-tertiary text-text-quaternary',
};

/**
 * 날짜 포맷 — 로케일에 따라 다른 형식
 * Date format — varies by locale
 */
function formatDate(dateStr: string, locale: 'ko' | 'en'): string {
  const d = new Date(dateStr);
  if (locale === 'en') {
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

/**
 * 상태 배지 컴포넌트 / Status badge component
 */
function StatusBadge({ status, t }: { status: string; t: (key: TranslationKey) => string }) {
  // 상태에 따른 i18n 키 매핑 / Map status to i18n key
  const labelMap: Record<string, TranslationKey> = {
    EXECUTED: 'copyTrade.executed',
    FAILED: 'copyTrade.failed',
    SKIPPED: 'copyTrade.skipped',
    PENDING: 'copyTrade.pending',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold',
        STATUS_STYLES[status] ?? 'bg-bg-tertiary text-text-quaternary',
      )}
    >
      {t(labelMap[status] ?? 'copyTrade.pending' as TranslationKey)}
    </span>
  );
}

/**
 * 실패 사유 툴팁 / Fail reason tooltip
 */
function FailReasonTooltip({ reason }: { reason: string }) {
  return (
    <span className="group relative inline-flex items-center ml-1 cursor-help">
      <AlertCircle className="w-3.5 h-3.5 text-fall" />
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded bg-bg-secondary border border-border text-[11px] text-text-secondary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
        {reason}
      </span>
    </span>
  );
}

/**
 * 카피 트레이딩 내역 컴포넌트 — 실행 내역 테이블 + 페이지네이션
 * Copy trade history component — execution history table + pagination
 */
export default function CopyTradeHistory() {
  const { t, locale } = useTranslation();
  const [page, setPage] = useState(1);
  const { data: historyData, isLoading } = useCopyTradeHistory(page);

  const executions: CopyTradeExecution[] = historyData?.data ?? [];

  return (
    <div>
      {/* 제목 / Title */}
      <div className="flex items-center gap-2 mb-4">
        <History className="w-4 h-4 text-accent" />
        <h2 className="text-[16px] font-bold text-text-primary">{t('copyTrade.history')}</h2>
      </div>

      {/* 로딩 스켈레톤 / Loading skeleton */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-bg-secondary/60 border border-border/60 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : executions.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            {/* 테이블 헤더 / Table header */}
            <thead>
              <tr className="border-b border-border text-[11px] text-text-quaternary font-medium">
                <th className="py-2.5 px-3 text-left whitespace-nowrap">{t('feed.tradedAt')}</th>
                <th className="py-2.5 px-3 text-left whitespace-nowrap">{t('copyTrade.trader')}</th>
                <th className="py-2.5 px-3 text-left whitespace-nowrap">{t('table.name')}</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">{t('copyTrade.side')}</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">{t('copyTrade.originalQty')}</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">{t('copyTrade.copiedQty')}</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">{t('table.price')}</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">{t('copyTrade.status')}</th>
              </tr>
            </thead>

            {/* 테이블 본문 / Table body */}
            <tbody className="divide-y divide-border/40">
              {executions.map((exec) => {
                const isBuy = exec.side === 'BUY';

                return (
                  <tr key={exec.id} className="hover:bg-bg-secondary/30 transition-colors">
                    {/* 날짜 / Date */}
                    <td className="py-2.5 px-3 text-text-tertiary tabular-nums whitespace-nowrap">
                      {formatDate(exec.createdAt, locale)}
                    </td>
                    {/* 트레이더 / Trader */}
                    <td className="py-2.5 px-3 text-text-secondary font-medium truncate max-w-[120px]">
                      {exec.traderName ?? '-'}
                    </td>
                    {/* 종목 / Symbol */}
                    <td className="py-2.5 px-3 text-text-primary font-semibold">
                      {exec.symbol}
                    </td>
                    {/* 매수/매도 / Buy/Sell */}
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={cn(
                          'text-[11px] font-bold',
                          isBuy ? 'text-rise' : 'text-fall',
                        )}
                      >
                        {exec.side}
                      </span>
                    </td>
                    {/* 원본 수량 / Original qty */}
                    <td className="py-2.5 px-3 text-right text-text-tertiary tabular-nums">
                      {exec.originalQty}
                    </td>
                    {/* 복사 수량 / Copied qty */}
                    <td className="py-2.5 px-3 text-right text-text-primary tabular-nums font-medium">
                      {exec.copiedQty}
                    </td>
                    {/* 가격 / Price */}
                    <td className="py-2.5 px-3 text-right text-text-secondary tabular-nums">
                      {Number(exec.price).toLocaleString()}
                    </td>
                    {/* 상태 / Status */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center">
                        <StatusBadge status={exec.status} t={t} />
                        {exec.status === 'FAILED' && exec.failReason && (
                          <FailReasonTooltip reason={exec.failReason} />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* 빈 상태 / Empty state */
        <div className="py-16 text-center text-text-quaternary text-[14px]">
          {t('notification.empty')}
        </div>
      )}

      {/* 페이지네이션 / Pagination */}
      {historyData && historyData.totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={historyData.totalPages}
          total={historyData.total}
          limit={historyData.limit}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
