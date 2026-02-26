/**
 * @file 포맷 유틸리티
 * @description 숫자, 가격, 퍼센트 등의 포맷 함수와 cn 유틸리티
 *
 * @file Format Utilities
 * @description Number, price, percent formatting functions and cn utility
 */
import { useSettingsStore } from '@/stores/settings';

function getLocale(): 'ko' | 'en' {
  try {
    return useSettingsStore.getState().locale;
  } catch {
    return 'ko';
  }
}

export function formatPrice(price: number): string {
  if (price >= 1_000_000) {
    return price.toLocaleString('ko-KR', {
      maximumFractionDigits: 0,
    });
  }
  if (price >= 1) {
    return price.toLocaleString('ko-KR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return price.toLocaleString('ko-KR', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 8,
  });
}

export function formatPercent(percent: number): string {
  if (percent == null || isNaN(percent)) return '-';
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
}

export function formatAmount(amount: number): string {
  const sign = amount >= 0 ? '+' : '-';
  const abs = Math.abs(amount);
  if (abs >= 1000) {
    return sign + abs.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
  }
  if (abs >= 1) {
    return sign + abs.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (abs >= 0.01) {
    return sign + abs.toFixed(4);
  }
  return sign + abs.toFixed(6);
}

export function formatCompactPrice(price: number): string {
  if (price >= 10000) {
    return price.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
  }
  if (price >= 1) {
    return price.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (price >= 0.01) {
    return price.toFixed(4);
  }
  return price.toFixed(6);
}

export function formatCurrency(value: number): string {
  if (value == null || isNaN(value)) return '-';
  const locale = getLocale();
  const rounded = Math.round(value);
  if (locale === 'en') return '₩' + rounded.toLocaleString('en-US');
  return rounded.toLocaleString('ko-KR') + '원';
}

/** USD 포맷 — 항상 소수점 2자리 */
export function formatDollar(value: number): string {
  if (value == null || isNaN(value)) return '-';
  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * 통화 모드에 따라 원화 또는 달러로 표시
 * @param value 원화 기준 금액
 * @param mode 'krw' | 'original' (original = USD)
 * @param exchangeRate USD→KRW 환율
 */
export function formatCurrencyDisplay(
  value: number,
  mode: 'krw' | 'original',
  exchangeRate?: number,
): string {
  if (value == null || isNaN(value)) return '-';
  if (mode === 'original' && exchangeRate && exchangeRate > 0) {
    return formatDollar(value / exchangeRate);
  }
  return formatCurrency(value);
}

export function formatQuantity(quantity: number): string {
  if (quantity >= 1) {
    return quantity.toLocaleString('ko-KR', {
      maximumFractionDigits: 4,
    });
  }
  return quantity.toLocaleString('ko-KR', {
    maximumFractionDigits: 8,
  });
}

export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatVolume(volume: number): string {
  const locale = getLocale();
  if (locale === 'en') {
    if (volume >= 1e9) return (volume / 1e9).toFixed(1) + 'B';
    if (volume >= 1e6) return (volume / 1e6).toFixed(1) + 'M';
    if (volume >= 1e3) return (volume / 1e3).toFixed(0) + 'K';
    return volume.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
  if (volume >= 1_0000_0000) {
    return (volume / 1_0000_0000).toFixed(1) + '억';
  }
  if (volume >= 1_0000) {
    return (volume / 1_0000).toFixed(0) + '만';
  }
  return volume.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/** 심볼 기반 통화 판별: .KS 접미사 → KRW, 나머지 → USD */
export function isKRW(symbol: string): boolean {
  return symbol.endsWith('.KS');
}

/** KRW 포맷 (정수 + '원') */
function formatKRWPrice(price: number): string {
  const locale = getLocale();
  if (locale === 'en') return '₩' + price.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return price.toLocaleString('ko-KR', { maximumFractionDigits: 0 }) + '원';
}

/** USD 포맷 ($X,XXX.XX) */
function formatUSDPrice(price: number): string {
  if (price >= 1) {
    return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (price >= 0.01) {
    return '$' + price.toFixed(4);
  }
  return '$' + price.toFixed(6);
}

/**
 * 통화 접두사/접미사 포함 가격 표시
 * @param currencyMode 'krw'=모든 수치를 원화로, 'original'=원래 통화 그대로
 * @param exchangeRate USD→KRW 환율
 */
export function formatPriceDisplay(
  price: number,
  symbol: string,
  currencyMode?: 'krw' | 'original' | boolean,
  exchangeRate?: number,
): string {
  const wantKRW = currencyMode === 'krw' || currencyMode === true;
  if (isKRW(symbol)) {
    if (!wantKRW && exchangeRate) {
      return formatUSDPrice(price / exchangeRate);
    }
    return formatKRWPrice(price);
  }
  if (wantKRW && exchangeRate) {
    return formatKRWPrice(Math.round(price * exchangeRate));
  }
  return formatUSDPrice(price);
}

/** 통화 접두사 포함 변동금액 표시 */
export function formatAmountDisplay(
  amount: number,
  symbol: string,
  currencyMode?: 'krw' | 'original' | boolean,
  exchangeRate?: number,
): string {
  const wantKRW = currencyMode === 'krw' || currencyMode === true;
  if (isKRW(symbol)) {
    if (!wantKRW && exchangeRate) {
      const converted = amount / exchangeRate;
      const abs = Math.abs(converted);
      const prefix = converted >= 0 ? '+$' : '-$';
      if (abs >= 1) return prefix + abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return prefix + abs.toFixed(4);
    }
    const locale = getLocale();
    if (locale === 'en') {
      const s = amount >= 0 ? '+₩' : '-₩';
      return s + Math.abs(Math.round(amount)).toLocaleString('en-US');
    }
    const sign = amount >= 0 ? '+' : '';
    return sign + Math.round(amount).toLocaleString('ko-KR') + '원';
  }
  if (wantKRW && exchangeRate) {
    const converted = Math.round(amount * exchangeRate);
    const locale = getLocale();
    if (locale === 'en') {
      const s = converted >= 0 ? '+₩' : '-₩';
      return s + Math.abs(converted).toLocaleString('en-US');
    }
    const sign = converted >= 0 ? '+' : '';
    return sign + converted.toLocaleString('ko-KR') + '원';
  }
  const abs = Math.abs(amount);
  const prefix = amount >= 0 ? '+$' : '-$';
  if (abs >= 1) return prefix + abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (abs >= 0.01) return prefix + abs.toFixed(4);
  return prefix + abs.toFixed(6);
}

/** 통화별 거래대금 표시 */
export function formatVolumeDisplay(
  volume: number,
  symbol: string,
  currencyMode?: 'krw' | 'original' | boolean,
  exchangeRate?: number,
): string {
  const wantKRW = currencyMode === 'krw' || currencyMode === true;
  if (isKRW(symbol)) {
    if (!wantKRW && exchangeRate) {
      const usd = volume / exchangeRate;
      if (usd >= 1e9) return '$' + (usd / 1e9).toFixed(1) + 'B';
      if (usd >= 1e6) return '$' + (usd / 1e6).toFixed(1) + 'M';
      if (usd >= 1e3) return '$' + (usd / 1e3).toFixed(0) + 'K';
      return '$' + usd.toLocaleString('en-US', { maximumFractionDigits: 0 });
    }
    return formatVolume(volume);
  }
  if (wantKRW && exchangeRate) {
    return formatVolume(volume * exchangeRate);
  }
  if (volume >= 1e9) return '$' + (volume / 1e9).toFixed(1) + 'B';
  if (volume >= 1e6) return '$' + (volume / 1e6).toFixed(1) + 'M';
  if (volume >= 1e3) return '$' + (volume / 1e3).toFixed(0) + 'K';
  return '$' + volume.toLocaleString('en-US', { maximumFractionDigits: 0 });
}
