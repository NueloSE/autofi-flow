// AutoFi global state using Zustand
// This also handles demo/mock modes for hackathon presentation

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
  receiver?: string;
  interval?: number; // seconds
  nextExecution?: Date;
  referencePrice?: number;
  priceChangePercent?: number;
  notifyBeforeExecution: boolean;
  notificationEmail?: string;
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
  type: "deposit" | "withdraw" | "rule_execution";
  amount: number;
  timestamp: Date;
  description: string;
}

interface AutoFiState {
  // Wallet
  walletAddress: string | null;
  isConnected: boolean;
  isDemoMode: boolean;

  // Vault
  vaultBalance: number;
  vaultHistory: VaultHistory[];

  // Rules
  rules: AutomationRule[];
  allPaused: boolean;

  // Actions
  setWallet: (address: string | null) => void;
  setConnected: (connected: boolean) => void;
  setDemoMode: (demo: boolean) => void;
  deposit: (amount: number) => void;
  withdraw: (amount: number) => void;
  addRule: (rule: Omit<AutomationRule, "id" | "createdAt" | "executionCount" | "totalSpent" | "monthlySpent">) => void;
  cancelRule: (id: string) => void;
  pauseAllRules: () => void;
  resumeAllRules: () => void;
  simulateExecution: (ruleId: string) => void;
  setVaultBalance: (balance: number) => void;
  setRules: (rules: AutomationRule[]) => void;
}

// Demo seed data for hackathon presentation
const DEMO_RULES: AutomationRule[] = [
  {
    id: "rule-1",
    ruleType: "DCA_INVEST",
    triggerType: "TIME",
    token: "FLOW",
    amount: 50,
    interval: 604800, // 1 week
    nextExecution: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    notifyBeforeExecution: true,
    notificationEmail: "user@example.com",
    active: true,
    status: "active",
    maxMonthlySpend: 200,
    slippageTolerance: 2,
    monthlySpent: 100,
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    executionCount: 2,
    totalSpent: 100,
    description: "Buy $50 of FLOW every week",
  },
  {
    id: "rule-2",
    ruleType: "PRICE_DIP_BUY",
    triggerType: "PRICE",
    token: "FLOW",
    amount: 100,
    referencePrice: 1.0,
    priceChangePercent: 5,
    notifyBeforeExecution: false,
    active: true,
    status: "active",
    maxMonthlySpend: 500,
    slippageTolerance: 2,
    monthlySpent: 0,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    executionCount: 0,
    totalSpent: 0,
    description: "Buy $100 of FLOW when price drops 5%",
  },
  {
    id: "rule-3",
    ruleType: "SAVINGS_TRANSFER",
    triggerType: "TIME",
    token: "USDC",
    amount: 20,
    interval: 604800,
    nextExecution: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    notifyBeforeExecution: false,
    active: true,
    status: "active",
    maxMonthlySpend: 100,
    slippageTolerance: 0,
    monthlySpent: 40,
    createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
    executionCount: 3,
    totalSpent: 60,
    description: "Save $20 USDC every Friday",
  },
];

const DEMO_HISTORY: VaultHistory[] = [
  { id: "h1", type: "deposit", amount: 500, timestamp: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000), description: "Initial deposit" },
  { id: "h2", type: "rule_execution", amount: -50, timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), description: "DCA: Bought 50 FLOW" },
  { id: "h3", type: "rule_execution", amount: -20, timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), description: "Savings: Moved 20 USDC" },
  { id: "h4", type: "rule_execution", amount: -50, timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), description: "DCA: Bought 50 FLOW" },
  { id: "h5", type: "rule_execution", amount: -20, timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), description: "Savings: Moved 20 USDC" },
  { id: "h6", type: "rule_execution", amount: -20, timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), description: "Savings: Moved 20 USDC" },
];

export const useAutoFiStore = create<AutoFiState>()(
  persist(
    (set, get) => ({
      walletAddress: null,
      isConnected: false,
      isDemoMode: true,
      vaultBalance: 340,
      vaultHistory: DEMO_HISTORY,
      rules: DEMO_RULES,
      allPaused: false,

      setWallet: (address) =>
        set({ walletAddress: address, isConnected: !!address }),

      setConnected: (connected) => set({ isConnected: connected }),

      setDemoMode: (demo) => set({ isDemoMode: demo }),

      deposit: (amount) =>
        set((state) => ({
          vaultBalance: state.vaultBalance + amount,
          vaultHistory: [
            {
              id: `h-${Date.now()}`,
              type: "deposit",
              amount,
              timestamp: new Date(),
              description: "Manual deposit",
            },
            ...state.vaultHistory,
          ],
        })),

      withdraw: (amount) =>
        set((state) => {
          if (state.vaultBalance < amount) return state;
          return {
            vaultBalance: state.vaultBalance - amount,
            vaultHistory: [
              {
                id: `h-${Date.now()}`,
                type: "withdraw",
                amount: -amount,
                timestamp: new Date(),
                description: "Manual withdrawal",
              },
              ...state.vaultHistory,
            ],
          };
        }),

      addRule: (rule) =>
        set((state) => ({
          rules: [
            ...state.rules,
            {
              ...rule,
              id: `rule-${Date.now()}`,
              createdAt: new Date(),
              executionCount: 0,
              totalSpent: 0,
              monthlySpent: 0,
            },
          ],
        })),

      cancelRule: (id) =>
        set((state) => ({
          rules: state.rules.map((r) =>
            r.id === id ? { ...r, active: false, status: "cancelled" as RuleStatus } : r
          ),
        })),

      pauseAllRules: () =>
        set((state) => ({
          allPaused: true,
          rules: state.rules.map((r) => ({ ...r, active: false, status: "paused" as RuleStatus })),
        })),

      resumeAllRules: () =>
        set((state) => ({
          allPaused: false,
          rules: state.rules.map((r) =>
            r.status === "paused" ? { ...r, active: true, status: "active" as RuleStatus } : r
          ),
        })),

      simulateExecution: (ruleId) => {
        const rule = get().rules.find((r) => r.id === ruleId);
        if (!rule || !rule.active) return;
        set((state) => ({
          vaultBalance: state.vaultBalance - rule.amount,
          rules: state.rules.map((r) =>
            r.id === ruleId
              ? {
                  ...r,
                  executionCount: r.executionCount + 1,
                  totalSpent: r.totalSpent + r.amount,
                  monthlySpent: r.monthlySpent + r.amount,
                }
              : r
          ),
          vaultHistory: [
            {
              id: `h-${Date.now()}`,
              type: "rule_execution",
              amount: -rule.amount,
              timestamp: new Date(),
              description: `Executed: ${rule.description}`,
            },
            ...state.vaultHistory,
          ],
        }));
      },

      setVaultBalance: (balance) => set({ vaultBalance: balance }),
      setRules: (rules) => set({ rules }),
    }),
    {
      name: "autofi-store",
      partialize: (state) => ({
        vaultBalance: state.vaultBalance,
        rules: state.rules,
        vaultHistory: state.vaultHistory,
        isDemoMode: state.isDemoMode,
      }),
    }
  )
);
