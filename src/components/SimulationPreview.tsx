"use client";

import { AutomationRule } from "@/store/useAutoFiStore";
import { TrendingUp, Clock, DollarSign } from "lucide-react";

interface SimulationPreviewProps {
  rule: Partial<AutomationRule>;
}

function simulateDCA(amount: number, interval: number, months: number) {
  const executionsPerMonth = (30 * 24 * 3600) / interval;
  const totalExecutions = Math.round(executionsPerMonth * months);
  const totalInvested = totalExecutions * amount;
  // Simulate 8% annual growth for demo
  const annualReturn = 0.08;
  const periodReturn = Math.pow(1 + annualReturn / 12, months) - 1;
  const avgCost = amount; // simplified
  const estimatedValue = totalInvested * (1 + periodReturn);
  const estimatedProfit = estimatedValue - totalInvested;
  return { totalExecutions, totalInvested, estimatedValue, estimatedProfit };
}

function simulatePrice(amount: number, changePercent: number, type: "dip" | "profit") {
  const tokensBought = type === "dip" ? amount / (1 - changePercent / 100) : amount;
  const profitPerTrade = type === "profit" ? amount * (changePercent / 100) : amount * (changePercent / 100);
  return { tokensBought, profitPerTrade };
}

export default function SimulationPreview({ rule }: SimulationPreviewProps) {
  const isDCA =
    rule.ruleType === "DCA_INVEST" ||
    rule.ruleType === "SAVINGS_TRANSFER" ||
    rule.ruleType === "SUBSCRIPTION_PAYMENT";
  const isDip = rule.ruleType === "PRICE_DIP_BUY";
  const isProfit = rule.ruleType === "PROFIT_SELL";

  const amount = rule.amount || 50;
  const interval = rule.interval || 604800;
  const priceChangePct = rule.priceChangePercent || 5;

  const dcaSim = isDCA ? simulateDCA(amount, interval, 3) : null;
  const priceSim = (isDip || isProfit) ? simulatePrice(amount, priceChangePct, isDip ? "dip" : "profit") : null;

  return (
    <div
      style={{
        background: "rgba(99,102,241,0.06)",
        border: "1px solid rgba(99,102,241,0.25)",
        borderRadius: 14,
        padding: 20,
        marginBottom: 20,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "var(--accent-primary)",
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <TrendingUp size={14} /> Strategy Simulation Preview
      </div>

      {dcaSim && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
          <SimStat
            icon={<Clock size={14} />}
            label="Executions (3 months)"
            value={dcaSim.totalExecutions.toString()}
            color="#6366f1"
          />
          <SimStat
            icon={<DollarSign size={14} />}
            label="Total Invested"
            value={`$${dcaSim.totalInvested.toFixed(0)}`}
            color="#06b6d4"
          />
          <SimStat
            icon={<TrendingUp size={14} />}
            label="Est. Portfolio Value"
            value={`$${dcaSim.estimatedValue.toFixed(0)}`}
            color="#10b981"
          />
          <SimStat
            icon={<DollarSign size={14} />}
            label="Est. Profit (+8% APY)"
            value={`+$${dcaSim.estimatedProfit.toFixed(0)}`}
            color="#a78bfa"
          />
        </div>
      )}

      {priceSim && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          {isDip && (
            <>
              <SimStat
                icon={<DollarSign size={14} />}
                label="Buy at price drop"
                value={`${priceChangePct}%`}
                color="#f59e0b"
              />
              <SimStat
                icon={<TrendingUp size={14} />}
                label="FLOW purchased"
                value={`~${priceSim.tokensBought.toFixed(1)} FLOW`}
                color="#6366f1"
              />
              <SimStat
                icon={<DollarSign size={14} />}
                label="Avg cost basis"
                value={`$${(amount / priceSim.tokensBought).toFixed(3)}`}
                color="#10b981"
              />
            </>
          )}
          {isProfit && (
            <>
              <SimStat
                icon={<TrendingUp size={14} />}
                label="Sell trigger"
                value={`+${priceChangePct}%`}
                color="#a78bfa"
              />
              <SimStat
                icon={<DollarSign size={14} />}
                label="Profit per trade"
                value={`+$${priceSim.profitPerTrade.toFixed(2)}`}
                color="#10b981"
              />
              <SimStat
                icon={<DollarSign size={14} />}
                label="Return per trade"
                value={`${priceChangePct}%`}
                color="#06b6d4"
              />
            </>
          )}
        </div>
      )}

      <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "12px 0 0" }}>
        ⚠️ Simulation uses estimated values. Past performance is not indicative of future results.
      </p>
    </div>
  );
}

function SimStat({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 10,
        padding: "12px 14px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 5, color, marginBottom: 4, fontSize: 11 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{value}</div>
    </div>
  );
}
