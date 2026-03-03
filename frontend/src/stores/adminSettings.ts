/**
 * @file 관리자 시스템 설정 스토어
 * @description 거래 제한, 수수료, 시스템 상태, 초기 자금, 시장 운영시간, 리스크 관리, 알림, 세션/보안을 로컬 Zustand 상태로 관리
 *
 * @file Admin System Settings Store
 * @description Manages trading limits, fees, system status, initial balance, market hours, risk management, notifications, and session/security as local Zustand state
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TradingLimits {
  minOrderQty: number;
  maxOrderQty: number;
  maxOpenOrdersPerUser: number;
}

export interface TradingFees {
  makerFee: number;
  takerFee: number;
}

export interface SystemStatus {
  tradingEnabled: boolean;
  maintenanceMode: boolean;
}

export interface InitialBalance {
  defaultBalance: number;
}

export interface MarketHours {
  marketOpenTime: string;
  marketCloseTime: string;
  weekendTradingEnabled: boolean;
}

export interface RiskManagement {
  maxSingleOrderValue: number;
  dailyLossLimitPercent: number;
  marginCallThreshold: number;
}

export interface NotificationSettings {
  emailNotificationEnabled: boolean;
  notificationRetentionDays: number;
}

export interface SessionSecurity {
  sessionTimeoutMinutes: number;
  maxLoginAttempts: number;
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
  persist(
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
        maxSingleOrderValue: 50_000_000,
        dailyLossLimitPercent: 10,
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
