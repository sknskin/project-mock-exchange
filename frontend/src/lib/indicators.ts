/**
 * @file 기술적 지표 계산 유틸리티
 * @description SMA, RSI, 볼린저 밴드 등 캔들 데이터에서 기술적 지표를 계산하는 함수들
 *
 * @file Technical Indicator Calculation Utilities
 * @description Functions to calculate technical indicators (SMA, RSI, Bollinger Bands) from candle data
 */
import type { UTCTimestamp } from 'lightweight-charts';

export interface IndicatorPoint {
  time: UTCTimestamp;
  value: number;
}

export interface BollingerBandsPoint {
  time: UTCTimestamp;
  upper: number;
  middle: number;
  lower: number;
}

/**
 * SMA (단순이동평균) 계산 / Calculate Simple Moving Average
 * @param closes - { time, value }[] 종가 배열 (sorted by time ascending)
 * @param period - 기간 (5, 20, 60 등)
 */
export function calculateSMA(
  closes: IndicatorPoint[],
  period: number,
): IndicatorPoint[] {
  if (closes.length < period) return [];

  const result: IndicatorPoint[] = [];
  let sum = 0;

  for (let i = 0; i < closes.length; i++) {
    sum += closes[i].value;
    if (i >= period) {
      sum -= closes[i - period].value;
    }
    if (i >= period - 1) {
      result.push({
        time: closes[i].time,
        value: sum / period,
      });
    }
  }

  return result;
}

/**
 * RSI (상대강도지수) 계산 / Calculate Relative Strength Index
 * @param closes - { time, value }[] 종가 배열 (sorted by time ascending)
 * @param period - 기간 (보통 14)
 */
export function calculateRSI(
  closes: IndicatorPoint[],
  period: number = 14,
): IndicatorPoint[] {
  if (closes.length < period + 1) return [];

  const result: IndicatorPoint[] = [];
  let avgGain = 0;
  let avgLoss = 0;

  // 첫 번째 평균 계산 (Initial average calculation)
  for (let i = 1; i <= period; i++) {
    const change = closes[i].value - closes[i - 1].value;
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }

  avgGain /= period;
  avgLoss /= period;

  // 첫 번째 RSI 값 (First RSI value)
  const firstRS = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push({
    time: closes[period].time,
    value: 100 - 100 / (1 + firstRS),
  });

  // 이후 RSI 값 (지수이동평균 사용) (Subsequent RSI values using EMA smoothing)
  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i].value - closes[i - 1].value;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push({
      time: closes[i].time,
      value: 100 - 100 / (1 + rs),
    });
  }

  return result;
}

/**
 * 볼린저 밴드 계산 / Calculate Bollinger Bands
 * @param closes - { time, value }[] 종가 배열 (sorted by time ascending)
 * @param period - SMA 기간 (보통 20)
 * @param multiplier - 표준편차 배수 (보통 2)
 */
export function calculateBollingerBands(
  closes: IndicatorPoint[],
  period: number = 20,
  multiplier: number = 2,
): BollingerBandsPoint[] {
  if (closes.length < period) return [];

  const result: BollingerBandsPoint[] = [];

  for (let i = period - 1; i < closes.length; i++) {
    // SMA 계산 (Calculate SMA)
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += closes[j].value;
    }
    const sma = sum / period;

    // 표준편차 계산 (Calculate standard deviation)
    let squaredSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      squaredSum += (closes[j].value - sma) ** 2;
    }
    const stdDev = Math.sqrt(squaredSum / period);

    result.push({
      time: closes[i].time,
      upper: sma + multiplier * stdDev,
      middle: sma,
      lower: sma - multiplier * stdDev,
    });
  }

  return result;
}
