'use client';
import { create } from 'zustand';

type CurrencyDisplay = 'original' | 'krw';

interface CurrencyDisplayState {
  display: CurrencyDisplay;
  toggle: () => void;
}

export const useCurrencyDisplay = create<CurrencyDisplayState>((set) => ({
  display: 'original',
  toggle: () => set((s) => ({ display: s.display === 'original' ? 'krw' : 'original' })),
}));
