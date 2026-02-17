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
  const sign = amount >= 0 ? '+' : '';
  return `${sign}${formatPrice(amount)}`;
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

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
