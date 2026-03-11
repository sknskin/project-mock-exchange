/**
 * @file 포맷 유틸리티
 * @description 숫자, 가격, 퍼센트 등의 포맷 함수와 cn 유틸리티
 *
 * @file Format Utilities
 * @description Number, price, percent formatting functions and cn utility
 */
import { useSettingsStore } from '@/stores/settings';

// 현재 설정된 로케일을 Zustand 스토어에서 가져옴 / Get current locale from Zustand store
function getLocale(): 'ko' | 'en' {
  try {
    return useSettingsStore.getState().locale;
  } catch {
    return 'ko';
  }
}

// 가격 포맷: 크기에 따라 소수점 자릿수 자동 조절 / Format price: auto-adjust decimal places by magnitude
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

// 퍼센트 포맷: 부호 포함, 소수점 3자리 / Format percent: with sign, 3 decimal places
export function formatPercent(percent: number): string {
  if (percent == null || !Number.isFinite(percent)) return '-';
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(3)}%`;
}

// 변동 금액 포맷: 부호 포함, 크기에 따라 소수점 자동 조절 / Format change amount: with sign, auto-adjust decimals
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

// 압축 가격 포맷: 인덱스 표시용 간결한 포맷 / Compact price format: concise format for index display
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

// 원화 통화 포맷: 로케일에 따라 '₩' 또는 '원' 접미사 사용 / KRW currency format: uses '₩' or '원' based on locale
export function formatCurrency(value: number): string {
  if (value == null || isNaN(value)) return '-';
  const locale = getLocale();
  const rounded = Math.round(value);
  if (locale === 'en') return '₩' + rounded.toLocaleString('en-US');
  return rounded.toLocaleString('ko-KR') + '원';
}

/** USD 포맷 — 항상 소수점 2자리
 * USD format — always 2 decimal places */
export function formatDollar(value: number): string {
  if (value == null || isNaN(value)) return '-';
  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * 통화 모드에 따라 원화 또는 달러로 표시
 * Displays value in KRW or USD based on currency mode
 *
 * @param value - 원화 기준 금액 / Amount in KRW
 * @param mode - 'krw' | 'original' (original = USD)
 * @param exchangeRate - USD→KRW 환율 / USD to KRW exchange rate
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

// 수량 포맷: 1 이상이면 소수점 4자리, 미만이면 8자리 / Format quantity: 4 decimals if >=1, else 8 decimals
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

// 시간 포맷: HH:MM:SS 형식 / Format time: HH:MM:SS format
export function formatTime(dateString: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// 날짜 포맷: MM/DD HH:MM 형식 / Format date: MM/DD HH:MM format
export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// 거래량 포맷: 로케일에 따라 B/M/K 또는 억/만 단위 축약 / Format volume: B/M/K or 억/만 abbreviation by locale
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

// 조건부 클래스명 결합 유틸리티 / Conditional class name join utility
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/** 심볼 기반 통화 판별: .KS 접미사 → KRW, 나머지 → USD
 * Determine currency by symbol: .KS suffix → KRW, else → USD */
export function isKRW(symbol: string): boolean {
  return symbol.endsWith('.KS');
}

/** KRW 포맷 (정수 + '원')
 * KRW format (integer + '원' suffix) */
function formatKRWPrice(price: number): string {
  if (!Number.isFinite(price)) return '0원';
  const locale = getLocale();
  if (locale === 'en') return '₩' + price.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return price.toLocaleString('ko-KR', { maximumFractionDigits: 0 }) + '원';
}

/** USD 포맷 ($X,XXX.XX)
 * USD format ($X,XXX.XX) */
function formatUSDPrice(price: number): string {
  if (!Number.isFinite(price)) return '$0.00';
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
 * Displays price with currency prefix/suffix
 *
 * @param price - 가격 / Price value
 * @param symbol - 종목 심볼 / Asset symbol
 * @param currencyMode - 'krw'=원화 변환, 'original'=원래 통화 / 'krw'=convert to KRW, 'original'=original currency
 * @param exchangeRate - USD→KRW 환율 / USD to KRW exchange rate
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

/** 통화 접두사 포함 변동금액 표시
 * Displays change amount with currency prefix */
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

/** 통화별 거래대금 표시
 * Displays trading volume with currency formatting */
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
