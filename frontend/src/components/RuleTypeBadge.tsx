"use client";

import { RuleType } from "@/store/useAutoFiStore";

const RULE_LABELS: Record<RuleType, string> = {
  DCA_INVEST: "DCA",
  SUBSCRIPTION_PAYMENT: "SUB",
  SAVINGS_TRANSFER: "SAVE",
  PRICE_DIP_BUY: "DIP",
  PROFIT_SELL: "PROFIT",
};

export function RuleTypeBadge({ type }: { type: RuleType }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wider uppercase border border-amber-500/30 text-amber-500 bg-amber-500/5">
      {RULE_LABELS[type]}
    </span>
  );
}

export function getRuleLabel(type: RuleType) {
  return RULE_LABELS[type];
}
