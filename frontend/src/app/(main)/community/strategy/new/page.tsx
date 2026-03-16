/**
 * @file 전략 작성/수정 페이지
 * @description 종목, 제목, 설명, 예상 수익률을 입력하여 전략을 작성하는 페이지
 *
 * @file Strategy Write/Edit Page
 * @description Page for writing strategies with symbol, title, description, and expected return
 */
'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthGuard from '@/components/layout/AuthGuard';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useTranslation } from '@/hooks/useTranslation';
import { useCreateStrategy, useUpdateStrategy, useStrategy } from '@/hooks/useStrategy';
import { ArrowLeft, Send } from 'lucide-react';
import { cn } from '@/lib/format';
import { useEffect } from 'react';

/**
 * Suspense 래퍼 — useSearchParams 사용을 위해 필요
 * Suspense wrapper — required for useSearchParams usage in Next.js 15
 */
export default function StrategyNewPage() {
  return (
    <Suspense fallback={<div className="py-24 text-center text-text-quaternary animate-pulse">Loading...</div>}>
      <StrategyNewContent />
    </Suspense>
  );
}

/** 전략 작성/수정 폼 — 종목 선택 + 제목 + 설명 + 수익률
 * Strategy create/edit form — symbol selector + title + description + performance */
function StrategyNewContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  // URL 파라미터 ?edit=<id> 로 수정 모드 진입 / Enter edit mode via ?edit=<id> URL param
  const editId = searchParams.get('edit');

  // 폼 상태 / Form state
  const [symbol, setSymbol] = useState('ALL');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [performance, setPerformance] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  // API 뮤테이션 훅 / API mutation hooks
  const createStrategy = useCreateStrategy();
  const updateStrategy = useUpdateStrategy();
  // 수정 모드일 때 기존 전략 데이터 조회 / Fetch existing strategy data in edit mode
  const { data: editStrategy } = useStrategy(editId ?? '');

  // 수정 모드 초기화 — 기존 데이터로 폼 채우기 / Initialize edit mode — populate form with existing data
  useEffect(() => {
    if (editStrategy && editId) {
      setSymbol(editStrategy.symbol);
      setTitle(editStrategy.title);
      setDescription(editStrategy.description);
      if (editStrategy.performance != null) {
        setPerformance(String(editStrategy.performance));
      }
    }
  }, [editStrategy, editId]);

  const isEditing = !!editId;
  // 전략 생성/수정 중 하나라도 진행 중이면 true / True if any mutation is pending
  const isPending = createStrategy.isPending || updateStrategy.isPending;

  /**
   * 전략 제출 핸들러 — 수정 시 updateStrategy, 신규 시 createStrategy
   * Submit handler — updateStrategy for edit, createStrategy for new
   */
  const handleSubmit = async () => {
    setShowConfirm(false);
    if (!title.trim() || !description.trim()) return;

    const perfValue = performance.trim() ? parseFloat(performance) : undefined;

    if (isEditing) {
      await updateStrategy.mutateAsync({
        id: editId!,
        symbol,
        title: title.trim(),
        description: description.trim(),
        performance: perfValue,
      });
      router.push(`/community/strategy/${editId}`);
    } else {
      await createStrategy.mutateAsync({
        symbol,
        title: title.trim(),
        description: description.trim(),
        performance: perfValue,
      });
      // 전략 목록 (커뮤니티 전략 탭)으로 이동 / Navigate to community strategies tab
      router.push('/community?tab=strategies');
    }
  };

  return (
    <AuthGuard>
      <div className="pb-16">
        {/* 헤더 / Header */}
        <div className="py-6 flex items-center gap-3 h-[88px]">
          <button onClick={() => router.back()} className="flex items-center justify-center w-8 h-8 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-[20px] font-extrabold text-text-primary">
            {isEditing ? t('strategy.edit') : t('strategy.write')}
          </h1>
        </div>

        <div className="bg-bg-secondary/60 border border-border/60 rounded-2xl p-5 sm:p-6 space-y-5">
          {/* 카테고리 선택 / Category selector */}
          <div>
            <label className="block text-[13px] font-semibold text-text-secondary mb-2">
              {t('strategy.symbol')}
            </label>
            <div className="flex flex-wrap gap-2">
              {([
                { key: 'ALL', label: t('strategy.allSymbols') },
                { key: 'CRYPTO', label: t('community.strategyCrypto') },
                { key: 'STOCK_KR', label: t('community.strategyStockKR') },
                { key: 'STOCK_US', label: t('community.strategyStockUS') },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSymbol(key)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors',
                    symbol === key
                      ? 'bg-accent text-white'
                      : 'bg-bg-tertiary text-text-quaternary hover:text-text-secondary',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 제목 / Title */}
          <div>
            <label className="block text-[13px] font-semibold text-text-secondary mb-2">
              {t('strategy.strategyTitle')}
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('strategy.titlePlaceholder')}
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-bg-tertiary border border-border/50 text-[14px] text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-accent/50"
              maxLength={200}
            />
            <div className="text-right text-[11px] text-text-quaternary mt-1">
              {title.length}/200
            </div>
          </div>

          {/* 설명 / Description */}
          <div>
            <label className="block text-[13px] font-semibold text-text-secondary mb-2">
              {t('strategy.description')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('strategy.descriptionPlaceholder')}
              rows={8}
              className="w-full px-4 py-3 rounded-xl bg-bg-tertiary border border-border/50 text-[14px] text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-accent/50 resize-none"
            />
          </div>

          {/* 예상 수익률 / Expected return */}
          <div>
            <label className="block text-[13px] font-semibold text-text-secondary mb-2">
              {t('strategy.performanceOptional')}
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                value={performance}
                onChange={(e) => setPerformance(e.target.value)}
                placeholder="0.0"
                className="w-full px-4 py-3 pr-8 rounded-xl bg-bg-tertiary border border-border/50 text-[14px] text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-accent/50"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] text-text-quaternary">%</span>
            </div>
          </div>

          {/* 제출 / Submit */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => router.back()}
              className="px-5 py-2.5 rounded-xl bg-bg-tertiary text-text-secondary text-[13px] font-semibold hover:bg-bg-quaternary transition-colors"
            >
              {t('strategy.cancel')}
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              disabled={!title.trim() || !description.trim() || isPending}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-accent text-white text-[13px] font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {isEditing ? t('strategy.edit') : t('strategy.submit')}
            </button>
          </div>
        </div>

        {/* 확인 모달 / Confirm Modal */}
        <ConfirmModal
          isOpen={showConfirm}
          onClose={() => setShowConfirm(false)}
          onConfirm={handleSubmit}
          title={isEditing ? t('strategy.edit') : t('strategy.write')}
          message={isEditing ? t('strategy.updateConfirm') : t('strategy.submitConfirm')}
          loading={isPending}
        />
      </div>
    </AuthGuard>
  );
}
