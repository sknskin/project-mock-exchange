/**
 * @file 환율 조회 훅
 * @description ExchangeRate.fun API를 사용하여 USD → KRW 환율을 1시간 간격으로 조회합니다.
 *              API 오류 시 Frankfurter API(무료, 무제한, 일 1회 갱신)로 자동 폴백합니다.
 *
 * @file Exchange Rate Hook
 * @description Fetches USD → KRW exchange rate from ExchangeRate.fun API every hour.
 *              Falls back to Frankfurter API (free, unlimited, daily updates) on error.
 *
 * ┌──────────────────────────────────────────────────────────────────────────────┐
 * │ [내부 참고] API 서비스 정보                                                   │
 * │ [Internal Reference] API Service Info                                       │
 * ├──────────────────────────────────────────────────────────────────────────────┤
 * │                                                                             │
 * │ 1차 API: ExchangeRate.fun (https://github.com/haxqer/FreeExchangeRateApi)  │
 * │   - 완전 무료, API 키 불필요                                                 │
 * │   - 환율 데이터 1시간마다 갱신                                                │
 * │   - 요청 횟수 제한 없음 (단, 합리적 사용 요청)                                 │
 * │   - 10년간 무료 유지 보장 (프로젝트 README 명시)                               │
 * │   - 160+ 통화 지원                                                           │
 * │                                                                             │
 * │ 폴백 API: Frankfurter (https://www.frankfurter.app/)                        │
 * │   - 완전 무료, API 키 불필요, 요청 횟수 무제한                                 │
 * │   - ECB(유럽중앙은행) 데이터, 유럽 업무일 기준 하루 1회 갱신                     │
 * │                                                                             │
 * │ 수동 새로고침 한도: 일 20회                                                   │
 * │   - 합리적 사용을 위해 자체적으로 일일 수동 새로고침 횟수를 제한                   │
 * │   - localStorage에 일자별 사용 횟수 기록                                       │
 * │   - 한도 초과 시: API 호출 없이 조용히 캐시 데이터 반환                          │
 * │   - 사용자에게 제한 메시지 표시하지 않음                                         │
 * │                                                                             │
 * └──────────────────────────────────────────────────────────────────────────────┘
 */
'use client';
import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useCallback } from 'react';

// ── 환율 데이터 타입 / Exchange rate data type ──

interface ExchangeRateData {
  /** USD → KRW 환율
   * USD to KRW exchange rate */
  rate: number;
  /** 마지막 조회 시각
   * Last fetched timestamp */
  updatedAt: Date;
  /** 데이터 소스
   * Data source */
  source: 'exchangerate-fun' | 'frankfurter';
}

// ── 상수 / Constants ──

/**
 * 자동 갱신 간격: 1시간 (3,600,000ms)
 * ExchangeRate.fun의 데이터 갱신 주기(1시간)에 맞춤
 *
 * Auto-refetch interval: 1 hour
 * Matches ExchangeRate.fun's data refresh cycle (1 hour)
 */
const REFETCH_INTERVAL_MS = 60 * 60 * 1000;

/**
 * stale 판정 시간: 30분
 * 30분 이내 데이터는 fresh로 간주하여 불필요한 요청 방지
 *
 * Stale time: 30 minutes
 * Data within 30min is considered fresh to prevent unnecessary requests
 */
const STALE_TIME_MS = 30 * 60 * 1000;

/**
 * 일일 수동 새로고침 한도: 20회
 * API에 공식 제한은 없으나, 합리적 사용을 위해 자체적으로 제한
 * 이 한도는 사용자에게 절대 노출되지 않음
 *
 * Daily manual refresh limit: 20 times
 * No official API limit, but self-imposed for responsible usage
 * This limit is NEVER exposed to the user
 */
const DAILY_MANUAL_LIMIT = 20;

/** localStorage 키: 일별 수동 새로고침 사용량 추적 / localStorage key: daily manual refresh usage tracking */
const STORAGE_KEY = 'vx_exchange_rate_usage';

// ── 일일 사용량 관리 (localStorage 기반) / Daily usage management (localStorage-based) ──

interface DailyUsage {
  /** 날짜 문자열 (YYYY-MM-DD)
   * Date string */
  date: string;
  /** 해당일 수동 새로고침 횟수
   * Manual refresh count for the day */
  count: number;
}

/**
 * 오늘의 수동 새로고침 사용량을 조회합니다.
 * 날짜가 변경되면 카운트를 0으로 자동 리셋합니다.
 *
 * Retrieves today's manual refresh usage.
 * Automatically resets count to 0 when the date changes.
 */
function getDailyUsage(): DailyUsage {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: DailyUsage = JSON.parse(stored);
      // 오늘 날짜와 일치하면 저장된 카운트 반환 / Return stored count if date matches today
      if (parsed.date === today) return parsed;
    }
  } catch {
    // localStorage 접근 불가 시 (SSR, 프라이빗 브라우징 등) 기본값 반환
    // Return default on localStorage access failure (SSR, private browsing, etc.)
  }
  return { date: today, count: 0 };
}

/**
 * 수동 새로고침 사용량을 1 증가시킵니다.
 * Increments manual refresh usage count by 1.
 */
function incrementDailyUsage(): void {
  const usage = getDailyUsage();
  const updated: DailyUsage = { date: usage.date, count: usage.count + 1 };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage 쓰기 실패 무시 / Ignore localStorage write failure
  }
}

/**
 * 수동 새로고침이 가능한지 확인합니다.
 * Checks if manual refresh is allowed within today's limit.
 */
function canManualRefresh(): boolean {
  return getDailyUsage().count < DAILY_MANUAL_LIMIT;
}

// ── API 호출 함수 / API fetch functions ──

/**
 * ExchangeRate.fun API에서 환율을 가져옵니다. (1차 소스)
 * 완전 무료, API 키 불필요, 1시간마다 갱신되는 환율 데이터를 제공합니다.
 * 응답 형식: { timestamp: number, base: "USD", rates: { KRW: 1486.687 } }
 * API 문서: https://github.com/haxqer/FreeExchangeRateApi
 *
 * Fetches exchange rate from ExchangeRate.fun API. (primary source)
 * Completely free, no API key, provides hourly-updated exchange rate data.
 * Response format: { timestamp: number, base: "USD", rates: { KRW: 1486.687 } }
 *
 * @returns 환율 데이터 / Exchange rate data
 * @throws API 응답 오류 시 / On API response error
 */
async function fetchFromExchangeRateFun(): Promise<ExchangeRateData> {
  const res = await fetch('https://api.exchangerate.fun/latest?base=USD', {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`ExchangeRate.fun API error: ${res.status}`);
  const data = await res.json();
  return {
    rate: data.rates.KRW,
    // API가 제공하는 Unix timestamp를 사용하여 실제 데이터 갱신 시각 표시
    // Use API-provided Unix timestamp to show actual data update time
    updatedAt: data.timestamp ? new Date(data.timestamp * 1000) : new Date(),
    source: 'exchangerate-fun',
  };
}

/**
 * Frankfurter API에서 환율을 가져옵니다. (폴백용)
 * ECB(유럽중앙은행) 데이터를 기반으로 하며, 유럽 업무일 기준 하루 1회 갱신됩니다.
 * API 키 불필요, 요청 횟수 무제한.
 * API 문서: https://www.frankfurter.app/docs/
 *
 * Fetches exchange rate from Frankfurter API. (fallback)
 * Based on ECB data, updated once per European business day.
 * No API key required, unlimited requests.
 *
 * @returns 환율 데이터 / Exchange rate data
 * @throws API 응답 오류 시 / On API response error
 */
async function fetchFromFrankfurter(): Promise<ExchangeRateData> {
  const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=KRW', {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Frankfurter API error: ${res.status}`);
  const data = await res.json();
  return {
    rate: data.rates.KRW,
    updatedAt: new Date(),
    source: 'frankfurter',
  };
}

/**
 * 환율 데이터를 가져오는 메인 함수
 * ExchangeRate.fun을 우선 사용하고, 실패 시 Frankfurter로 자동 폴백합니다.
 *
 * Main function to fetch exchange rate data.
 * Uses ExchangeRate.fun first, falls back to Frankfurter on failure.
 *
 * @returns 환율 데이터 / Exchange rate data
 */
async function fetchExchangeRate(): Promise<ExchangeRateData> {
  try {
    return await fetchFromExchangeRateFun();
  } catch {
    // ExchangeRate.fun 실패 (서버 장애, 네트워크 오류 등) → Frankfurter 폴백
    // ExchangeRate.fun failure (server down, network error, etc.) → Frankfurter fallback
    return await fetchFromFrankfurter();
  }
}

// ── React Query 훅 / React Query Hook ──

/**
 * 환율 조회 훅 반환 타입
 * Exchange rate hook return type
 */
interface UseExchangeRateReturn {
  /** TanStack Query 결과
   * TanStack Query result */
  query: UseQueryResult<ExchangeRateData>;
  /**
   * 수동 새로고침 함수
   * 일일 한도(20회) 내에서만 실제 API 호출을 수행합니다.
   * 한도 초과 시 API를 호출하지 않고 캐시된 데이터를 유지합니다.
   * 사용자는 한도 초과 여부를 알 수 없습니다.
   *
   * Manual refresh function.
   * Only makes actual API calls within the daily limit (20 times).
   * When limit is exceeded, keeps cached data without calling API.
   * The user cannot tell whether the limit has been exceeded.
   */
  manualRefetch: () => Promise<void>;
}

/**
 * USD → KRW 환율을 조회하는 React Query 훅
 * 1시간마다 자동 갱신되며, 수동 새로고침 기능을 제공합니다.
 *
 * React Query hook for fetching USD → KRW exchange rate.
 * Auto-refreshes every hour and provides manual refresh capability.
 *
 * @returns { query, manualRefetch } — query: 환율 데이터, manualRefetch: 수동 새로고침 함수
 */
export function useExchangeRate(): UseExchangeRateReturn {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['exchangeRate'],
    queryFn: fetchExchangeRate,
    // 1시간 자동 갱신 — ExchangeRate.fun 데이터 갱신 주기와 동기화
    // Auto-refetch every hour — synced with ExchangeRate.fun data refresh cycle
    refetchInterval: REFETCH_INTERVAL_MS,
    staleTime: STALE_TIME_MS,
    // 네트워크 오류 시 최대 2회 재시도 (폴백이 있으므로 적은 횟수로 충분)
    // Retry up to 2 times on network error (low count sufficient since we have fallback)
    retry: 2,
  });

  /**
   * 수동 새로고침 — 일일 한도를 확인한 뒤 API를 호출합니다.
   *
   * 동작 방식:
   * 1. canManualRefresh()로 일일 한도(20회) 확인
   * 2. 한도 내 → 캐시 무효화로 API 재호출 + 사용량 카운트 증가
   * 3. 한도 초과 → API 호출 없이 조용히 리턴 (사용자에게 제한 표시 안 함)
   *
   * Manual refresh — checks daily limit before calling API.
   *
   * Behavior:
   * 1. Check daily limit (20/day) via canManualRefresh()
   * 2. Within limit → invalidate cache to trigger API call + increment usage count
   * 3. Over limit → silently return without API call (no limit indication to user)
   */
  const manualRefetch = useCallback(async () => {
    if (canManualRefresh()) {
      incrementDailyUsage();
      await queryClient.invalidateQueries({ queryKey: ['exchangeRate'] });
    }
    // 한도 초과 시: 아무 동작 없이 리턴 — 사용자에게는 기존 캐시 데이터가 표시됨
    // Over limit: return silently — user sees existing cached data
  }, [queryClient]);

  return { query, manualRefetch };
}
