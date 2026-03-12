import { AutomationRule } from "@/store/useAutoFiStore";

export function parseNaturalLanguage(input: string): Partial<AutomationRule> | null {
  const lower = input.toLowerCase().trim();

  // ── Token detection ──
  const token = lower.includes("usdc") ? "USDC" : "FLOW";

  // ── Amount detection ──
  // Matches: "$5", "$50.5", "5 usdc", "5 flow", "5 of", or bare number before token
  let amount: number | null = null;
  const dollarMatch = lower.match(/\$(\d+(?:\.\d+)?)/);
  if (dollarMatch) {
    amount = parseFloat(dollarMatch[1]);
  } else {
    const tokenAmountMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:usdc|flow|of\b)/);
    if (tokenAmountMatch) {
      amount = parseFloat(tokenAmountMatch[1]);
    } else {
      const bareMatch = lower.match(/(?:buy|invest|save|pay|dca|swap)\s+(\d+(?:\.\d+)?)/);
      if (bareMatch) amount = parseFloat(bareMatch[1]);
    }
  }
  if (!amount || amount <= 0) amount = 50; // fallback

  // ── Interval detection ──
  let interval = 604800; // default weekly
  let intervalLabel = "weekly";

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
  // "every minute/hour/day/week/month" (no number)
  else if (lower.match(/every\s*(min|minute)/)) { interval = 60; intervalLabel = "every minute"; }
  else if (lower.match(/every\s*(hr|hour)/)) { interval = 3600; intervalLabel = "hourly"; }
  else if (lower.includes("daily") || lower.includes("every day")) { interval = 86400; intervalLabel = "daily"; }
  else if (lower.includes("weekly") || lower.includes("every week")) { interval = 604800; intervalLabel = "weekly"; }
  else if (lower.includes("monthly") || lower.includes("every month")) { interval = 2592000; intervalLabel = "monthly"; }
  else if (lower.includes("hourly")) { interval = 3600; intervalLabel = "hourly"; }

  // ── Rule type detection ──
  if (lower.includes("buy") && (lower.includes("drop") || lower.includes("dip") || lower.includes("fall"))) {
    const pctMatch = lower.match(/(\d+(?:\.\d+)?)%/);
    return {
      ruleType: "PRICE_DIP_BUY",
      triggerType: "PRICE",
      token,
      amount,
      priceChangePercent: pctMatch ? parseFloat(pctMatch[1]) : 5,
      referencePrice: 1.0,
      description: `Buy ${amount} ${token} when price drops ${pctMatch?.[1] ?? 5}%`,
    };
  }

  if (lower.includes("sell") && (lower.includes("rise") || lower.includes("profit") || lower.includes("gain"))) {
    const pctMatch = lower.match(/(\d+(?:\.\d+)?)%/);
    return {
      ruleType: "PROFIT_SELL",
      triggerType: "PRICE",
      token,
      amount,
      priceChangePercent: pctMatch ? parseFloat(pctMatch[1]) : 10,
      referencePrice: 1.0,
      description: `Sell ${amount} ${token} when price rises ${pctMatch?.[1] ?? 10}%`,
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
      description: `Save ${amount} ${token} ${intervalLabel}`,
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
      description: `Pay ${amount} ${token} ${intervalLabel}`,
    };
  }

  if (lower.includes("buy") || lower.includes("invest") || lower.includes("dca") || lower.includes("swap")) {
    return {
      ruleType: "DCA_INVEST",
      triggerType: "TIME",
      token,
      amount,
      interval,
      nextExecution: new Date(Date.now() + interval * 1000),
      description: `DCA ${amount} FLOW → ${token} ${intervalLabel}`,
    };
  }

  return null;
}
