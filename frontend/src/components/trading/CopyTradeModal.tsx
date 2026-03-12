/**
 * @file 카피 트레이딩 모달 컴포넌트
 * @description 카피 트레이딩 시작/수정/중지를 위한 설정 모달
 *
 * @file Copy Trade Modal Component
 * @description Configuration modal for starting/updating/stopping copy trading
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useCopyTradeConfig, useStartCopyTrade, useUpdateCopyTrade, useStopCopyTrade } from '@/hooks/useCopyTrade';
import { cn, formatPercent } from '@/lib/format';
import { X, Copy, AlertTriangle } from 'lucide-react';

// 모달 Props / Modal Props
interface CopyTradeModalProps {
  /** 표시 여부 / Whether to show the modal */
  isOpen: boolean;
  /** 닫기 콜백 / Close callback */
  onClose: () => void;
  /** 트레이더 ID / Trader ID */
  traderId: string;
  /** 트레이더 표시 이름 / Trader display name */
  traderName: string;
  /** 수익률 (%) / Return rate (%) */
  returnRate?: number;
}

/**
 * 카피 트레이딩 설정 모달 — 시작/수정/중지 기능
 * Copy trading configuration modal — start/update/stop functionality
 */
export default function CopyTradeModal({
  isOpen,
  onClose,
  traderId,
  traderName,
  returnRate = 0,
}: CopyTradeModalProps) {
  const { t } = useTranslation();

  // 기존 설정 조회 / Fetch existing config
  const { data: existingConfig } = useCopyTradeConfig(traderId);
  const startMutation = useStartCopyTrade();
  const updateMutation = useUpdateCopyTrade();
  const stopMutation = useStopCopyTrade();

  // 폼 상태 / Form state
  const [scaleRatio, setScaleRatio] = useState(1.0);
  const [maxInvestment, setMaxInvestment] = useState(1000000);
  const [stopLossPercent, setStopLossPercent] = useState<number | ''>('');
  const [confirmStep, setConfirmStep] = useState(false);

  // 현재 활성 상태인지 확인 / Check if currently active
  const isActive = existingConfig?.isActive ?? false;

  // 기존 설정이 있으면 폼에 반영 / Populate form with existing config
  useEffect(() => {
    if (existingConfig) {
      setScaleRatio(Number(existingConfig.scaleRatio) || 1.0);
      setMaxInvestment(Number(existingConfig.maxInvestment) || 1000000);
      setStopLossPercent(existingConfig.stopLossPercent ? Number(existingConfig.stopLossPercent) : '');
    }
  }, [existingConfig]);

  useScrollLock(isOpen);

  // ESC 키로 모달 닫기 / Close modal on ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  /** 시작/수정 핸들러 / Start/Update handler */
  const handleSubmit = useCallback(() => {
    if (!confirmStep) {
      setConfirmStep(true);
      return;
    }

    const payload = {
      traderId,
      scaleRatio,
      maxInvestment,
      ...(stopLossPercent !== '' ? { stopLossPercent: Number(stopLossPercent) } : {}),
    };

    if (isActive) {
      updateMutation.mutate(payload, { onSuccess: () => { setConfirmStep(false); onClose(); } });
    } else {
      startMutation.mutate(payload, { onSuccess: () => { setConfirmStep(false); onClose(); } });
    }
  }, [confirmStep, traderId, scaleRatio, maxInvestment, stopLossPercent, isActive, updateMutation, startMutation, onClose]);

  /** 중지 핸들러 / Stop handler */
  const handleStop = useCallback(() => {
    if (!confirmStep) {
      setConfirmStep(true);
      return;
    }
    stopMutation.mutate(traderId, { onSuccess: () => { setConfirmStep(false); onClose(); } });
  }, [confirmStep, traderId, stopMutation, onClose]);

  if (!isOpen) return null;

  const isPending = startMutation.isPending || updateMutation.isPending || stopMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 / Background overlay */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* 모달 콘텐츠 / Modal content */}
      <div className="relative bg-bg-primary border border-border rounded-2xl p-6 w-[420px] max-w-[calc(100vw-2rem)] shadow-2xl">
        {/* 닫기 버튼 / Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-text-quaternary hover:text-text-primary transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 헤더 — 트레이더 정보 / Header — Trader info */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0">
            <Copy className="w-4 h-4 text-accent" />
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-text-primary">
              {t('copyTrade.title')}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[13px] text-text-secondary">{traderName}</span>
              <span
                className={cn(
                  'text-[12px] font-bold tabular-nums',
                  returnRate >= 0 ? 'text-rise' : 'text-fall',
                )}
              >
                {formatPercent(returnRate)}
              </span>
            </div>
          </div>
        </div>

        {/* 활성 상태 배지 / Active status badge */}
        {isActive && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 mb-4 rounded-lg bg-rise/10 text-rise text-[12px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-rise animate-pulse" />
            {t('copyTrade.copying')}
          </div>
        )}

        {/* 확인 단계 / Confirmation step */}
        {confirmStep ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10">
              <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
              <span className="text-[13px] text-warning">
                {isActive ? t('copyTrade.confirmStop') : t('copyTrade.confirmStart')}
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmStep(false)}
                className="flex-1 h-11 rounded-xl bg-bg-tertiary text-text-secondary text-[14px] font-semibold hover:bg-bg-tertiary/80 transition-colors"
              >
                {t('alert.cancel')}
              </button>
              <button
                onClick={isActive && !updateMutation.isPending ? handleStop : handleSubmit}
                disabled={isPending}
                className={cn(
                  'flex-1 h-11 rounded-xl text-white text-[14px] font-semibold transition-colors',
                  isActive
                    ? 'bg-danger hover:bg-danger/90'
                    : 'bg-accent hover:bg-accent/90',
                  isPending && 'opacity-50 cursor-not-allowed',
                )}
              >
                {isActive ? t('copyTrade.stop') : t('copyTrade.start')}
              </button>
            </div>
          </div>
        ) : (
          /* 설정 폼 / Configuration form */
          <div className="space-y-4">
            {/* 비율 입력 + 슬라이더 / Scale ratio input + slider */}
            <div>
              <label className="block text-[13px] font-semibold text-text-primary mb-1">
                {t('copyTrade.scaleRatio')}
              </label>
              <p className="text-[11px] text-text-quaternary mb-2">
                {t('copyTrade.scaleRatioDesc')}
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0.1"
                  max="5.0"
                  step="0.1"
                  value={scaleRatio}
                  onChange={(e) => setScaleRatio(Number(e.target.value))}
                  className="flex-1 accent-accent"
                />
                <span className="text-[14px] font-bold text-accent tabular-nums w-12 text-right">
                  {scaleRatio.toFixed(1)}x
                </span>
              </div>
            </div>

            {/* 최대 투자금 / Max investment */}
            <div>
              <label className="block text-[13px] font-semibold text-text-primary mb-1">
                {t('copyTrade.maxInvestment')}
              </label>
              <p className="text-[11px] text-text-quaternary mb-2">
                {t('copyTrade.maxInvestmentDesc')}
              </p>
              <input
                type="number"
                value={maxInvestment}
                onChange={(e) => setMaxInvestment(Number(e.target.value))}
                min={0}
                className="w-full px-3 py-2.5 rounded-xl bg-bg-secondary border border-border/50 text-[14px] text-text-primary tabular-nums focus:outline-none focus:border-accent/50"
              />
            </div>

            {/* 손절 비율 (선택) / Stop loss percentage (optional) */}
            <div>
              <label className="block text-[13px] font-semibold text-text-primary mb-1">
                {t('copyTrade.stopLoss')} <span className="text-text-quaternary font-normal">(1-50%)</span>
              </label>
              <p className="text-[11px] text-text-quaternary mb-2">
                {t('copyTrade.stopLossDesc')}
              </p>
              <input
                type="number"
                value={stopLossPercent}
                onChange={(e) => {
                  const val = e.target.value;
                  setStopLossPercent(val === '' ? '' : Math.min(50, Math.max(1, Number(val))));
                }}
                min={1}
                max={50}
                placeholder="-"
                className="w-full px-3 py-2.5 rounded-xl bg-bg-secondary border border-border/50 text-[14px] text-text-primary tabular-nums placeholder:text-text-quaternary focus:outline-none focus:border-accent/50"
              />
            </div>

            {/* 액션 버튼 / Action buttons */}
            <div className="flex gap-3 pt-2">
              {isActive && (
                <button
                  onClick={handleStop}
                  disabled={isPending}
                  className="flex-1 h-11 rounded-xl bg-danger text-white text-[14px] font-semibold hover:bg-danger/90 transition-colors disabled:opacity-50"
                >
                  {t('copyTrade.stop')}
                </button>
              )}
              <button
                onClick={handleSubmit}
                disabled={isPending}
                className="flex-1 h-11 rounded-xl bg-accent text-white text-[14px] font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {isActive ? t('copyTrade.configure') : t('copyTrade.start')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
