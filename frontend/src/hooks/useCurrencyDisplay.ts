/**
 * @file 통화 표시 전환 훅
 * @description 원화/달러 표시 모드를 토글하는 Zustand 스토어
 *
 * @file Currency Display Toggle Hook
 * @description Zustand store for toggling KRW/USD display mode
 */
'use client';
import { create } from 'zustand';

// 통화 표시 모드: 'original' = USD 원본, 'krw' = 원화 환산
// Currency display mode: 'original' = USD as-is, 'krw' = converted to KRW
type CurrencyDisplay = 'original' | 'krw';

// Zustand 스토어 상태 인터페이스 / Zustand store state interface
interface CurrencyDisplayState {
  /** 현재 통화 표시 모드 / Current currency display mode */
  display: CurrencyDisplay;
  /** 'original' ↔ 'krw' 토글 함수 / Toggle function between 'original' and 'krw' */
  toggle: () => void;
}

/**
 * 원화/달러 표시 전환을 위한 전역 Zustand 스토어
 * 기본값은 'krw'로, 사용자가 토글하면 USD 원본 표시로 전환됩니다.
 *
 * Global Zustand store for KRW/USD display toggling.
 * Defaults to 'krw'; toggles to original USD display when user switches.
 */
export const useCurrencyDisplay = create<CurrencyDisplayState>((set) => ({
  // 기본값: 원화 표시 (대부분의 사용자가 한국인이므로)
  // Default: KRW display (most users are Korean)
  display: 'krw',
  // 토글 시 반대 모드로 전환 / Switch to the opposite mode on toggle
  toggle: () => set((s) => ({ display: s.display === 'original' ? 'krw' : 'original' })),
}));
