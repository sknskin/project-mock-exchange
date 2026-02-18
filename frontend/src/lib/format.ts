/**
 * @file 포맷 유틸리티
 * @description 숫자, 가격, 퍼센트 등의 포맷 함수와 cn 유틸리티
 *
 * @file Format Utilities
 * @description Number, price, percent formatting functions and cn utility
 */
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
  return value.toLocaleString('ko-KR') + '원';
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
