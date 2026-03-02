/**
 * @file AI 시장 분석 위젯
 * @description AI 매매 시그널과 시장 분석 정보를 카드 형태로 표시합니다
 *
 * @file AI Market Analysis Widget
 * @description Displays AI market signals and analysis as expandable cards
 */
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/format';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import Skeleton from '@/components/ui/Skeleton';

interface MarketSignal {
  symbol: string;
  signal: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  confidence: number;
  reason: string;
  targetPrice: number;
  stopLoss: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

function useAiSignals() {
  return useQuery<MarketSignal[]>({
    queryKey: ['ai-signals'],
    queryFn: async () => {
      const { data } = await api.get('/api/ai/signals');
      return data;
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

const SIGNAL_CONFIG = {
  STRONG_BUY: { color: 'text-rise', bg: 'bg-rise/12', icon: TrendingUp },
  BUY: { color: 'text-rise', bg: 'bg-rise/8', icon: TrendingUp },
  HOLD: { color: 'text-warning', bg: 'bg-warning/10', icon: Minus },
  SELL: { color: 'text-fall', bg: 'bg-fall/8', icon: TrendingDown },
  STRONG_SELL: { color: 'text-fall', bg: 'bg-fall/12', icon: TrendingDown },
};

const SIGNAL_I18N_KEY = {
  STRONG_BUY: 'ai.signal.strong_buy',
  BUY: 'ai.signal.buy',
  HOLD: 'ai.signal.hold',
  SELL: 'ai.signal.sell',
  STRONG_SELL: 'ai.signal.strong_sell',
} as const;

const RISK_CONFIG = {
  LOW: { color: 'text-success', icon: Shield },
  MEDIUM: { color: 'text-warning', icon: AlertTriangle },
  HIGH: { color: 'text-danger', icon: AlertTriangle },
};

export default function AiInsights() {
  const { t } = useTranslation();
  const { data: signals, isLoading, isError } = useAiSignals();
  const [expanded, setExpanded] = useState<string | null>(null);

  if (isError) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-accent" />
          <h3 className="text-[14px] font-bold text-text-secondary">
            {t('ai.title')}
          </h3>
        </div>
        <div className="bg-bg-secondary rounded-2xl p-6 text-center">
          <AlertTriangle className="w-6 h-6 text-text-quaternary mx-auto mb-2" />
          <p className="text-[13px] text-text-quaternary">
            {t('ai.loadError')}
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-accent" />
          <h3 className="text-[14px] font-bold text-text-secondary">
            {t('ai.title')}
          </h3>
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="w-full h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!signals?.length) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-accent" />
          <h3 className="text-[14px] font-bold text-text-secondary">
            {t('ai.title')}
          </h3>
        </div>
        <span className="text-[10px] text-text-quaternary">
          {t('ai.disclaimer')}
        </span>
      </div>

      <div className="space-y-2">
        {signals.map((signal) => {
          const config = SIGNAL_CONFIG[signal.signal];
          const riskConfig = RISK_CONFIG[signal.riskLevel];
          const SignalIcon = config.icon;
          const isExpanded = expanded === signal.symbol;

          return (
            <div
              key={signal.symbol}
              className="bg-bg-secondary/60 border border-border/60 rounded-xl overflow-hidden transition-all"
            >
              <button
                onClick={() =>
                  setExpanded(isExpanded ? null : signal.symbol)
                }
                className="w-full flex items-center gap-3 px-3.5 py-3 text-left"
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                    config.bg,
                  )}
                >
                  <SignalIcon className={cn('w-4 h-4', config.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-text-primary">
                      {signal.symbol}
                    </span>
                    <span
                      className={cn(
                        'text-[11px] font-bold px-1.5 py-0.5 rounded',
                        config.bg,
                        config.color,
                      )}
                    >
                      {t(
                        SIGNAL_I18N_KEY[signal.signal],
                      ) || signal.signal.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-quaternary truncate mt-0.5">
                    {signal.reason}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-text-quaternary tabular-nums">
                    {signal.confidence}%
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5 text-text-quaternary" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-text-quaternary" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="px-3.5 pb-3 pt-0 border-t border-border/40">
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div className="text-center">
                      <div className="text-[10px] text-text-quaternary">
                        {t('ai.targetPrice')}
                      </div>
                      <div className="text-[12px] font-semibold text-text-primary tabular-nums">
                        ${signal.targetPrice.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] text-text-quaternary">
                        {t('ai.stopLoss')}
                      </div>
                      <div className="text-[12px] font-semibold text-text-primary tabular-nums">
                        ${signal.stopLoss.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] text-text-quaternary">
                        {t('ai.risk')}
                      </div>
                      <div
                        className={cn(
                          'text-[12px] font-semibold',
                          riskConfig.color,
                        )}
                      >
                        {signal.riskLevel}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
