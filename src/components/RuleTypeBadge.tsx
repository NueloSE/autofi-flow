"use client";

import { RuleType } from "@/store/useAutoFiStore";

const RULE_CONFIGS: Record<RuleType, { label: string; icon: string; color: string; bg: string }> = {
  DCA_INVEST: { label: "DCA Invest", icon: "📈", color: "#6366f1", bg: "rgba(99,102,241,0.1)" },
  SUBSCRIPTION_PAYMENT: { label: "Subscription", icon: "💳", color: "#06b6d4", bg: "rgba(6,182,212,0.1)" },
  SAVINGS_TRANSFER: { label: "Savings", icon: "🏦", color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  PRICE_DIP_BUY: { label: "Buy the Dip", icon: "📉", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  PROFIT_SELL: { label: "Take Profit", icon: "💰", color: "#a78bfa", bg: "rgba(167,139,250,0.1)" },
};

export function RuleTypeBadge({ type }: { type: RuleType }) {
  const cfg = RULE_CONFIGS[type];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 10px",
        borderRadius: 100,
        fontSize: 11,
        fontWeight: 600,
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.color}30`,
      }}
    >
      {cfg.icon} {cfg.label}
    </span>
  );
}

export function getRuleConfig(type: RuleType) {
  return RULE_CONFIGS[type];
}
