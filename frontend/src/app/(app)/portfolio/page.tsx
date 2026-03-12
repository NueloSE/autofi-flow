"use client";

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react";
import { useAutoFiStore } from "@/store/useAutoFiStore";
import { TokenIcon } from "@/components/TokenIcon";
import { queryAllBalances, type TokenBalance } from "@/lib/flow-balances";
import { getFlowUsdPrice, formatUsd } from "@/lib/flow-prices";
import { motion } from "framer-motion";
import { Wallet, TrendingUp, RefreshCw, Loader2, PieChart } from "lucide-react";

// Rough USD conversion per token (relative to FLOW price)
// USDC is pegged to $1. stFLOW ≈ FLOW. DUST is tiny.
function tokenToUsd(symbol: string, balance: number, flowPrice: number): number {
  switch (symbol) {
    case "FLOW":
      return balance * flowPrice;
    case "USDC":
      return balance; // 1:1 USD
    case "stFLOW":
      return balance * flowPrice * 1.05; // stFLOW slightly above FLOW
    case "DUST":
      return balance * flowPrice * 0.0025; // rough estimate
    default:
      return 0;
  }
}

export default function PortfolioPage() {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const { walletAddress, isConnected } = useAutoFiStore();
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [flowPrice, setFlowPrice] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchData = useCallback(async (showLoader = true) => {
    if (!walletAddress) return;
    if (showLoader) setLoading(true);
    else setRefreshing(true);
    try {
      const [bals, price] = await Promise.all([
        queryAllBalances(walletAddress),
        getFlowUsdPrice(),
      ]);
      if (mountedRef.current) {
        setBalances(bals);
        setFlowPrice(price);
      }
    } catch (err) {
      console.error("Failed to fetch portfolio:", err);
    }
    if (mountedRef.current) {
      setLoading(false);
      setRefreshing(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (walletAddress) fetchData();
  }, [walletAddress, fetchData]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!walletAddress) return;
    const iv = setInterval(() => fetchData(false), 30_000);
    return () => clearInterval(iv);
  }, [walletAddress, fetchData]);

  // Calculate totals
  const totalUsd = balances.reduce(
    (sum, b) => sum + tokenToUsd(b.symbol, b.balance, flowPrice),
    0
  );
  const totalFlowEquiv = flowPrice > 0 ? totalUsd / flowPrice : 0;

  // Non-zero balances for display
  const activeBalances = balances.filter((b) => b.balance > 0);
  const emptyBalances = balances.filter((b) => b.balance === 0);

  if (!isConnected) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="border border-dashed border-zinc-800 rounded-lg px-6 py-24 text-center">
          <Wallet size={32} className="text-zinc-700 mx-auto mb-4" />
          <p className="text-lg font-mono text-zinc-400 mb-2">Connect your wallet</p>
          <p className="text-sm text-zinc-600">
            Connect a Flow wallet to view your portfolio
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight flex items-center gap-2.5">
            <PieChart size={20} className="text-amber-500" />
            Portfolio
          </h1>
          <p className="text-xs font-mono text-zinc-600 mt-1">
            All token balances across your Flow account
          </p>
        </div>
        <button
          onClick={() => fetchData(false)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800/50 border border-zinc-800 rounded text-[10px] font-mono text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 cursor-pointer transition-colors disabled:opacity-50"
        >
          {refreshing ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
          Refresh
        </button>
      </div>

      {/* Total Value Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6 rounded-lg border border-amber-500/20 bg-amber-500/3 px-6 py-6"
      >
        <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-2">
          Total Portfolio Value
        </div>
        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 size={16} className="animate-spin text-amber-500" />
            <span className="text-sm font-mono text-zinc-500">Loading balances...</span>
          </div>
        ) : (
          <>
            <div className="text-3xl font-mono font-bold text-amber-500 tracking-tight">
              {mounted && flowPrice > 0 ? formatUsd(totalUsd) : "—"}
            </div>
            <div className="flex items-center gap-3 mt-2">
              {flowPrice > 0 && (
                <span className="text-xs font-mono text-zinc-500">
                  ≈ {totalFlowEquiv.toFixed(2)} FLOW equivalent
                </span>
              )}
              {flowPrice > 0 && (
                <>
                  <span className="text-zinc-800">·</span>
                  <span className="text-[10px] font-mono text-zinc-600">
                    FLOW = {formatUsd(flowPrice)}
                  </span>
                </>
              )}
            </div>
          </>
        )}
      </motion.div>

      {/* Token Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
            Token Breakdown
          </span>
          <span className="text-[10px] font-mono text-zinc-700 bg-zinc-800/50 px-1.5 py-0.5 rounded">
            {activeBalances.length} active
          </span>
        </div>

        {loading ? (
          <div className="border border-zinc-800/60 rounded-lg px-6 py-12 text-center">
            <Loader2 size={20} className="animate-spin text-zinc-600 mx-auto mb-2" />
            <p className="text-xs font-mono text-zinc-600">Querying on-chain balances...</p>
          </div>
        ) : (
          <div className="border border-zinc-800/60 rounded-lg overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-4 py-2.5 border-b border-zinc-800/40 bg-zinc-900/40">
              <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider">Token</span>
              <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider text-right w-28">Balance</span>
              <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider text-right w-24">USD Value</span>
              <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider text-right w-16">Share</span>
            </div>

            {/* Active balances */}
            {activeBalances.map((b, i) => {
              const usdVal = tokenToUsd(b.symbol, b.balance, flowPrice);
              const pct = totalUsd > 0 ? (usdVal / totalUsd) * 100 : 0;
              return (
                <div
                  key={b.token}
                  className={`grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-4 py-3.5 hover:bg-zinc-800/20 transition-colors
                    ${i < activeBalances.length - 1 || emptyBalances.length > 0 ? "border-b border-zinc-800/30" : ""}`}
                >
                  <div className="flex items-center gap-2.5">
                    <TokenIcon token={b.icon} size={24} />
                    <div>
                      <div className="text-sm font-mono text-zinc-200">{b.token}</div>
                      {b.isVault && (
                        <div className="text-[10px] font-mono text-amber-500/60">AutoFi Vault</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right w-28">
                    <div className="text-sm font-mono text-zinc-300 tabular-nums">
                      {b.balance.toFixed(b.symbol === "DUST" ? 0 : 4)}
                    </div>
                    <div className="text-[10px] font-mono text-zinc-600">{b.symbol}</div>
                  </div>
                  <div className="text-right w-24">
                    <span className="text-sm font-mono text-zinc-400 tabular-nums">
                      {flowPrice > 0 ? formatUsd(usdVal) : "—"}
                    </span>
                  </div>
                  <div className="text-right w-16">
                    <div className="flex items-center justify-end gap-1.5">
                      <div className="w-10 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-500"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-zinc-600 tabular-nums w-8 text-right">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Empty balances */}
            {emptyBalances.map((b, i) => (
              <div
                key={b.token}
                className={`grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-4 py-3 opacity-40
                  ${i < emptyBalances.length - 1 ? "border-b border-zinc-800/30" : ""}`}
              >
                <div className="flex items-center gap-2.5">
                  <TokenIcon token={b.icon} size={24} />
                  <span className="text-sm font-mono text-zinc-500">{b.token}</span>
                </div>
                <span className="text-sm font-mono text-zinc-700 text-right w-28">0.00</span>
                <span className="text-sm font-mono text-zinc-700 text-right w-24">—</span>
                <span className="text-[10px] font-mono text-zinc-700 text-right w-16">0%</span>
              </div>
            ))}

            {balances.length === 0 && (
              <div className="px-4 py-12 text-center">
                <p className="text-xs font-mono text-zinc-600">No token balances found</p>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Price info footer */}
      {flowPrice > 0 && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 flex items-center justify-between text-[10px] font-mono text-zinc-700"
        >
          <span>Prices via CoinGecko · USDC = $1.00 · stFLOW ≈ FLOW · DUST estimated</span>
          <span>Auto-refreshes every 30s</span>
        </motion.div>
      )}
    </div>
  );
}
