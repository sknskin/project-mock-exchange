/**
 * @file 관리자 시스템 설정 스토어
 * @description 거래 제한, 수수료, 시스템 상태를 로컬 Zustand 상태로 관리
 *
 * @file Admin System Settings Store
 * @description Manages trading limits, fees, and system status as local Zustand state
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

interface AdminSettingsState {
  tradingLimits: TradingLimits;
  tradingFees: TradingFees;
  systemStatus: SystemStatus;
  setTradingLimits: (limits: Partial<TradingLimits>) => void;
  setTradingFees: (fees: Partial<TradingFees>) => void;
  setSystemStatus: (status: Partial<SystemStatus>) => void;
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
      setTradingLimits: (limits) =>
        set({ tradingLimits: { ...get().tradingLimits, ...limits } }),
      setTradingFees: (fees) =>
        set({ tradingFees: { ...get().tradingFees, ...fees } }),
      setSystemStatus: (status) =>
        set({ systemStatus: { ...get().systemStatus, ...status } }),
    }),
    {
      name: 'virtuex-admin-settings',
      partialize: (state) => ({
        tradingLimits: state.tradingLimits,
        tradingFees: state.tradingFees,
        systemStatus: state.systemStatus,
      }),
    },
  ),
);
