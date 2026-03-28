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

// ── Historical price data for chart ──

export interface PricePoint {
  timestamp: number;
  price: number;
}

let cachedChart: PricePoint[] | null = null;
let chartCacheTimestamp = 0;
const CHART_CACHE_TTL = 120_000; // 2 min

export async function getFlowPriceHistory(days: number = 1): Promise<PricePoint[]> {
  const now = Date.now();
  if (cachedChart && now - chartCacheTimestamp < CHART_CACHE_TTL) {
    return cachedChart;
  }
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/flow/market_chart?vs_currency=usd&days=${days}`
    );
    if (!res.ok) return cachedChart ?? [];
    const data = await res.json();
    const points: PricePoint[] = (data?.prices ?? []).map((p: [number, number]) => ({
      timestamp: p[0],
      price: p[1],
    }));
    cachedChart = points;
    chartCacheTimestamp = now;
    return points;
  } catch {
    return cachedChart ?? [];
  }
}

export function get24hChange(points: PricePoint[]): number {
  if (points.length < 2) return 0;
  const first = points[0].price;
  const last = points[points.length - 1].price;
  return ((last - first) / first) * 100;
}
