/**
 * @file 관리자 시스템 설정 스토어
 * @description 거래 제한, 수수료, 시스템 상태, 초기 자금, 시장 운영시간, 리스크 관리, 알림, 세션/보안을 로컬 Zustand 상태로 관리
 *
 * @file Admin System Settings Store
 * @description Manages trading limits, fees, system status, initial balance, market hours, risk management, notifications, and session/security as local Zustand state
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 거래 제한 설정 / Trading limit settings
export interface TradingLimits {
  /** 최소 주문 수량
   * Minimum order quantity */
  minOrderQty: number;
  /** 최대 주문 수량
   * Maximum order quantity */
  maxOrderQty: number;
  /** 사용자당 최대 미체결 주문 수
   * Max open orders per user */
  maxOpenOrdersPerUser: number;
}

// 거래 수수료 설정 / Trading fee settings
export interface TradingFees {
  /** 메이커 수수료 (%)
   * Maker fee (%) */
  makerFee: number;
  /** 테이커 수수료 (%)
   * Taker fee (%) */
  takerFee: number;
}

// 시스템 상태 / System status
export interface SystemStatus {
  /** 거래 활성화 여부
   * Whether trading is enabled */
  tradingEnabled: boolean;
  /** 유지보수 모드 여부
   * Whether in maintenance mode */
  maintenanceMode: boolean;
}

// 초기 자금 설정 / Initial balance settings
export interface InitialBalance {
  /** 기본 지급 자금 (KRW)
   * Default starting balance (KRW) */
  defaultBalance: number;
}

// 시장 운영시간 설정 / Market hours settings
export interface MarketHours {
  /** 시장 개장 시간 (HH:mm)
   * Market open time (HH:mm) */
  marketOpenTime: string;
  /** 시장 마감 시간 (HH:mm)
   * Market close time (HH:mm) */
  marketCloseTime: string;
  /** 주말 거래 허용 여부
   * Whether weekend trading is allowed */
  weekendTradingEnabled: boolean;
}

// 리스크 관리 설정 / Risk management settings
export interface RiskManagement {
  /** 단일 주문 최대 금액
   * Maximum single order value */
  maxSingleOrderValue: number;
  /** 일일 손실 제한 비율 (%)
   * Daily loss limit percentage (%) */
  dailyLossLimitPercent: number;
  /** 마진콜 임계치 (%)
   * Margin call threshold (%) */
  marginCallThreshold: number;
}

// 알림 설정 / Notification settings
export interface NotificationSettings {
  /** 이메일 알림 활성화 여부
   * Whether email notifications are enabled */
  emailNotificationEnabled: boolean;
  /** 알림 보관 기간 (일)
   * Notification retention period (days) */
  notificationRetentionDays: number;
}

// 세션 및 보안 설정 / Session and security settings
export interface SessionSecurity {
  /** 세션 타임아웃 (분)
   * Session timeout (minutes) */
  sessionTimeoutMinutes: number;
  /** 최대 로그인 시도 횟수
   * Maximum login attempts */
  maxLoginAttempts: number;
  /** 관리자 2FA 필수 여부
   * Whether 2FA is required for admin */
  require2FAForAdmin: boolean;
}

interface AdminSettingsState {
  tradingLimits: TradingLimits;
  tradingFees: TradingFees;
  systemStatus: SystemStatus;
  initialBalance: InitialBalance;
  marketHours: MarketHours;
  riskManagement: RiskManagement;
  notificationSettings: NotificationSettings;
  sessionSecurity: SessionSecurity;
  setTradingLimits: (limits: Partial<TradingLimits>) => void;
  setTradingFees: (fees: Partial<TradingFees>) => void;
  setSystemStatus: (status: Partial<SystemStatus>) => void;
  setInitialBalance: (balance: Partial<InitialBalance>) => void;
  setMarketHours: (hours: Partial<MarketHours>) => void;
  setRiskManagement: (risk: Partial<RiskManagement>) => void;
  setNotificationSettings: (notif: Partial<NotificationSettings>) => void;
  setSessionSecurity: (session: Partial<SessionSecurity>) => void;
}

export const useAdminSettingsStore = create<AdminSettingsState>()(
  persist<AdminSettingsState, [], [], Pick<AdminSettingsState, 'tradingLimits' | 'tradingFees' | 'systemStatus' | 'initialBalance' | 'marketHours' | 'riskManagement' | 'notificationSettings' | 'sessionSecurity'>>(
    (set, get) => ({
      tradingLimits: {
        minOrderQty: 0.001,
        maxOrderQty: 10000,
        maxOpenOrdersPerUser: 50,
      },
      tradingFees: {
        makerFee: 0.1,
        takerFee: 0.15,
      },
      systemStatus: {
        tradingEnabled: true,
        maintenanceMode: false,
      },
      initialBalance: {
        defaultBalance: 100_000_000,
      },
      marketHours: {
        marketOpenTime: '09:00',
        marketCloseTime: '15:30',
        weekendTradingEnabled: false,
      },
      riskManagement: {
        maxSingleOrderValue: 500_000_000,
        dailyLossLimitPercent: 50,
        marginCallThreshold: 30,
      },
      notificationSettings: {
        emailNotificationEnabled: true,
        notificationRetentionDays: 30,
      },
      sessionSecurity: {
        sessionTimeoutMinutes: 30,
        maxLoginAttempts: 5,
        require2FAForAdmin: false,
      },
      setTradingLimits: (limits) =>
        set({ tradingLimits: { ...get().tradingLimits, ...limits } }),
      setTradingFees: (fees) =>
        set({ tradingFees: { ...get().tradingFees, ...fees } }),
      setSystemStatus: (status) =>
        set({ systemStatus: { ...get().systemStatus, ...status } }),
      setInitialBalance: (balance) =>
        set({ initialBalance: { ...get().initialBalance, ...balance } }),
      setMarketHours: (hours) =>
        set({ marketHours: { ...get().marketHours, ...hours } }),
      setRiskManagement: (risk) =>
        set({ riskManagement: { ...get().riskManagement, ...risk } }),
      setNotificationSettings: (notif) =>
        set({ notificationSettings: { ...get().notificationSettings, ...notif } }),
      setSessionSecurity: (session) =>
        set({ sessionSecurity: { ...get().sessionSecurity, ...session } }),
    }),
    {
      name: 'virtuex-admin-settings',
      storage: {
        getItem: (name) => {
          const value = sessionStorage.getItem(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: (name, value) => sessionStorage.setItem(name, JSON.stringify(value)),
        removeItem: (name) => sessionStorage.removeItem(name),
      },
      partialize: (state) => ({
        tradingLimits: state.tradingLimits,
        tradingFees: state.tradingFees,
        systemStatus: state.systemStatus,
        initialBalance: state.initialBalance,
        marketHours: state.marketHours,
        riskManagement: state.riskManagement,
        notificationSettings: state.notificationSettings,
        sessionSecurity: state.sessionSecurity,
      }),
    },
  ),
);
