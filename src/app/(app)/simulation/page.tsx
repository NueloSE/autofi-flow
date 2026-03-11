"use client";

import { useState } from "react";
import { TrendingUp, DollarSign, Clock, BarChart2 } from "lucide-react";

type StrategyType = "dca" | "dip" | "profit" | "savings";

function simulate(strategy: StrategyType, amount: number, param: number, months: number) {
  if (strategy === "dca" || strategy === "savings") {
    const weeksPerMonth = 4.33;
    const totalWeeks = months * weeksPerMonth;
    const totalInvested = totalWeeks * amount;
    const annualReturn = 0.08;
    const periodReturn = Math.pow(1 + annualReturn / 12, months) - 1;
    const estimatedValue = totalInvested * (1 + periodReturn);
    const profit = estimatedValue - totalInvested;
    return [
      { label: "Executions", value: Math.round(totalWeeks).toString() },
      { label: "Total Invested", value: `$${totalInvested.toFixed(0)}` },
      { label: "Est. Portfolio Value", value: `$${estimatedValue.toFixed(0)}` },
      { label: "Est. Profit (8% APY)", value: `+$${profit.toFixed(0)}` },
    ];
  }
  if (strategy === "dip") {
    const buyPrice = 1 - param / 100;
    const flowBought = amount / buyPrice;
    const valueAt10 = flowBought * 1.1;
    const profit = valueAt10 - amount;
    return [
      { label: "Buy trigger (drop)", value: `${param}%` },
      { label: "Est. FLOW bought", value: `${flowBought.toFixed(2)} FLOW` },
      { label: "Value if FLOW +10%", value: `$${valueAt10.toFixed(2)}` },
      { label: "Potential profit", value: `+$${profit.toFixed(2)}` },
    ];
  }
  if (strategy === "profit") {
    const sellAt = 1 + param / 100;
    const profitPerTrade = amount * (param / 100);
    const tradeROI = param;
    const monthly = (months * 30) / 7 * profitPerTrade;
    return [
      { label: "Sell trigger (rise)", value: `+${param}%` },
      { label: "Profit per trade", value: `+$${profitPerTrade.toFixed(2)}` },
      { label: `Est. profit (${months}mo)`, value: `+$${monthly.toFixed(0)}` },
      { label: "ROI per trade", value: `${tradeROI}%` },
    ];
  }
  return [];
}

const STRATEGIES: { value: StrategyType; label: string; icon: string; paramLabel: string; paramDefault: number }[] = [
  { value: "dca", label: "DCA Investing", icon: "📈", paramLabel: "N/A", paramDefault: 7 },
  { value: "dip", label: "Buy the Dip", icon: "📉", paramLabel: "Drop %", paramDefault: 5 },
  { value: "profit", label: "Take Profit", icon: "💰", paramLabel: "Rise %", paramDefault: 10 },
  { value: "savings", label: "Savings", icon: "🏦", paramLabel: "N/A", paramDefault: 7 },
];

export default function SimulationPage() {
  const [strategy, setStrategy] = useState<StrategyType>("dca");
  const [amount, setAmount] = useState(50);
  const [param, setParam] = useState(5);
  const [months, setMonths] = useState(3);

  const results = simulate(strategy, amount, param, months);
  const selectedStrategy = STRATEGIES.find((s) => s.value === strategy)!;

  return (
    <div style={{ padding: "32px", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Strategy Simulator</h1>
        <p className="page-subtitle">Preview potential outcomes before creating an automation rule</p>
      </div>

      {/* Strategy Selector */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <label className="form-label">Strategy Type</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {STRATEGIES.map((s) => (
            <button
              key={s.value}
              onClick={() => {
                setStrategy(s.value);
                setParam(s.paramDefault);
              }}
              style={{
                background: strategy === s.value ? "rgba(99,102,241,0.15)" : "var(--bg-elevated)",
                border: strategy === s.value ? "1px solid var(--accent-primary)" : "1px solid var(--border-subtle)",
                borderRadius: 10,
                padding: "10px 14px",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                color: strategy === s.value ? "var(--accent-primary)" : "var(--text-secondary)",
                transition: "all 0.15s",
              }}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          <div>
            <label className="form-label">Amount per execution ($)</label>
            <input
              className="input-field"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            />
          </div>
          {strategy !== "dca" && strategy !== "savings" && (
            <div>
              <label className="form-label">{selectedStrategy.paramLabel}</label>
              <input
                className="input-field"
                type="number"
                min={0.1}
                step={0.1}
                value={param}
                onChange={(e) => setParam(parseFloat(e.target.value) || 0)}
              />
            </div>
          )}
          <div>
            <label className="form-label">Projection (months)</label>
            <select className="select-field" value={months} onChange={(e) => setMonths(parseInt(e.target.value))}>
              <option value={1}>1 month</option>
              <option value={3}>3 months</option>
              <option value={6}>6 months</option>
              <option value={12}>12 months</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      <div
        style={{
          background: "rgba(99,102,241,0.06)",
          border: "1px solid rgba(99,102,241,0.2)",
          borderRadius: 14,
          padding: 24,
          marginBottom: 20,
        }}
      >
        <h3
          style={{
            fontSize: 15,
            fontWeight: 700,
            margin: "0 0 16px",
            color: "var(--accent-primary)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <BarChart2 size={16} /> Simulation Results
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
          {results.map((r) => (
            <div
              key={r.label}
              className="card"
              style={{ padding: "14px 16px" }}
            >
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{r.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>{r.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Visual bar chart mockup */}
      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.8px" }}>
          Investment Growth Projection
        </h3>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120 }}>
          {Array.from({ length: months > 6 ? 12 : months * 4 }).map((_, i) => {
            const total = months > 6 ? 12 : months * 4;
            const progress = (i + 1) / total;
            const baseHeight = 20;
            const maxHeight = 100;
            // Deterministic jitter using sine — identical on server and client
            const jitter = Math.sin(i * 2.4) * 0.025 * progress;
            const h = baseHeight + (maxHeight - baseHeight) * (progress + jitter);
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${h}%`,
                  borderRadius: 3,
                  background: `linear-gradient(to top, var(--accent-primary), var(--accent-secondary))`,
                  opacity: 0.6 + progress * 0.4,
                  minWidth: 4,
                  transition: "height 0.3s",
                }}
              />
            );
          })}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 10,
            color: "var(--text-muted)",
            marginTop: 6,
          }}
        >
          <span>Start</span>
          <span>{months} months</span>
        </div>
        <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "10px 0 0" }}>
          ⚠️ Projections are illustrative only. Market conditions affect actual outcomes.
        </p>
      </div>
    </div>
  );
}
