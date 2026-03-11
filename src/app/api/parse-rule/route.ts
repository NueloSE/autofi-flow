import { NextRequest, NextResponse } from "next/server";

// Lightweight rule parser API for natural language automation input
export async function POST(request: NextRequest) {
  const { input } = await request.json();

  if (!input) {
    return NextResponse.json({ error: "Input is required" }, { status: 400 });
  }

  const lower = input.toLowerCase();

  const amountMatch = lower.match(/\$(\d+(?:\.\d+)?)/);
  const amount = amountMatch ? parseFloat(amountMatch[1]) : 50;
  const token = lower.includes("usdc") ? "USDC" : "FLOW";

  let interval = 604800;
  let intervalLabel = "weekly";
  if (lower.includes("daily") || lower.includes("every day")) {
    interval = 86400; intervalLabel = "daily";
  } else if (lower.includes("weekly") || lower.includes("every week") || lower.includes("monday") || lower.includes("friday")) {
    interval = 604800; intervalLabel = "weekly";
  } else if (lower.includes("monthly") || lower.includes("every month")) {
    interval = 2592000; intervalLabel = "monthly";
  }

  const pctMatch = lower.match(/(\d+(?:\.\d+)?)%/);
  const pct = pctMatch ? parseFloat(pctMatch[1]) : 5;

  if (lower.includes("buy") && (lower.includes("drop") || lower.includes("dip") || lower.includes("fall"))) {
    return NextResponse.json({
      ruleType: "PRICE_DIP_BUY", triggerType: "PRICE",
      token, amount, priceChangePercent: pct, referencePrice: 1.0,
      description: `Buy $${amount} of ${token} when price drops ${pct}%`,
    });
  }
  if (lower.includes("sell") && (lower.includes("rise") || lower.includes("profit") || lower.includes("gain"))) {
    return NextResponse.json({
      ruleType: "PROFIT_SELL", triggerType: "PRICE",
      token, amount, priceChangePercent: pct, referencePrice: 1.0,
      description: `Sell $${amount} of ${token} when price rises ${pct}%`,
    });
  }
  if (lower.includes("save") || lower.includes("saving")) {
    return NextResponse.json({
      ruleType: "SAVINGS_TRANSFER", triggerType: "TIME",
      token, amount, interval,
      description: `Save $${amount} ${token} ${intervalLabel}`,
    });
  }
  if (lower.includes("pay") || lower.includes("subscription")) {
    return NextResponse.json({
      ruleType: "SUBSCRIPTION_PAYMENT", triggerType: "TIME",
      token, amount, interval,
      description: `Pay $${amount} ${token} ${intervalLabel}`,
    });
  }
  // Default: DCA
  return NextResponse.json({
    ruleType: "DCA_INVEST", triggerType: "TIME",
    token, amount, interval,
    description: `Buy $${amount} of ${token} ${intervalLabel}`,
  });
}
