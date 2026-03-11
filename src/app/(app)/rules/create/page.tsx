"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAutoFiStore, RuleType, TriggerType, AutomationRule } from "@/store/useAutoFiStore";
import { RuleTypeBadge } from "@/components/RuleTypeBadge";
import { Sparkles, ChevronRight, Info, Bell, Shield, TrendingUp } from "lucide-react";
import SimulationPreview from "@/components/SimulationPreview";

// ─── Natural Language Parser ─────────────────────────────────────────────────
function parseNaturalLanguage(input: string): Partial<AutomationRule> | null {
  const lower = input.toLowerCase().trim();

  // Detect amount
  const amountMatch = lower.match(/\$(\d+(?:\.\d+)?)/);
  const amount = amountMatch ? parseFloat(amountMatch[1]) : 50;

  // Detect token
  const token = lower.includes("usdc") ? "USDC" : "FLOW";

  // Detect interval
  let interval = 604800; // default weekly
  let intervalLabel = "weekly";
  if (lower.includes("daily") || lower.includes("every day")) {
    interval = 86400;
    intervalLabel = "daily";
  } else if (lower.includes("weekly") || lower.includes("every week") || lower.includes("monday") || lower.includes("friday")) {
    interval = 604800;
    intervalLabel = "weekly";
  } else if (lower.includes("monthly") || lower.includes("every month")) {
    interval = 2592000;
    intervalLabel = "monthly";
  }

  // Detect rule type
  if (lower.includes("buy") && (lower.includes("drop") || lower.includes("dip") || lower.includes("fall"))) {
    const pctMatch = lower.match(/(\d+(?:\.\d+)?)%/);
    return {
      ruleType: "PRICE_DIP_BUY",
      triggerType: "PRICE",
      token,
      amount,
      priceChangePercent: pctMatch ? parseFloat(pctMatch[1]) : 5,
      referencePrice: 1.0,
      description: `Buy $${amount} of ${token} when price drops ${pctMatch?.[1] ?? 5}%`,
    };
  }

  if (lower.includes("sell") && (lower.includes("rise") || lower.includes("profit") || lower.includes("gain") || lower.includes("increase"))) {
    const pctMatch = lower.match(/(\d+(?:\.\d+)?)%/);
    return {
      ruleType: "PROFIT_SELL",
      triggerType: "PRICE",
      token,
      amount,
      priceChangePercent: pctMatch ? parseFloat(pctMatch[1]) : 10,
      referencePrice: 1.0,
      description: `Sell $${amount} of ${token} when price rises ${pctMatch?.[1] ?? 10}%`,
    };
  }

  if (lower.includes("save") || lower.includes("saving") || lower.includes("vault")) {
    return {
      ruleType: "SAVINGS_TRANSFER",
      triggerType: "TIME",
      token,
      amount,
      interval,
      nextExecution: new Date(Date.now() + interval * 1000),
      description: `Save $${amount} ${token} ${intervalLabel}`,
    };
  }

  if (lower.includes("pay") || lower.includes("subscri")) {
    return {
      ruleType: "SUBSCRIPTION_PAYMENT",
      triggerType: "TIME",
      token,
      amount,
      interval,
      nextExecution: new Date(Date.now() + interval * 1000),
      description: `Pay $${amount} ${token} ${intervalLabel}`,
    };
  }

  // Default: DCA
  if (lower.includes("buy") || lower.includes("invest") || lower.includes("dca")) {
    return {
      ruleType: "DCA_INVEST",
      triggerType: "TIME",
      token,
      amount,
      interval,
      nextExecution: new Date(Date.now() + interval * 1000),
      description: `Buy $${amount} of ${token} ${intervalLabel}`,
    };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────

const RULE_TYPES: { value: RuleType; label: string; icon: string; description: string }[] = [
  { value: "DCA_INVEST", label: "DCA Invest", icon: "📈", description: "Buy tokens on a recurring schedule" },
  { value: "SUBSCRIPTION_PAYMENT", label: "Subscription", icon: "💳", description: "Recurring payment to a wallet" },
  { value: "SAVINGS_TRANSFER", label: "Savings", icon: "🏦", description: "Auto-move funds to savings vault" },
  { value: "PRICE_DIP_BUY", label: "Buy the Dip", icon: "📉", description: "Buy when price drops X%" },
  { value: "PROFIT_SELL", label: "Take Profit", icon: "💰", description: "Sell when price rises X%" },
];

export default function CreateRulePage() {
  const router = useRouter();
  const { addRule, vaultBalance } = useAutoFiStore();

  const [mode, setMode] = useState<"nlp" | "manual">("nlp");
  const [nlpInput, setNlpInput] = useState("");
  const [parsedRule, setParsedRule] = useState<Partial<AutomationRule> | null>(null);
  const [parseError, setParseError] = useState("");

  // Manual form state
  const [ruleType, setRuleType] = useState<RuleType>("DCA_INVEST");
  const [triggerType, setTriggerType] = useState<TriggerType>("TIME");
  const [token, setToken] = useState("FLOW");
  const [amount, setAmount] = useState("50");
  const [receiver, setReceiver] = useState("");
  const [intervalDays, setIntervalDays] = useState("7");
  const [priceChangePercent, setPriceChangePercent] = useState("5");
  const [referencePrice, setReferencePrice] = useState("1.00");
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [maxMonthlySpend, setMaxMonthlySpend] = useState("200");
  const [slippage, setSlippage] = useState("2");
  const [showSimulation, setShowSimulation] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleNlpParse = () => {
    if (!nlpInput.trim()) return;
    const result = parseNaturalLanguage(nlpInput);
    if (result) {
      setParsedRule(result);
      setParseError("");
      // Pre-fill manual form
      if (result.ruleType) setRuleType(result.ruleType);
      if (result.triggerType) setTriggerType(result.triggerType);
      if (result.token) setToken(result.token);
      if (result.amount) setAmount(result.amount.toString());
      if (result.priceChangePercent) setPriceChangePercent(result.priceChangePercent.toString());
      if (result.interval) setIntervalDays((result.interval / 86400).toString());
      setShowSimulation(true);
    } else {
      setParseError("Couldn't parse that instruction. Try: 'Buy $50 of FLOW every week'");
    }
  };

  const buildRule = (): Omit<AutomationRule, "id" | "createdAt" | "executionCount" | "totalSpent" | "monthlySpent"> => {
    const isTriggerPrice = triggerType === "PRICE";
    const intervalSec = parseInt(intervalDays) * 86400;
    return {
      ruleType,
      triggerType,
      token,
      amount: parseFloat(amount),
      receiver: receiver || undefined,
      interval: isTriggerPrice ? undefined : intervalSec,
      nextExecution: isTriggerPrice ? undefined : new Date(Date.now() + intervalSec * 1000),
      referencePrice: isTriggerPrice ? parseFloat(referencePrice) : undefined,
      priceChangePercent: isTriggerPrice ? parseFloat(priceChangePercent) : undefined,
      notifyBeforeExecution: notifyEmail,
      notificationEmail: notifyEmail ? email : undefined,
      active: true,
      status: "active",
      maxMonthlySpend: parseFloat(maxMonthlySpend),
      slippageTolerance: parseFloat(slippage),
      description: parsedRule?.description || `${ruleType.replace(/_/g, " ")} – ${token} $${amount}`,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parseFloat(amount) > vaultBalance) {
      alert("Insufficient vault balance. Please deposit more funds first.");
      return;
    }
    const rule = buildRule();
    addRule(rule);

    // Schedule email notification if enabled
    if (notifyEmail && email && rule.nextExecution) {
      await fetch("/api/notify/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          ruleType: ruleType,
          ruleDescription: rule.description,
          executionTime: new Date(rule.nextExecution).toISOString(),
          amount: `$${amount} ${token}`,
        }),
      }).catch(() => {});
    }

    setSubmitted(true);
    setTimeout(() => router.push("/dashboard"), 1500);
  };

  if (submitted) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "80vh",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 8px" }}>
          Rule Created!
        </h2>
        <p style={{ color: "var(--text-secondary)" }}>Your automation is now active. Redirecting to dashboard…</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px", maxWidth: 860, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Create Automation Rule</h1>
        <p className="page-subtitle">Describe what you want to automate — in plain English or using the form below</p>
      </div>

      {/* Mode Toggle */}
      <div
        style={{
          display: "flex",
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 10,
          padding: 4,
          marginBottom: 28,
          width: "fit-content",
        }}
      >
        {(["nlp", "manual"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              background: mode === m ? "var(--accent-primary)" : "transparent",
              color: mode === m ? "white" : "var(--text-secondary)",
              border: "none",
              borderRadius: 7,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {m === "nlp" ? <><Sparkles size={14} /> Natural Language</> : <>📝 Manual Form</>}
          </button>
        ))}
      </div>

      {/* NLP Input */}
      {mode === "nlp" && (
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px", color: "var(--text-primary)" }}>
            <Sparkles size={16} style={{ color: "var(--accent-primary)", marginBottom: -2 }} /> Describe your automation
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px" }}>
            Try: "Buy $50 of FLOW every Monday" or "Save $20 every Friday" or "Buy FLOW if price drops 5%"
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              className="input-field"
              value={nlpInput}
              onChange={(e) => setNlpInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleNlpParse()}
              placeholder='e.g. "Buy $50 of FLOW every week"'
            />
            <button className="btn-primary" onClick={handleNlpParse} style={{ flexShrink: 0 }}>
              Parse <ChevronRight size={14} />
            </button>
          </div>
          {parseError && (
            <p style={{ color: "var(--accent-danger)", fontSize: 13, marginTop: 8 }}>{parseError}</p>
          )}
          {parsedRule && (
            <div
              style={{
                marginTop: 16,
                background: "rgba(99,102,241,0.08)",
                border: "1px solid rgba(99,102,241,0.2)",
                borderRadius: 10,
                padding: 16,
              }}
            >
              <div style={{ fontSize: 12, color: "var(--accent-primary)", fontWeight: 600, marginBottom: 6 }}>
                ✓ Parsed successfully
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
                {parsedRule.description}
              </div>
              {parsedRule.ruleType && (
                <div style={{ marginTop: 8 }}>
                  <RuleTypeBadge type={parsedRule.ruleType} />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Simulation Preview */}
      {showSimulation && parsedRule && (
        <SimulationPreview rule={parsedRule} />
      )}

      {/* Manual / Confirmation Form */}
      <form onSubmit={handleSubmit}>
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 20px", color: "var(--text-primary)" }}>
            Rule Configuration
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Rule Type */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">Rule Type</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {RULE_TYPES.map((rt) => (
                  <button
                    key={rt.value}
                    type="button"
                    onClick={() => {
                      setRuleType(rt.value);
                      setTriggerType(rt.value === "PRICE_DIP_BUY" || rt.value === "PROFIT_SELL" ? "PRICE" : "TIME");
                    }}
                    style={{
                      background: ruleType === rt.value ? "rgba(99,102,241,0.15)" : "var(--bg-elevated)",
                      border: ruleType === rt.value ? "1px solid var(--accent-primary)" : "1px solid var(--border-subtle)",
                      borderRadius: 10,
                      padding: "10px 14px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      color: ruleType === rt.value ? "var(--accent-primary)" : "var(--text-secondary)",
                      transition: "all 0.15s",
                    }}
                  >
                    {rt.icon} {rt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Token */}
            <div>
              <label className="form-label">Token</label>
              <select className="select-field" value={token} onChange={(e) => setToken(e.target.value)}>
                <option value="FLOW">FLOW</option>
                <option value="USDC">USDC</option>
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="form-label">Amount (USD)</label>
              <input
                className="input-field"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="50.00"
                required
              />
            </div>

            {/* Time trigger fields */}
            {triggerType === "TIME" && (
              <div>
                <label className="form-label">Repeat Every (days)</label>
                <select className="select-field" value={intervalDays} onChange={(e) => setIntervalDays(e.target.value)}>
                  <option value="1">Daily</option>
                  <option value="7">Weekly</option>
                  <option value="14">Bi-weekly</option>
                  <option value="30">Monthly</option>
                </select>
              </div>
            )}

            {/* Price trigger fields */}
            {triggerType === "PRICE" && (
              <>
                <div>
                  <label className="form-label">Reference Price (USD)</label>
                  <input
                    className="input-field"
                    type="number"
                    step="0.01"
                    value={referencePrice}
                    onChange={(e) => setReferencePrice(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">
                    {ruleType === "PRICE_DIP_BUY" ? "Trigger on Drop (%)" : "Trigger on Rise (%)"}
                  </label>
                  <input
                    className="input-field"
                    type="number"
                    step="0.1"
                    value={priceChangePercent}
                    onChange={(e) => setPriceChangePercent(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            {/* Receiver for subscriptions */}
            {ruleType === "SUBSCRIPTION_PAYMENT" && (
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="form-label">Recipient Wallet Address</label>
                <input
                  className="input-field"
                  value={receiver}
                  onChange={(e) => setReceiver(e.target.value)}
                  placeholder="0x..."
                />
              </div>
            )}
          </div>
        </div>

        {/* Safety Guards */}
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <h3
            style={{
              fontSize: 16,
              fontWeight: 700,
              margin: "0 0 20px",
              color: "var(--text-primary)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Shield size={16} color="var(--accent-success)" /> Safety Guards
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label className="form-label">Max Monthly Spend ($)</label>
              <input
                className="input-field"
                type="number"
                min="0"
                value={maxMonthlySpend}
                onChange={(e) => setMaxMonthlySpend(e.target.value)}
                placeholder="200"
              />
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "4px 0 0" }}>
                Set to 0 to disable monthly cap
              </p>
            </div>
            <div>
              <label className="form-label">Slippage Tolerance (%)</label>
              <input
                className="input-field"
                type="number"
                min="0"
                step="0.1"
                value={slippage}
                onChange={(e) => setSlippage(e.target.value)}
                placeholder="2"
              />
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "4px 0 0" }}>
                Cancel if price moves more than this %
              </p>
            </div>
          </div>
        </div>

        {/* Email Notification */}
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: notifyEmail ? 16 : 0 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
                <Bell size={16} color="var(--accent-warning)" /> Email Notifications
              </h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
                Get alerted before this rule executes with a cancel link
              </p>
            </div>
            <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
              <div
                onClick={() => setNotifyEmail(!notifyEmail)}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  background: notifyEmail ? "var(--accent-primary)" : "var(--bg-elevated)",
                  border: "1px solid var(--border-subtle)",
                  position: "relative",
                  transition: "background 0.2s",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 2,
                    left: notifyEmail ? 22 : 2,
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "white",
                    transition: "left 0.2s",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                  }}
                />
              </div>
            </label>
          </div>
          {notifyEmail && (
            <div>
              <label className="form-label">Email Address</label>
              <input
                className="input-field"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required={notifyEmail}
              />
            </div>
          )}
        </div>

        {/* Submit */}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button type="submit" className="btn-primary" style={{ padding: "14px 28px", fontSize: 15 }}>
            <TrendingUp size={16} /> Create Automation Rule
          </button>
          <button type="button" className="btn-secondary" onClick={() => setShowSimulation(!showSimulation)}>
            {showSimulation ? "Hide" : "Show"} Simulation
          </button>
        </div>
      </form>
    </div>
  );
}
