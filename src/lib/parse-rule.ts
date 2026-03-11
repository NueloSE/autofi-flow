import { AutomationRule } from "@/store/useAutoFiStore";

export function parseNaturalLanguage(input: string): Partial<AutomationRule> | null {
  const lower = input.toLowerCase().trim();

  const amountMatch = lower.match(/\$(\d+(?:\.\d+)?)/);
  const amount = amountMatch ? parseFloat(amountMatch[1]) : 50;

  const token = lower.includes("usdc") ? "USDC" : "FLOW";

  let interval = 604800;
  let intervalLabel = "weekly";
  if (lower.includes("daily") || lower.includes("every day")) {
    interval = 86400;
    intervalLabel = "daily";
  } else if (lower.includes("monthly") || lower.includes("every month")) {
    interval = 2592000;
    intervalLabel = "monthly";
  }

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

  if (lower.includes("sell") && (lower.includes("rise") || lower.includes("profit") || lower.includes("gain"))) {
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
