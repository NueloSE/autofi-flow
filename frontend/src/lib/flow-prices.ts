// Fetches FLOW/USD price from CoinGecko (free, no API key)
// Caches for 60s to avoid rate limits

let cachedPrice: number | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000;

export async function getFlowUsdPrice(): Promise<number> {
  const now = Date.now();
  if (cachedPrice !== null && now - cacheTimestamp < CACHE_TTL) {
    return cachedPrice;
  }
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=flow&vs_currencies=usd"
    );
    if (!res.ok) return cachedPrice ?? 0;
    const data = await res.json();
    const price = data?.flow?.usd ?? 0;
    cachedPrice = price;
    cacheTimestamp = now;
    return price;
  } catch {
    return cachedPrice ?? 0;
  }
}

export function formatUsd(amount: number): string {
  if (amount < 0.01 && amount > 0) return "<$0.01";
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
