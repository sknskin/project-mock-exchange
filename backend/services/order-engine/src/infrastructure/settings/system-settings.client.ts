/**
 * @file 시스템 설정 클라이언트
 * @description user-auth 서비스에서 시스템 설정을 조회하고 TTL 캐시로 관리
 *
 * @file System Settings Client
 * @description Fetches system settings from user-auth service with TTL-based caching
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

/** 파싱된 시스템 설정 타입 / Parsed system settings type */
export interface SystemSettings {
  // 거래 제한 / Trading Limits
  tradingLimitsMinOrderQty: number;
  tradingLimitsMaxOrderQty: number;
  tradingLimitsMaxOpenOrdersPerUser: number;

  // 거래 수수료 / Trading Fees
  tradingFeesMakerFee: number;
  tradingFeesTakerFee: number;

  // 시장 시간 / Market Hours
  marketHoursMarketOpenTime: string;
  marketHoursMarketCloseTime: string;
  marketHoursWeekendTradingEnabled: boolean;

  // 리스크 관리 / Risk Management
  riskManagementMaxSingleOrderValue: number;
  riskManagementDailyLossLimitPercent: number;
  riskManagementMarginCallThreshold: number;

  // 시스템 상태 / System Status
  systemStatusTradingEnabled: boolean;
  systemStatusMaintenanceMode: boolean;
}

/** 기본 설정값 — DB에 값이 없을 때 사용 / Default settings when DB has no values */
const DEFAULTS: SystemSettings = {
  tradingLimitsMinOrderQty: 0.001,
  tradingLimitsMaxOrderQty: 100000,
  tradingLimitsMaxOpenOrdersPerUser: 50,
  tradingFeesMakerFee: 0.1,
  tradingFeesTakerFee: 0.15,
  marketHoursMarketOpenTime: '00:00',
  marketHoursMarketCloseTime: '23:59',
  marketHoursWeekendTradingEnabled: true,
  riskManagementMaxSingleOrderValue: 100000000,
  riskManagementDailyLossLimitPercent: 50,
  riskManagementMarginCallThreshold: 30,
  systemStatusTradingEnabled: true,
  systemStatusMaintenanceMode: false,
};

@Injectable()
export class SystemSettingsClient {
  private readonly logger = new Logger(SystemSettingsClient.name);
  private readonly userAuthUrl: string;
  private readonly internalToken: string;

  /** 캐시 / Cache */
  private cachedSettings: SystemSettings | null = null;
  private cachedAt = 0;
  private static readonly CACHE_TTL_MS = 30_000; // 30초 캐시

  constructor(private readonly config: ConfigService) {
    this.userAuthUrl = this.config.getOrThrow<string>('USER_AUTH_URL');
    this.internalToken = this.config.getOrThrow<string>('INTERNAL_SERVICE_SECRET');
  }

  /** 시스템 설정 조회 (캐시 포함) / Get system settings (with cache) */
  async getSettings(): Promise<SystemSettings> {
    const now = Date.now();
    if (this.cachedSettings && now - this.cachedAt < SystemSettingsClient.CACHE_TTL_MS) {
      return this.cachedSettings;
    }

    try {
      const { data: response } = await axios.get<{ success: boolean; data: Record<string, string> }>(
        `${this.userAuthUrl}/settings`,
        {
          headers: { 'x-internal-token': this.internalToken },
          timeout: 3000,
        },
      );

      this.cachedSettings = this.parseSettings(response.data);
      this.cachedAt = now;
      this.logger.debug('System settings refreshed from user-auth');
      return this.cachedSettings;
    } catch (error) {
      // 실패 시 캐시된 값 반환 / On failure, return cached value
      if (this.cachedSettings) {
        this.logger.warn('Failed to fetch settings, using stale cache');
        return this.cachedSettings;
      }
      // 캐시도 없으면 기본값 반환 / No cache available, use defaults
      this.logger.warn('Failed to fetch settings, using defaults');
      return { ...DEFAULTS };
    }
  }

  /** 원시 키-값을 타입 안전한 객체로 파싱 / Parse raw key-value pairs into typed object */
  private parseSettings(raw: Record<string, string>): SystemSettings {
    const num = (key: string, fallback: number): number => {
      const v = raw[key];
      if (v === undefined || v === '') return fallback;
      const n = Number(v);
      return isNaN(n) ? fallback : n;
    };

    const bool = (key: string, fallback: boolean): boolean => {
      const v = raw[key];
      if (v === undefined || v === '') return fallback;
      return v === 'true';
    };

    const str = (key: string, fallback: string): string => {
      return raw[key] ?? fallback;
    };

    return {
      tradingLimitsMinOrderQty: num('tradingLimits.minOrderQty', DEFAULTS.tradingLimitsMinOrderQty),
      tradingLimitsMaxOrderQty: num('tradingLimits.maxOrderQty', DEFAULTS.tradingLimitsMaxOrderQty),
      tradingLimitsMaxOpenOrdersPerUser: num('tradingLimits.maxOpenOrdersPerUser', DEFAULTS.tradingLimitsMaxOpenOrdersPerUser),
      tradingFeesMakerFee: num('tradingFees.makerFee', DEFAULTS.tradingFeesMakerFee),
      tradingFeesTakerFee: num('tradingFees.takerFee', DEFAULTS.tradingFeesTakerFee),
      marketHoursMarketOpenTime: str('marketHours.marketOpenTime', DEFAULTS.marketHoursMarketOpenTime),
      marketHoursMarketCloseTime: str('marketHours.marketCloseTime', DEFAULTS.marketHoursMarketCloseTime),
      marketHoursWeekendTradingEnabled: bool('marketHours.weekendTradingEnabled', DEFAULTS.marketHoursWeekendTradingEnabled),
      riskManagementMaxSingleOrderValue: num('riskManagement.maxSingleOrderValue', DEFAULTS.riskManagementMaxSingleOrderValue),
      riskManagementDailyLossLimitPercent: num('riskManagement.dailyLossLimitPercent', DEFAULTS.riskManagementDailyLossLimitPercent),
      riskManagementMarginCallThreshold: num('riskManagement.marginCallThreshold', DEFAULTS.riskManagementMarginCallThreshold),
      systemStatusTradingEnabled: bool('systemStatus.tradingEnabled', DEFAULTS.systemStatusTradingEnabled),
      systemStatusMaintenanceMode: bool('systemStatus.maintenanceMode', DEFAULTS.systemStatusMaintenanceMode),
    };
  }
}
