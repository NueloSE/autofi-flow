"use client";

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react";
import { useAutoFiStore, AutomationRule, VaultHistory, RuleType, TriggerType } from "@/store/useAutoFiStore";
import { RuleTypeBadge } from "@/components/RuleTypeBadge";
import { TokenIcon } from "@/components/TokenIcon";
import { parseNaturalLanguage } from "@/lib/parse-rule";
import { getFlowUsdPrice, formatUsd } from "@/lib/flow-prices";
import { PriceChart } from "@/components/PriceChart";
import {
  txSetupAccount,
  txDeposit,
  txWithdraw,
  txWithdrawTo,
  txCreateStrategy,
  txCreateScheduledStrategy,
  txExecuteStrategy,
  txCancelStrategy,
  queryVaultBalance,
  queryStrategies,
  queryIsEmergencyStopped,
  type OnChainStrategy,
} from "@/lib/flow-transactions";
import { parseFriendlyError } from "@/lib/parse-error";
import { fetchEventHistory, addEventsFromTx } from "@/lib/flow-events";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal,
  Play,
  X,
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronRight,
  Sparkles,
  Activity,
  Wallet,
  TrendingUp,
  Zap,
} from "lucide-react";
import { format } from "date-fns";

const RULE_TYPES: { value: RuleType; label: string; trigger: TriggerType }[] = [
  { value: "DCA_INVEST", label: "DCA Invest", trigger: "TIME" },
  { value: "SAVINGS_TRANSFER", label: "Savings", trigger: "TIME" },
  { value: "SUBSCRIPTION_PAYMENT", label: "Subscription", trigger: "TIME" },
  { value: "PRICE_DIP_BUY", label: "Buy the Dip", trigger: "PRICE" },
  { value: "PROFIT_SELL", label: "Take Profit", trigger: "PRICE" },
];

const INTERVALS: { value: number; label: string }[] = [
  { value: 0, label: "One-time" },
  { value: 60, label: "Every 1 min" },
  { value: 300, label: "Every 5 min" },
  { value: 900, label: "Every 15 min" },
  { value: 3600, label: "Every 1 hour" },
  { value: 14400, label: "Every 4 hours" },
  { value: 86400, label: "Every day" },
  { value: 604800, label: "Every week" },
  { value: 2592000, label: "Every month" },
];

// Map on-chain strategy → frontend AutomationRule
const STRATEGY_TYPE_NAMES: Record<string, RuleType> = {
  "0": "DCA_INVEST",
  "1": "SAVINGS_TRANSFER",
  "2": "SUBSCRIPTION_PAYMENT",
  "3": "PRICE_DIP_BUY",
  "4": "PROFIT_SELL",
};

function mapOnChainStrategy(s: OnChainStrategy): AutomationRule {
  const statusRaw = s.status?.rawValue ?? "0";
  const isActive = statusRaw === "0";
  const isPaused = statusRaw === "1";
  return {
    id: s.id,
    ruleType: STRATEGY_TYPE_NAMES[s.strategyType?.rawValue ?? "0"] || "DCA_INVEST",
    triggerType: Number(s.strategyType?.rawValue ?? 0) >= 3 ? "PRICE" : "TIME",
    token: s.token,
    amount: parseFloat(s.amountPerExecution) || 0,
    interval: Number(s.intervalSeconds) || 604800,
    nextExecution: new Date(parseFloat(s.nextExecution) * 1000),
    active: isActive,
    status: isActive ? "active" : isPaused ? "paused" : "cancelled",
    maxMonthlySpend: parseFloat(s.maxMonthlySpend) || 0,
    slippageTolerance: parseFloat(s.slippageTolerance) || 0,
    monthlySpent: parseFloat(s.monthlySpent) || 0,
    createdAt: new Date(parseFloat(s.createdAt) * 1000),
    executionCount: Number(s.executionCount) || 0,
    totalSpent: parseFloat(s.totalSpent) || 0,
    description: s.description,
  };
}

export default function DashboardPage() {
  const mountedRef = useRef(false);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const {
    walletAddress,
    isConnected,
    vaultBalance,
    rules,
    vaultHistory,
    allPaused,
    setVaultBalance,
    setRules,
    setVaultHistory,
    setAllPaused,
  } = useAutoFiStore();

  // Loading state for on-chain transactions
  const [txLoading, setTxLoading] = useState(false);

  // Creation mode

  // NLP state
  const [commandInput, setCommandInput] = useState("");
  const [parsedRule, setParsedRule] = useState<Partial<AutomationRule> | null>(null);
  const [parseError, setParseError] = useState("");

  // Manual form state
  const [manualType, setManualType] = useState<RuleType>("DCA_INVEST");
  const [manualToken, setManualToken] = useState("USDC");
  const [manualAmount, setManualAmount] = useState("50");
  const [manualInterval, setManualInterval] = useState(604800);
  const [manualRecipient, setManualRecipient] = useState("");
  const [priceDirection, setPriceDirection] = useState<"below" | "above">("below");
  const [targetPrice, setTargetPrice] = useState("");

  // Shared state
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawTo, setWithdrawTo] = useState("");
  const [showActivityModal, setShowActivityModal] = useState(false);

  // Sync price direction with strategy type
  useEffect(() => {
    if (manualType === "PRICE_DIP_BUY") setPriceDirection("below");
    else if (manualType === "PROFIT_SELL") setPriceDirection("above");
  }, [manualType]);

  // FLOW price
  const [flowPrice, setFlowPrice] = useState(0);
  useEffect(() => {
    getFlowUsdPrice().then((p) => {
      setFlowPrice(p);
      if (!targetPrice) setTargetPrice((p * 0.95).toFixed(4));
    });
    const iv = setInterval(() => getFlowUsdPrice().then(setFlowPrice), 60_000);
    return () => clearInterval(iv);
  }, []);

  // Fetch all on-chain data
  const refreshOnChainData = useCallback(async () => {
    if (!walletAddress) return;
    try {
      const [balance, strategies, stopped] = await Promise.all([
        queryVaultBalance(walletAddress),
        queryStrategies(walletAddress),
        queryIsEmergencyStopped(walletAddress),
      ]);
      if (!mountedRef.current) return;
      setVaultBalance(balance);
      setRules(strategies.map(mapOnChainStrategy));
      setAllPaused(stopped);

      // Fetch event history from Flow Access API (non-blocking)
      fetchEventHistory(walletAddress)
        .then((events) => {
          if (mountedRef.current) setVaultHistory(events);
        })
        .catch((err) => console.warn("Event fetch failed:", err));
    } catch (err) {
      console.error("Failed to fetch on-chain data:", err);
    }
  }, [walletAddress, setVaultBalance, setRules, setVaultHistory, setAllPaused]);

  // Auto-setup account once per session (survives page navigation)
  useEffect(() => {
    if (!walletAddress) return;
    const key = `autofi_setup_${walletAddress}`;
    if (sessionStorage.getItem(key)) {
      refreshOnChainData();
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await txSetupAccount();
        sessionStorage.setItem(key, "1");
      } catch {
        // vault may already exist — still mark as done so we don't re-prompt
        sessionStorage.setItem(key, "1");
      }
      if (!cancelled) refreshOnChainData();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress]);

  // Auto-poll on-chain data every 15s so scheduled executions appear without manual refresh
  useEffect(() => {
    if (!walletAddress) return;
    const interval = setInterval(() => {
      refreshOnChainData();
    }, 15_000);
    return () => clearInterval(interval);
  }, [walletAddress, refreshOnChainData]);

  // Tick every second so countdown timers and "executing" states update live
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeRules = rules.filter((r) => r.active);
  const totalInvested = rules.reduce((s, r) => s + r.totalSpent, 0);
  const totalExecutions = rules.reduce((s, r) => s + r.executionCount, 0);

  // Wrapper for on-chain transactions
  // fn should return the tx ID string for instant event capture
  const sendTx = async (fn: () => Promise<unknown>, successMsg?: string) => {
    setTxLoading(true);
    const toastId = toast.loading("Sending transaction to Flow...");
    try {
      const txId = await fn();
      // Instantly fetch events from this tx for immediate UI update
      if (typeof txId === "string" && walletAddress) {
        const updated = await addEventsFromTx(txId, walletAddress);
        setVaultHistory(updated);
      }
      await refreshOnChainData();
      toast.success(successMsg || "Transaction confirmed", { id: toastId });
    } catch (err) {
      console.error("Transaction failed:", err);
      toast.error(parseFriendlyError(err), { id: toastId });
    }
    setTxLoading(false);
  };

  const handleCommand = () => {
    if (!commandInput.trim()) return;
    const result = parseNaturalLanguage(commandInput, flowPrice);
    if (result) {
      setParsedRule(result);
      setParseError("");
    } else {
      setParseError("Could not parse. Try: \"Buy $50 of FLOW every week\"");
      setParsedRule(null);
    }
  };

  const createFromParsed = async () => {
    if (!parsedRule || !isConnected) return;
    const isPriceParsed = parsedRule.triggerType === "PRICE";
    let priceThreshold = 0;
    if (isPriceParsed && flowPrice > 0 && parsedRule.referencePrice && parsedRule.referencePrice > 0) {
      priceThreshold = ((parsedRule.amount || 5) * parsedRule.referencePrice) / flowPrice;
    }
    // Extract recipient from description for subscriptions (address was parsed into input)
    const addrMatch = commandInput.match(/\b(0x[a-fA-F0-9]{8,16})\b/);
    const strategyParams = {
      strategyType: parsedRule.ruleType!,
      token: parsedRule.token!,
      amountPerExecution: parsedRule.amount!,
      intervalSeconds: parsedRule.interval || 604800,
      maxMonthlySpend: 0,
      slippageTolerance: 2,
      description: parsedRule.description || "",
      recipient: parsedRule.ruleType === "SUBSCRIPTION_PAYMENT" && addrMatch ? addrMatch[1] : "",
      priceThreshold,
    };
    await sendTx(
      async () => {
        try {
          return await txCreateScheduledStrategy(strategyParams);
        } catch {
          // Fallback to non-scheduled if scheduler not deployed yet
          return await txCreateStrategy(strategyParams);
        }
      },
      "Strategy created & scheduled for auto-execution",
    );
    setCommandInput("");
    setParsedRule(null);
  };

  const createFromManual = async () => {
    if (!isConnected) return;
    const amount = parseFloat(manualAmount);
    if (!amount || amount <= 0) return;
    const selected = RULE_TYPES.find((r) => r.value === manualType)!;
    const isPriceTrig = selected.trigger === "PRICE";
    const isOneTime = manualInterval === 0;
    const intervalLabel = isOneTime ? "one-time" : (INTERVALS.find((i) => i.value === manualInterval)?.label.toLowerCase() || "weekly");

    let description = "";
    if (manualType === "DCA_INVEST") description = isOneTime ? `Swap ${amount} FLOW → ${manualToken}` : `DCA ${amount} FLOW → ${manualToken} ${intervalLabel}`;
    else if (manualType === "SAVINGS_TRANSFER") description = isOneTime ? `Transfer ${amount} FLOW to wallet` : `Auto-save ${amount} FLOW to wallet ${intervalLabel}`;
    else if (manualType === "SUBSCRIPTION_PAYMENT") {
      const shortAddr = manualRecipient.trim().length > 10 ? `${manualRecipient.trim().slice(0, 6)}...${manualRecipient.trim().slice(-4)}` : manualRecipient.trim();
      description = isOneTime ? `Send ${amount} FLOW to ${shortAddr}` : `Pay ${amount} FLOW to ${shortAddr} ${intervalLabel}`;
    }
    else if (manualType === "PRICE_DIP_BUY") description = `Buy ${manualToken} with ${amount} FLOW when FLOW drops below $${targetPrice}`;
    else if (manualType === "PROFIT_SELL") description = `Sell ${amount} FLOW → ${manualToken} when FLOW rises above $${targetPrice}`;

    // For price strategies: convert USD target price → expected swap output
    // If FLOW target = $0.025 and amount = 5 FLOW, then expected USDC output = 5 * 0.025 = 0.125
    // The contract compares getAmountsOut() against this threshold
    let priceThreshold = 0;
    if (isPriceTrig && flowPrice > 0) {
      const target = parseFloat(targetPrice) || 0;
      if (target > 0) {
        // Convert: at target FLOW/USD price, how much target token would amount FLOW get?
        priceThreshold = (amount * target) / flowPrice;
      }
    }

    const strategyParams = {
      strategyType: manualType === "PROFIT_SELL" && priceDirection === "below" ? "PRICE_DIP_BUY" : manualType === "PRICE_DIP_BUY" && priceDirection === "above" ? "PROFIT_SELL" : manualType,
      token: (manualType === "SAVINGS_TRANSFER" || manualType === "SUBSCRIPTION_PAYMENT") ? "FLOW" : manualToken,
      amountPerExecution: amount,
      intervalSeconds: isPriceTrig ? 1800 : (isOneTime ? 3153600000 : manualInterval),
      maxMonthlySpend: 0,
      slippageTolerance: 2,
      description,
      recipient: manualType === "SUBSCRIPTION_PAYMENT" ? manualRecipient.trim() : "",
      priceThreshold,
    };
    await sendTx(
      async () => {
        try {
          return await txCreateScheduledStrategy(strategyParams);
        } catch {
          // Fallback to non-scheduled if scheduler not deployed yet
          return await txCreateStrategy(strategyParams);
        }
      },
      "Strategy created & scheduled for auto-execution",
    );
  };


  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(depositAmount);
    if (!amt || amt <= 0 || !isConnected) return;
    await sendTx(() => txDeposit(amt), `Deposited ${amt} FLOW`);
    setDepositAmount("");
    setShowDeposit(false);
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt <= 0 || amt > vaultBalance || !isConnected) return;
    const recipient = withdrawTo.trim();
    if (recipient && recipient !== walletAddress) {
      const shortAddr = `${recipient.slice(0, 6)}...${recipient.slice(-4)}`;
      await sendTx(() => txWithdrawTo(amt, recipient), `Withdrew ${amt} FLOW to ${shortAddr}`);
    } else {
      await sendTx(() => txWithdraw(amt), `Withdrew ${amt} FLOW`);
    }
    setWithdrawAmount("");
    setWithdrawTo("");
    setShowWithdraw(false);
  };

  const selectedRuleType = RULE_TYPES.find((r) => r.value === manualType)!;
  const isPriceTrigger = selectedRuleType.trigger === "PRICE";

  // Not connected state
  if (!isConnected) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="border border-dashed border-zinc-800 rounded-lg px-6 py-24 text-center">
          <Wallet size={32} className="text-zinc-700 mx-auto mb-4" />
          <p className="text-lg font-mono text-zinc-400 mb-2">Connect your wallet</p>
          <p className="text-sm text-zinc-600">
            Connect a Flow wallet to start creating strategies
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Emergency banner */}
      <AnimatePresence>
        {allPaused && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-5 px-4 py-3 rounded-md border border-red-500/30 bg-red-500/5 text-red-400 text-sm font-mono"
          >
            ALERT: All automations paused — emergency stop active
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Strategy */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/60 backdrop-blur-sm">

          {/* ── Natural Language Command Bar (always visible) ── */}
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center gap-2 rounded-lg border border-zinc-700/60 bg-zinc-800/40 px-3 py-2 focus-within:border-amber-500/40 transition-colors duration-200">
              <Sparkles size={14} className="text-amber-500 shrink-0" />
              <input
                value={commandInput}
                onChange={(e) => {
                  setCommandInput(e.target.value);
                  setParseError("");
                  setParsedRule(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleCommand()}
                placeholder='Describe a strategy — "Buy 5 USDC every week" or "Buy the dip at 5%"'
                className="flex-1 bg-transparent border-none outline-none text-sm font-mono text-zinc-200 placeholder-zinc-500"
              />
              <button
                onClick={handleCommand}
                disabled={txLoading || !commandInput.trim()}
                className="px-3 py-1 bg-amber-500 text-zinc-950 rounded text-[11px] font-mono font-bold cursor-pointer hover:bg-amber-400 transition-colors duration-150 shrink-0 disabled:opacity-30"
              >
                GO
              </button>
            </div>

            <AnimatePresence>
              {parseError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 text-xs font-mono text-red-400"
                >
                  {parseError}
                </motion.div>
              )}
              {parsedRule && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <TokenIcon token={parsedRule.token || "FLOW"} size={16} />
                    <span className="text-[13px] text-zinc-200 font-mono truncate">{parsedRule.description}</span>
                    {parsedRule.ruleType && <RuleTypeBadge type={parsedRule.ruleType} />}
                  </div>
                  <button
                    onClick={createFromParsed}
                    disabled={txLoading}
                    className="px-4 py-1.5 bg-amber-500 text-zinc-950 rounded text-xs font-mono font-bold cursor-pointer hover:bg-amber-400 transition-colors duration-150 disabled:opacity-50 shrink-0"
                  >
                    {txLoading ? "..." : "CREATE"}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Divider */}
          <div className="mx-4 my-1 flex items-center gap-3">
            <div className="flex-1 h-px bg-zinc-800/60" />
            <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">or build manually</span>
            <div className="flex-1 h-px bg-zinc-800/60" />
          </div>

          {/* ── Manual Mode (always visible) ── */}
            <div className="px-4 py-4">
              <div className="flex items-center gap-2 mb-3">
                <Terminal size={13} className="text-amber-500" />
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">New Strategy</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {RULE_TYPES.map((rt) => (
                  <button
                    key={rt.value}
                    onClick={() => setManualType(rt.value)}
                    className={`px-3 py-1.5 rounded text-xs font-mono cursor-pointer transition-colors duration-150 border
                      ${manualType === rt.value
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                        : "bg-transparent border-zinc-800 text-zinc-500 hover:text-zinc-400 hover:border-zinc-700"
                      }`}
                  >
                    {rt.label}
                  </button>
                ))}
              </div>

              {/* Contextual hint — updates live with selected token, amount, interval */}
              <p className="text-[11px] font-mono text-zinc-600 mb-3">
                {manualType === "DCA_INVEST" && <>Swap <span className="text-zinc-400">{manualAmount || "—"} FLOW</span> → <span className="text-zinc-400">{manualToken}</span> {manualInterval === 0 ? "once" : (INTERVALS.find(i => i.value === manualInterval)?.label.toLowerCase() || "weekly")}</>}
                {manualType === "SAVINGS_TRANSFER" && <>Transfer <span className="text-zinc-400">{manualAmount || "—"} FLOW</span> to your wallet {manualInterval === 0 ? "once" : (INTERVALS.find(i => i.value === manualInterval)?.label.toLowerCase() || "weekly")} (no swap)</>}
                {manualType === "SUBSCRIPTION_PAYMENT" && <>Send <span className="text-zinc-400">{manualAmount || "—"} FLOW</span> to <span className="text-zinc-400">{manualRecipient || "recipient"}</span> {manualInterval === 0 ? "once" : (INTERVALS.find(i => i.value === manualInterval)?.label.toLowerCase() || "weekly")}</>}
                {manualType === "PRICE_DIP_BUY" && <>Buy <span className="text-zinc-400">{manualToken}</span> with <span className="text-zinc-400">{manualAmount || "—"} FLOW</span> when FLOW drops below <span className="text-zinc-400">${targetPrice || "—"}</span></>}
                {manualType === "PROFIT_SELL" && <>Sell <span className="text-zinc-400">{manualAmount || "—"} FLOW</span> → <span className="text-zinc-400">{manualToken}</span> when FLOW rises above <span className="text-zinc-400">${targetPrice || "—"}</span></>}
              </p>

              {/* ── Price Strategy UI (chart + order form) ── */}
              {isPriceTrigger ? (
                <div className="space-y-4">
                  {/* Price chart */}
                  <div className="border border-zinc-800/60 rounded-lg p-4 bg-zinc-950/50">
                    <PriceChart
                      currentPrice={flowPrice}
                      targetPrice={parseFloat(targetPrice) || undefined}
                      direction={priceDirection}
                    />
                  </div>

                  {/* Order form */}
                  <div className="border border-zinc-800/60 rounded-lg p-4 bg-zinc-950/50">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">New Price Order</span>
                    </div>

                    {/* Direction toggle */}
                    <div className="mb-4">
                      <label className="block text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-1.5">Execute when FLOW</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setPriceDirection("below"); setManualType("PRICE_DIP_BUY"); }}
                          className={`flex-1 py-2 rounded text-xs font-mono cursor-pointer transition-colors duration-150 border ${
                            priceDirection === "below"
                              ? "bg-red-500/10 border-red-500/30 text-red-400"
                              : "bg-transparent border-zinc-800 text-zinc-500 hover:text-zinc-400"
                          }`}
                        >
                          Drops below
                        </button>
                        <button
                          onClick={() => { setPriceDirection("above"); setManualType("PROFIT_SELL"); }}
                          className={`flex-1 py-2 rounded text-xs font-mono cursor-pointer transition-colors duration-150 border ${
                            priceDirection === "above"
                              ? "bg-green-500/10 border-green-500/30 text-green-400"
                              : "bg-transparent border-zinc-800 text-zinc-500 hover:text-zinc-400"
                          }`}
                        >
                          Rises above
                        </button>
                      </div>
                    </div>

                    {/* Target price + quick % buttons */}
                    <div className="mb-4">
                      <label className="block text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-1.5">Target price</label>
                      <div className="flex gap-2 items-center">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-mono">$</span>
                          <input
                            type="number"
                            min="0.0001"
                            step="0.0001"
                            value={targetPrice}
                            onChange={(e) => setTargetPrice(e.target.value)}
                            className="w-full bg-zinc-800/50 border border-zinc-800 rounded pl-7 pr-3 py-2 text-sm font-mono text-zinc-200 outline-none focus:border-amber-500/40 transition-colors duration-150"
                          />
                        </div>
                      </div>
                      <div className="flex gap-1.5 mt-2">
                        {[-10, -5, 5, 10].map((pct) => (
                          <button
                            key={pct}
                            onClick={() => {
                              if (flowPrice > 0) setTargetPrice((flowPrice * (1 + pct / 100)).toFixed(4));
                            }}
                            className={`px-2.5 py-1 rounded text-[10px] font-mono cursor-pointer transition-colors duration-150 border ${
                              pct < 0
                                ? "border-red-500/20 text-red-400 hover:bg-red-500/10"
                                : "border-green-500/20 text-green-400 hover:bg-green-500/10"
                            }`}
                          >
                            {pct > 0 ? "+" : ""}{pct}%
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Amount + Token */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <label className="block text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-1.5">Amount (FLOW)</label>
                        <div className="relative">
                          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                            <TokenIcon token="FLOW" size={16} />
                          </div>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={manualAmount}
                            onChange={(e) => setManualAmount(e.target.value)}
                            className="w-full bg-zinc-800/50 border border-zinc-800 rounded pl-8 pr-3 py-2 text-sm font-mono text-zinc-200 outline-none focus:border-amber-500/40 transition-colors duration-150"
                            placeholder="5"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-1.5">Swap to</label>
                        <div className="relative">
                          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                            <TokenIcon token={manualToken} size={18} />
                          </div>
                          <select
                            value={manualToken}
                            onChange={(e) => setManualToken(e.target.value)}
                            className="w-full bg-zinc-800/50 border border-zinc-800 rounded pl-8 pr-3 py-2 text-sm font-mono text-zinc-200 outline-none focus:border-amber-500/40 transition-colors duration-150 appearance-none cursor-pointer"
                          >
                            <option value="USDC">USDC</option>
                            <option value="stFLOW">stFLOW</option>
                            <option value="DUST">DUST</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Summary + Create */}
                    <div className={`p-3 rounded border mb-3 text-xs font-mono ${
                      priceDirection === "below"
                        ? "border-red-500/20 bg-red-500/5 text-red-300"
                        : "border-green-500/20 bg-green-500/5 text-green-300"
                    }`}>
                      When FLOW {priceDirection === "below" ? "drops below" : "rises above"} ${targetPrice || "—"}, swap {manualAmount || "0"} FLOW → {manualToken}
                    </div>

                    <button
                      onClick={createFromManual}
                      disabled={txLoading || !targetPrice || !(parseFloat(targetPrice) > 0)}
                      className="w-full px-4 py-2.5 bg-amber-500 text-zinc-950 rounded text-xs font-mono font-bold cursor-pointer hover:bg-amber-400 transition-colors duration-150 disabled:opacity-50"
                    >
                      {txLoading ? "SENDING..." : "CREATE ORDER"}
                    </button>
                  </div>
                </div>
              ) : (
                /* ── Non-price strategy form (DCA, Savings, Subscription) ── */
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {/* Token selector — hide for SAVINGS_TRANSFER & SUBSCRIPTION_PAYMENT (always FLOW) */}
                  {manualType !== "SAVINGS_TRANSFER" && manualType !== "SUBSCRIPTION_PAYMENT" ? (
                    <div>
                      <label className="block text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-1.5">
                        {manualType === "DCA_INVEST" ? "Buy Token" : "Token"}
                      </label>
                      <div className="relative">
                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                          <TokenIcon token={manualToken} size={18} />
                        </div>
                        <select
                          value={manualToken}
                          onChange={(e) => setManualToken(e.target.value)}
                          className="w-full bg-zinc-800/50 border border-zinc-800 rounded pl-8 pr-3 py-2 text-sm font-mono text-zinc-200 outline-none focus:border-amber-500/40 transition-colors duration-150 appearance-none cursor-pointer"
                        >
                          <option value="USDC">USDC</option>
                          <option value="FLOW">FLOW</option>
                          <option value="stFLOW">stFLOW</option>
                          <option value="DUST">DUST</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-1.5">Token</label>
                      <div className="flex items-center gap-2 bg-zinc-800/50 border border-zinc-800 rounded px-3 py-2">
                        <TokenIcon token="FLOW" size={18} />
                        <span className="text-sm font-mono text-zinc-400">FLOW</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-1.5">
                      {manualType === "DCA_INVEST" ? "FLOW per swap" : manualType === "SUBSCRIPTION_PAYMENT" ? "FLOW per payment" : manualType === "SAVINGS_TRANSFER" ? "FLOW per transfer" : "Amount"}
                    </label>
                    <div className="relative">
                      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                        <TokenIcon token="FLOW" size={16} />
                      </div>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={manualAmount}
                        onChange={(e) => setManualAmount(e.target.value)}
                        className="w-full bg-zinc-800/50 border border-zinc-800 rounded pl-8 pr-3 py-2 text-sm font-mono text-zinc-200 outline-none focus:border-amber-500/40 transition-colors duration-150 placeholder-zinc-600"
                        placeholder="50"
                      />
                    </div>
                  </div>

                  {/* Recipient field for subscriptions */}
                  {manualType === "SUBSCRIPTION_PAYMENT" ? (
                    <>
                      <div>
                        <label className="block text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-1.5">Recipient</label>
                        <input
                          type="text"
                          value={manualRecipient}
                          onChange={(e) => setManualRecipient(e.target.value)}
                          className="w-full bg-zinc-800/50 border border-zinc-800 rounded px-3 py-2 text-sm font-mono text-zinc-200 outline-none focus:border-amber-500/40 transition-colors duration-150 placeholder-zinc-600"
                          placeholder="0x..."
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-1.5">Frequency</label>
                        <select
                          value={manualInterval}
                          onChange={(e) => setManualInterval(Number(e.target.value))}
                          className="w-full bg-zinc-800/50 border border-zinc-800 rounded px-3 py-2 text-sm font-mono text-zinc-200 outline-none focus:border-amber-500/40 transition-colors duration-150 appearance-none cursor-pointer"
                        >
                          {INTERVALS.map((iv) => (
                            <option key={iv.value} value={iv.value}>{iv.label}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-1.5">Frequency</label>
                      <select
                        value={manualInterval}
                        onChange={(e) => setManualInterval(Number(e.target.value))}
                        className="w-full bg-zinc-800/50 border border-zinc-800 rounded px-3 py-2 text-sm font-mono text-zinc-200 outline-none focus:border-amber-500/40 transition-colors duration-150 appearance-none cursor-pointer"
                      >
                        {INTERVALS.map((iv) => (
                          <option key={iv.value} value={iv.value}>{iv.label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex items-end">
                    <button
                      onClick={createFromManual}
                      disabled={txLoading || (manualType === "SUBSCRIPTION_PAYMENT" && !manualRecipient.trim())}
                      className="w-full px-4 py-2 bg-amber-500 text-zinc-950 rounded text-xs font-mono font-bold cursor-pointer hover:bg-amber-400 transition-colors duration-150 disabled:opacity-50"
                    >
                      {txLoading ? "SENDING..." : "CREATE"}
                    </button>
                  </div>
                </div>
              )}
            </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8"
      >
        <StatCard
          icon={<Wallet size={16} />}
          label="Vault Balance"
          value={vaultBalance.toFixed(2)}
          valueSuffix={<span className="inline-flex items-center gap-1 ml-1.5"><TokenIcon token="FLOW" size={18} /><span className="text-sm font-normal text-zinc-500">FLOW</span></span>}
          sub={flowPrice > 0 ? `≈ ${formatUsd(vaultBalance * flowPrice)}` : undefined}
          highlight
          actions={
            <div className="flex gap-1 mt-3">
              <button
                onClick={() => { setShowDeposit(!showDeposit); setShowWithdraw(false); }}
                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono text-zinc-500 hover:text-amber-500 cursor-pointer bg-zinc-800/50 border border-zinc-800 hover:border-amber-500/20 transition-colors duration-150"
              >
                <ArrowDownToLine size={10} /> Deposit
              </button>
              <button
                onClick={() => { setShowWithdraw(!showWithdraw); setShowDeposit(false); }}
                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono text-zinc-500 hover:text-zinc-300 cursor-pointer bg-zinc-800/50 border border-zinc-800 hover:border-zinc-600 transition-colors duration-150"
              >
                <ArrowUpFromLine size={10} /> Withdraw
              </button>
            </div>
          }
        />
        <StatCard
          icon={<Activity size={16} />}
          label="Active Strategies"
          value={activeRules.length.toString()}
          sub={`of ${rules.length} total`}
        />
        <StatCard
          icon={<Zap size={16} />}
          label="Executions"
          value={totalExecutions.toString()}
          sub="all time"
        />
        <StatCard
          icon={<TrendingUp size={16} />}
          label="Total Invested"
          value={totalInvested.toFixed(2)}
          valueSuffix={<span className="inline-flex items-center gap-1 ml-1.5"><TokenIcon token="FLOW" size={18} /><span className="text-sm font-normal text-zinc-500">FLOW</span></span>}
          sub={flowPrice > 0 ? `≈ ${formatUsd(totalInvested * flowPrice)} across strategies` : "across strategies"}
        />
      </motion.div>

      {/* Deposit/Withdraw inline forms */}
      <AnimatePresence>
        {showDeposit && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleDeposit}
            className="mb-4 flex items-center gap-2 px-4 py-3 rounded-md border border-zinc-800 bg-zinc-900/50"
          >
              <span className="text-xs font-mono text-zinc-500 flex items-center gap-1.5">DEPOSIT <TokenIcon token="FLOW" size={14} /> FLOW</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="10.0"
                className="flex-1 bg-transparent border-none outline-none text-sm font-mono text-zinc-100 placeholder-zinc-600"
                autoFocus
              />
              {[1, 5, 10, 50].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setDepositAmount(q.toString())}
                  className="px-2 py-1 text-[10px] font-mono text-zinc-500 border border-zinc-800 rounded cursor-pointer hover:text-amber-500 hover:border-amber-500/30 bg-transparent transition-colors duration-150"
                >
                  {q}
                </button>
              ))}
            <button
              type="submit"
              disabled={txLoading}
              className="px-3 py-1.5 bg-amber-500 text-zinc-950 rounded text-xs font-mono font-bold cursor-pointer hover:bg-amber-400 transition-colors duration-150 disabled:opacity-50"
            >
              CONFIRM
            </button>
          </motion.form>
        )}
        {showWithdraw && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 rounded-md border border-zinc-800 bg-zinc-900/50 overflow-hidden"
          >
            {/* Recipient address */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-800/60 bg-zinc-900/40">
              <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider shrink-0">Send to</span>
              <input
                type="text"
                value={withdrawTo}
                onChange={(e) => setWithdrawTo(e.target.value)}
                placeholder={walletAddress || "0x... (leave empty for your wallet)"}
                className="flex-1 bg-transparent border-none outline-none text-xs font-mono text-zinc-400 placeholder-zinc-700"
              />
              {withdrawTo && (
                <button
                  type="button"
                  onClick={() => setWithdrawTo("")}
                  className="text-zinc-600 hover:text-zinc-400 cursor-pointer bg-transparent border-0 p-0.5"
                >
                  <X size={10} />
                </button>
              )}
            </div>
            <form
              onSubmit={handleWithdraw}
              className="flex items-center gap-2 px-4 py-3"
            >
              <span className="text-xs font-mono text-zinc-500 flex items-center gap-1.5">WITHDRAW <TokenIcon token="FLOW" size={14} /> FLOW</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              max={vaultBalance}
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="5.0"
              className="flex-1 bg-transparent border-none outline-none text-sm font-mono text-zinc-100 placeholder-zinc-600"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setWithdrawAmount(vaultBalance.toString())}
              className="px-2 py-1 text-[10px] font-mono text-zinc-500 border border-zinc-800 rounded cursor-pointer hover:text-zinc-300 hover:border-zinc-600 bg-transparent transition-colors duration-150"
            >
              MAX
            </button>
              <button
                type="submit"
                disabled={txLoading}
                className="px-3 py-1.5 bg-zinc-700 text-zinc-100 rounded text-xs font-mono font-bold cursor-pointer hover:bg-zinc-600 transition-colors duration-150 disabled:opacity-50"
              >
                CONFIRM
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        {/* Strategy List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
                Strategies
              </span>
              <span className="text-[10px] font-mono text-zinc-700 bg-zinc-800/50 px-1.5 py-0.5 rounded">
                {rules.length}
              </span>
            </div>
          </div>

          {rules.length === 0 ? (
            <div className="border border-dashed border-zinc-800 rounded-lg px-6 py-16 text-center">
              <Terminal size={24} className="text-zinc-700 mx-auto mb-3" />
              <p className="text-sm font-mono text-zinc-500 mb-1">No strategies yet</p>
              <p className="text-xs text-zinc-600">
                Deposit FLOW and create your first strategy above
              </p>
            </div>
          ) : (
            <div className="border border-zinc-800/60 rounded-lg overflow-hidden">
              {rules.map((rule, i) => (
                <motion.div
                  key={rule.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <StrategyRow
                    rule={rule}
                    mounted={mounted}
                    isLast={i === rules.length - 1}
                    flowPrice={flowPrice}
                    onExecute={async () => {
                      const isReady = rule.nextExecution && new Date(rule.nextExecution) <= new Date();
                      if (!isReady) {
                        toast.error("Strategy isn't ready yet — wait until the scheduled time passes, then try again.");
                        return;
                      }
                      await sendTx(() => txExecuteStrategy(Number(rule.id)), "Strategy executed");
                    }}
                    onCancel={async () => {
                      await sendTx(() => txCancelStrategy(Number(rule.id)), "Strategy cancelled");
                    }}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Activity Log */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
              Activity
            </span>
            {vaultHistory.length > 5 && (
              <button
                onClick={() => setShowActivityModal(true)}
                className="text-[10px] font-mono text-amber-500 hover:text-amber-400 cursor-pointer bg-transparent border-0 transition-colors"
              >
                View all ({vaultHistory.length})
              </button>
            )}
          </div>

          <div className="border border-zinc-800/60 rounded-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-zinc-800/40 bg-zinc-900/40">
              <div className="flex items-center justify-between text-[9px] font-mono text-zinc-600 uppercase tracking-wider">
                <span>Event</span>
                <span>Amount</span>
              </div>
            </div>

            {vaultHistory.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-xs font-mono text-zinc-700">No activity yet</p>
              </div>
            ) : (
              <>
                <ActivityList items={vaultHistory.slice(0, 5)} mounted={mounted} />
                {vaultHistory.length > 5 && (
                  <button
                    onClick={() => setShowActivityModal(true)}
                    className="w-full px-3 py-2.5 text-[10px] font-mono text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/30 cursor-pointer bg-transparent border-0 border-t border-zinc-800/30 transition-colors"
                  >
                    +{vaultHistory.length - 5} more
                  </button>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* Activity Modal */}
      <AnimatePresence>
        {showActivityModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowActivityModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-lg max-h-[70vh] bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden flex flex-col shadow-2xl shadow-black/50"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60">
                <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
                  All Activity ({vaultHistory.length})
                </span>
                <button
                  onClick={() => setShowActivityModal(false)}
                  className="p-1 text-zinc-600 hover:text-zinc-300 cursor-pointer bg-transparent border-0 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <ActivityList items={vaultHistory} mounted={mounted} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ActivityList({ items, mounted }: { items: VaultHistory[]; mounted: boolean }) {
  return (
    <>
      {items.map((h, i) => {
        const dotColor =
          h.type === "deposit" ? "bg-green-500"
          : h.type === "withdraw" || h.type === "withdraw_to" ? "bg-red-400"
          : h.type === "strategy_created" ? "bg-amber-500"
          : h.type === "strategy_cancelled" ? "bg-zinc-500"
          : h.type === "emergency_stop" ? "bg-red-500"
          : h.type === "resume_all" ? "bg-blue-400"
          : "bg-amber-500";
        const amountColor =
          h.amount > 0 ? "text-green-500" : h.amount < 0 ? "text-red-400" : "text-zinc-600";
        return (
          <div
            key={h.id}
            className={`flex items-center justify-between px-3 py-2.5
              ${i < items.length - 1 ? "border-b border-zinc-800/30" : ""}`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
              <div className="min-w-0">
                <div className="text-xs text-zinc-400 truncate">{h.description}</div>
                <div className="text-[10px] font-mono text-zinc-700">
                  {mounted ? format(new Date(h.timestamp), "MM/dd HH:mm") : "--"}
                </div>
              </div>
            </div>
            {h.amount !== 0 && (
              <span className={`text-xs font-mono font-semibold shrink-0 flex items-center gap-1 ${amountColor}`}>
                {h.amount > 0 ? "+" : ""}{h.amount.toFixed(2)}
                <TokenIcon token="FLOW" size={12} />
              </span>
            )}
          </div>
        );
      })}
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
  valueSuffix,
  sub,
  highlight,
  actions,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueSuffix?: React.ReactNode;
  sub?: string;
  highlight?: boolean;
  actions?: React.ReactNode;
}) {
  return (
    <div className={`rounded-lg px-4 py-4 border transition-colors duration-200
      ${highlight
        ? "border-amber-500/20 bg-amber-500/3"
        : "border-zinc-800/60 bg-zinc-900/40 hover:border-zinc-700"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
          {label}
        </span>
        <div className={highlight ? "text-amber-500" : "text-zinc-600"}>
          {icon}
        </div>
      </div>
      <div className={`text-xl font-mono font-bold tracking-tight flex items-center
        ${highlight ? "text-amber-500" : "text-zinc-200"}`}
      >
        {value}{valueSuffix}
      </div>
      {sub && (
        <div className="text-[10px] font-mono text-zinc-700 mt-0.5">{sub}</div>
      )}
      {actions}
    </div>
  );
}

function formatCountdown(target: Date): string {
  const diff = Math.max(0, target.getTime() - Date.now());
  if (diff === 0) return "now";
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

function StrategyRow({
  rule,
  mounted,
  isLast,
  flowPrice,
  onExecute,
  onCancel,
}: {
  rule: AutomationRule;
  mounted: boolean;
  isLast: boolean;
  flowPrice: number;
  onExecute: () => void;
  onCancel: () => void;
}) {
  const now = Date.now();
  const nextExecTime = rule.nextExecution ? new Date(rule.nextExecution).getTime() : 0;
  const isReady = mounted && rule.active && nextExecTime > 0 && nextExecTime <= now;
  const isPriceStrategy = rule.ruleType === "PRICE_DIP_BUY" || rule.ruleType === "PROFIT_SELL";

  const statusColor = !rule.active
    ? "bg-zinc-600"
    : isReady
    ? "bg-green-500"
    : "bg-amber-500";

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3.5 group hover:bg-zinc-800/20 transition-colors duration-150
        ${!isLast ? "border-b border-zinc-800/40" : ""}
        ${!rule.active ? "opacity-35" : ""}
        ${isReady ? "bg-green-500/[0.03]" : ""}`}
    >
      {/* Status dot — pulses when executing */}
      <div className="relative shrink-0">
        <div className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
        {isReady && (
          <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
        )}
      </div>
      <RuleTypeBadge type={rule.ruleType} />
      <span className="text-sm font-mono text-zinc-300 flex-1 min-w-0 truncate">
        {rule.description}
      </span>
      <span className="text-xs font-mono text-zinc-500 shrink-0 tabular-nums flex items-center gap-1">
        <TokenIcon token={rule.token || "FLOW"} size={14} />
        {rule.amount} {rule.token || "FLOW"}
      </span>
      <div className="w-px h-3 bg-zinc-800 shrink-0" />
      <span className="text-[10px] font-mono text-zinc-600 shrink-0 tabular-nums">
        {rule.executionCount}x run
        {flowPrice > 0 && rule.totalSpent > 0 && (
          <span className="text-zinc-700"> · {formatUsd(rule.totalSpent * flowPrice)}</span>
        )}
      </span>
      {rule.nextExecution && rule.active && (
        <>
          <div className="w-px h-3 bg-zinc-800 shrink-0" />
          {!mounted ? (
            <span className="text-[10px] font-mono text-zinc-600 shrink-0">---</span>
          ) : isPriceStrategy ? (
            <span className="text-[10px] font-mono text-amber-500/80 shrink-0 flex items-center gap-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
              </span>
              Watching price...
            </span>
          ) : isReady ? (
            <span className="text-[10px] font-mono text-green-500 shrink-0 flex items-center gap-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
              </span>
              ready
            </span>
          ) : (
            <span className="text-[10px] font-mono text-zinc-500 shrink-0 tabular-nums">
              {formatCountdown(new Date(rule.nextExecution))}
            </span>
          )}
        </>
      )}
      {rule.active && (
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button
            onClick={onExecute}
            title="Execute now"
            className="p-1.5 rounded text-zinc-700 hover:text-amber-500 hover:bg-amber-500/10 cursor-pointer bg-transparent border-0 transition-colors duration-150"
          >
            <Play size={12} />
          </button>
          <button
            onClick={onCancel}
            title="Cancel"
            className="p-1.5 rounded text-zinc-700 hover:text-red-400 hover:bg-red-500/10 cursor-pointer bg-transparent border-0 transition-colors duration-150"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
