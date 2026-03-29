import { AutomationRule } from "@/store/useAutoFiStore";

export function parseNaturalLanguage(input: string, currentFlowPrice?: number): Partial<AutomationRule> | null {
  const lower = input.toLowerCase().trim();

  // ── Token detection (default USDC) ──
  const token = lower.includes("stflow") ? "stFLOW"
    : lower.includes("dust") ? "DUST"
    : lower.includes("flow") && !lower.includes("usdc") ? "FLOW"
    : "USDC";

  // ── Amount detection ──
  let amount: number | null = null;
  const dollarMatch = lower.match(/\$(\d+(?:\.\d+)?)/);
  if (dollarMatch) {
    amount = parseFloat(dollarMatch[1]);
  } else {
    const tokenAmountMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:usdc|flow|stflow|dust|of\b)/);
    if (tokenAmountMatch) {
      amount = parseFloat(tokenAmountMatch[1]);
    } else {
      const bareMatch = lower.match(/(?:buy|invest|save|pay|dca|swap|send|transfer)\s+(\d+(?:\.\d+)?)/);
      if (bareMatch) amount = parseFloat(bareMatch[1]);
    }
  }
  if (!amount || amount <= 0) amount = 5; // sensible default

  // ── Recipient address detection (0x...) ──
  const addrMatch = input.match(/\b(0x[a-fA-F0-9]{8,16})\b/);
  const recipient = addrMatch ? addrMatch[1] : "";

  // ── One-time detection ──
  const isOneTime = /\b(once|one[- ]time|single)\b/.test(lower);

  // ── Interval detection ──
  let interval = isOneTime ? 3153600000 : 604800; // default weekly, or ~100yr for one-time
  let intervalLabel = isOneTime ? "one-time" : "weekly";

  if (!isOneTime) {
    // "every X min/hour/day/week/month"
    const everyMatch = lower.match(/every\s+(\d+)\s*(min|minute|hr|hour|day|week|month)/);
    if (everyMatch) {
      const n = parseInt(everyMatch[1]);
      const unit = everyMatch[2];
      if (unit.startsWith("min")) { interval = n * 60; intervalLabel = n === 1 ? "every minute" : `every ${n} min`; }
      else if (unit.startsWith("hr") || unit.startsWith("hour")) { interval = n * 3600; intervalLabel = n === 1 ? "hourly" : `every ${n} hours`; }
      else if (unit.startsWith("day")) { interval = n * 86400; intervalLabel = n === 1 ? "daily" : `every ${n} days`; }
      else if (unit.startsWith("week")) { interval = n * 604800; intervalLabel = n === 1 ? "weekly" : `every ${n} weeks`; }
      else if (unit.startsWith("month")) { interval = n * 2592000; intervalLabel = n === 1 ? "monthly" : `every ${n} months`; }
    }
    else if (lower.match(/every\s*(min|minute)/)) { interval = 60; intervalLabel = "every minute"; }
    else if (lower.match(/every\s*(hr|hour)/)) { interval = 3600; intervalLabel = "hourly"; }
    else if (lower.includes("daily") || lower.includes("every day")) { interval = 86400; intervalLabel = "daily"; }
    else if (lower.includes("weekly") || lower.includes("every week")) { interval = 604800; intervalLabel = "weekly"; }
    else if (lower.includes("monthly") || lower.includes("every month")) { interval = 2592000; intervalLabel = "monthly"; }
    else if (lower.includes("hourly")) { interval = 3600; intervalLabel = "hourly"; }
  }

  // ── Price target detection ──
  // Supports: "$0.025", "below $0.03", "5%", "drops 10%"
  let priceTarget = 0;
  const priceAbsMatch = lower.match(/(?:below|under|above|over|at|to)\s*\$(\d+(?:\.\d+)?)/);
  const pctMatch = lower.match(/(\d+(?:\.\d+)?)%/);

  if (priceAbsMatch) {
    priceTarget = parseFloat(priceAbsMatch[1]);
  } else if (pctMatch && currentFlowPrice && currentFlowPrice > 0) {
    const pct = parseFloat(pctMatch[1]);
    // Determine direction from context
    const isDip = lower.includes("drop") || lower.includes("dip") || lower.includes("fall") || lower.includes("below");
    const isRise = lower.includes("rise") || lower.includes("above") || lower.includes("profit") || lower.includes("gain");
    if (isDip) {
      priceTarget = +(currentFlowPrice * (1 - pct / 100)).toFixed(6);
    } else if (isRise) {
      priceTarget = +(currentFlowPrice * (1 + pct / 100)).toFixed(6);
    } else {
      // Default: treat as dip for "buy the dip" context
      priceTarget = +(currentFlowPrice * (1 - pct / 100)).toFixed(6);
    }
  }

  // ── Rule type detection ──

  // Price: "buy when flow drops below $0.03" / "sell when flow rises above $0.04"
  if ((lower.includes("drop") || lower.includes("dip") || lower.includes("fall") || lower.includes("below") || lower.includes("under"))
    && (lower.includes("buy") || lower.includes("swap") || lower.includes("when"))) {
    const targetToken = token === "FLOW" ? "USDC" : token;
    const pctLabel = pctMatch ? ` (${pctMatch[1]}% drop)` : "";
    const desc = priceTarget > 0
      ? `Buy ${targetToken} with ${amount} FLOW when FLOW drops below $${priceTarget}${pctLabel}`
      : `Buy ${targetToken} with ${amount} FLOW when price dips`;
    return {
      ruleType: "PRICE_DIP_BUY",
      triggerType: "PRICE",
      token: targetToken,
      amount,
      referencePrice: priceTarget,
      interval: 1800,
      description: desc,
    };
  }

  if ((lower.includes("rise") || lower.includes("above") || lower.includes("over") || lower.includes("profit") || lower.includes("gain"))
    && (lower.includes("sell") || lower.includes("swap") || lower.includes("when") || lower.includes("take"))) {
    const targetToken = token === "FLOW" ? "USDC" : token;
    const pctLabel = pctMatch ? ` (${pctMatch[1]}% rise)` : "";
    const desc = priceTarget > 0
      ? `Sell ${amount} FLOW → ${targetToken} when FLOW rises above $${priceTarget}${pctLabel}`
      : `Sell ${amount} FLOW → ${targetToken} when price rises`;
    return {
      ruleType: "PROFIT_SELL",
      triggerType: "PRICE",
      token: targetToken,
      amount,
      referencePrice: priceTarget,
      interval: 1800,
      description: desc,
    };
  }

  // Send / pay to address → subscription
  if (recipient && (lower.includes("send") || lower.includes("pay") || lower.includes("transfer"))) {
    const shortAddr = recipient.length > 10 ? `${recipient.slice(0, 6)}...${recipient.slice(-4)}` : recipient;
    return {
      ruleType: "SUBSCRIPTION_PAYMENT",
      triggerType: "TIME",
      token: "FLOW",
      amount,
      interval,
      nextExecution: new Date(Date.now() + (isOneTime ? 60 : interval) * 1000),
      description: isOneTime ? `Send ${amount} FLOW to ${shortAddr}` : `Pay ${amount} FLOW to ${shortAddr} ${intervalLabel}`,
    };
  }

  // Save / savings / vault → savings transfer
  if (lower.includes("save") || lower.includes("saving") || lower.includes("vault")) {
    return {
      ruleType: "SAVINGS_TRANSFER",
      triggerType: "TIME",
      token: "FLOW",
      amount,
      interval,
      nextExecution: new Date(Date.now() + (isOneTime ? 60 : interval) * 1000),
      description: isOneTime ? `Transfer ${amount} FLOW to wallet` : `Auto-save ${amount} FLOW ${intervalLabel}`,
    };
  }

  // Pay / subscribe (without address) → subscription (user will need to add address in manual form)
  if (lower.includes("pay") || lower.includes("subscri")) {
    return {
      ruleType: "SUBSCRIPTION_PAYMENT",
      triggerType: "TIME",
      token: "FLOW",
      amount,
      interval,
      nextExecution: new Date(Date.now() + (isOneTime ? 60 : interval) * 1000),
      description: isOneTime ? `Send ${amount} FLOW` : `Pay ${amount} FLOW ${intervalLabel}`,
    };
  }

  // Buy / invest / DCA / swap → DCA
  if (lower.includes("buy") || lower.includes("invest") || lower.includes("dca") || lower.includes("swap")) {
    return {
      ruleType: "DCA_INVEST",
      triggerType: "TIME",
      token,
      amount,
      interval,
      nextExecution: new Date(Date.now() + (isOneTime ? 60 : interval) * 1000),
      description: isOneTime ? `Swap ${amount} FLOW → ${token}` : `DCA ${amount} FLOW → ${token} ${intervalLabel}`,
    };
  }

  return null;
}
