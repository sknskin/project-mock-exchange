/**
 * @file 통화 표시 전환 훅
 * @description 원화/달러 표시 모드를 토글하는 Zustand 스토어
 *
 * @file Currency Display Toggle Hook
 * @description Zustand store for toggling KRW/USD display mode
 */
'use client';
import { create } from 'zustand';

type CurrencyDisplay = 'original' | 'krw';

interface CurrencyDisplayState {
  display: CurrencyDisplay;
  toggle: () => void;
}

export const useCurrencyDisplay = create<CurrencyDisplayState>((set) => ({
  display: 'krw',
  toggle: () => set((s) => ({ display: s.display === 'original' ? 'krw' : 'original' })),
}));
