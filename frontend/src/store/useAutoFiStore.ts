// AutoFi global state using Zustand
// Stores wallet connection + on-chain data synced via FCL

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type RuleType =
  | "DCA_INVEST"
  | "SUBSCRIPTION_PAYMENT"
  | "SAVINGS_TRANSFER"
  | "PRICE_DIP_BUY"
  | "PROFIT_SELL";

export type TriggerType = "TIME" | "PRICE";

export type RuleStatus = "active" | "paused" | "cancelled" | "completed";

export interface AutomationRule {
  id: string;
  ruleType: RuleType;
  triggerType: TriggerType;
  token: string;
  amount: number;
  interval?: number;
  nextExecution?: Date;
  referencePrice?: number;
  priceChangePercent?: number;
  active: boolean;
  status: RuleStatus;
  maxMonthlySpend: number;
  slippageTolerance: number;
  monthlySpent: number;
  createdAt: Date;
  executionCount: number;
  totalSpent: number;
  description: string;
}

export interface VaultHistory {
  id: string;
  type: "deposit" | "withdraw" | "withdraw_to" | "rule_execution" | "strategy_created" | "strategy_cancelled" | "emergency_stop" | "resume_all";
  amount: number;
  timestamp: Date;
  description: string;
}

interface AutoFiState {
  // Wallet
  walletAddress: string | null;
  isConnected: boolean;

  // Vault (synced from chain)
  vaultBalance: number;
  vaultHistory: VaultHistory[];

  // Strategies (synced from chain)
  rules: AutomationRule[];
  allPaused: boolean;

  // Actions
  setWallet: (address: string | null) => void;
  setVaultBalance: (balance: number) => void;
  setRules: (rules: AutomationRule[]) => void;
  setVaultHistory: (history: VaultHistory[]) => void;
  addHistoryEntry: (entry: Omit<VaultHistory, "id" | "timestamp">) => void;
  setAllPaused: (paused: boolean) => void;
}

export const useAutoFiStore = create<AutoFiState>()(
  persist(
    (set) => ({
      walletAddress: null,
      isConnected: false,
      vaultBalance: 0,
      vaultHistory: [],
      rules: [],
      allPaused: false,

      setWallet: (address) =>
        set({
          walletAddress: address,
          isConnected: !!address,
          // Reset on-chain data when disconnecting
          ...(address ? {} : { vaultBalance: 0, rules: [], vaultHistory: [], allPaused: false }),
        }),

      setVaultBalance: (balance) => set({ vaultBalance: balance }),
      setRules: (rules) => set({ rules }),
      setVaultHistory: (history) => set({ vaultHistory: history }),
      addHistoryEntry: (entry) =>
        set((state) => ({
          vaultHistory: [
            {
              ...entry,
              id: `${entry.type}-${Date.now()}`,
              timestamp: new Date(),
            },
            ...state.vaultHistory,
          ],
        })),
      setAllPaused: (paused) => set({ allPaused: paused }),
    }),
    {
      name: "autofi-store",
      partialize: (state) => ({
        walletAddress: state.walletAddress,
        isConnected: state.isConnected,
        vaultBalance: state.vaultBalance,
        vaultHistory: state.vaultHistory,
        rules: state.rules,
        allPaused: state.allPaused,
      }),
    },
  ),
);
