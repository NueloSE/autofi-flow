"use client";

import { useState, useEffect } from "react";
import { useAutoFiStore, AutomationRule, RuleType, TriggerType } from "@/store/useAutoFiStore";
import { RuleTypeBadge } from "@/components/RuleTypeBadge";
import { parseNaturalLanguage } from "@/lib/parse-rule";
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
  SlidersHorizontal,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

const RULE_TYPES: { value: RuleType; label: string; trigger: TriggerType }[] = [
  { value: "DCA_INVEST", label: "DCA Invest", trigger: "TIME" },
  { value: "SAVINGS_TRANSFER", label: "Savings", trigger: "TIME" },
  { value: "SUBSCRIPTION_PAYMENT", label: "Subscription", trigger: "TIME" },
  { value: "PRICE_DIP_BUY", label: "Buy the Dip", trigger: "PRICE" },
  { value: "PROFIT_SELL", label: "Take Profit", trigger: "PRICE" },
];

const INTERVALS: { value: number; label: string }[] = [
  { value: 86400, label: "Daily" },
  { value: 604800, label: "Weekly" },
  { value: 1209600, label: "Bi-weekly" },
  { value: 2592000, label: "Monthly" },
];

export default function DashboardPage() {
  const mounted = useMounted();
  const {
    vaultBalance,
    rules,
    vaultHistory,
    allPaused,
    addRule,
    simulateExecution,
    cancelRule,
    deposit,
    withdraw,
  } = useAutoFiStore();

  // Creation mode
  const [mode, setMode] = useState<"nlp" | "manual">("nlp");

  // NLP state
  const [commandInput, setCommandInput] = useState("");
  const [parsedRule, setParsedRule] = useState<Partial<AutomationRule> | null>(null);
  const [parseError, setParseError] = useState("");

  // Manual form state
  const [manualType, setManualType] = useState<RuleType>("DCA_INVEST");
  const [manualToken, setManualToken] = useState("FLOW");
  const [manualAmount, setManualAmount] = useState("50");
  const [manualInterval, setManualInterval] = useState(604800);
  const [manualPricePct, setManualPricePct] = useState("5");

  // Shared state
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [justCreated, setJustCreated] = useState(false);

  const activeRules = rules.filter((r) => r.active);
  const totalInvested = rules.reduce((s, r) => s + r.totalSpent, 0);
  const totalExecutions = rules.reduce((s, r) => s + r.executionCount, 0);

  const handleCommand = () => {
    if (!commandInput.trim()) return;
    const result = parseNaturalLanguage(commandInput);
    if (result) {
      setParsedRule(result);
      setParseError("");
    } else {
      setParseError("Could not parse. Try: \"Buy $50 of FLOW every week\"");
      setParsedRule(null);
    }
  };

  const createFromParsed = () => {
    if (!parsedRule) return;
    addRule({
      ruleType: parsedRule.ruleType!,
      triggerType: parsedRule.triggerType!,
      token: parsedRule.token!,
      amount: parsedRule.amount!,
      interval: parsedRule.interval,
      nextExecution: parsedRule.nextExecution,
      referencePrice: parsedRule.referencePrice,
      priceChangePercent: parsedRule.priceChangePercent,
      notifyBeforeExecution: false,
      active: true,
      status: "active",
      maxMonthlySpend: 0,
      slippageTolerance: 2,
      description: parsedRule.description || "",
    });
    setCommandInput("");
    setParsedRule(null);
    flashCreated();
  };

  const createFromManual = () => {
    const amount = parseFloat(manualAmount);
    if (!amount || amount <= 0) return;
    const selected = RULE_TYPES.find((r) => r.value === manualType)!;
    const isPriceTrigger = selected.trigger === "PRICE";
    const intervalLabel = INTERVALS.find((i) => i.value === manualInterval)?.label.toLowerCase() || "weekly";

    let description = "";
    if (manualType === "DCA_INVEST") description = `Buy $${amount} of ${manualToken} ${intervalLabel}`;
    else if (manualType === "SAVINGS_TRANSFER") description = `Save $${amount} ${manualToken} ${intervalLabel}`;
    else if (manualType === "SUBSCRIPTION_PAYMENT") description = `Pay $${amount} ${manualToken} ${intervalLabel}`;
    else if (manualType === "PRICE_DIP_BUY") description = `Buy $${amount} of ${manualToken} when price drops ${manualPricePct}%`;
    else if (manualType === "PROFIT_SELL") description = `Sell $${amount} of ${manualToken} when price rises ${manualPricePct}%`;

    addRule({
      ruleType: manualType,
      triggerType: selected.trigger,
      token: manualToken,
      amount,
      interval: isPriceTrigger ? undefined : manualInterval,
      nextExecution: isPriceTrigger ? undefined : new Date(Date.now() + manualInterval * 1000),
      referencePrice: isPriceTrigger ? 1.0 : undefined,
      priceChangePercent: isPriceTrigger ? parseFloat(manualPricePct) : undefined,
      notifyBeforeExecution: false,
      active: true,
      status: "active",
      maxMonthlySpend: 0,
      slippageTolerance: 2,
      description,
    });
    flashCreated();
  };

  const flashCreated = () => {
    setJustCreated(true);
    setTimeout(() => setJustCreated(false), 2000);
  };

  const handleDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(depositAmount);
    if (!amt || amt <= 0) return;
    deposit(amt);
    setDepositAmount("");
    setShowDeposit(false);
  };

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt <= 0 || amt > vaultBalance) return;
    withdraw(amt);
    setWithdrawAmount("");
    setShowWithdraw(false);
  };

  const selectedRuleType = RULE_TYPES.find((r) => r.value === manualType)!;
  const isPriceTrigger = selectedRuleType.trigger === "PRICE";

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

      {/* Success flash */}
      <AnimatePresence>
        {justCreated && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-5 px-4 py-3 rounded-md border border-amber-500/30 bg-amber-500/5 text-amber-500 text-sm font-mono flex items-center gap-2"
          >
            <Zap size={14} /> Strategy created successfully
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
          {/* Header with mode toggle */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800/60">
            <div className="flex items-center gap-2">
              <Terminal size={13} className="text-amber-500" />
              <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
                Create Strategy
              </span>
            </div>
            <div className="flex items-center bg-zinc-800/50 rounded p-0.5">
              <button
                onClick={() => setMode("nlp")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-mono cursor-pointer transition-colors duration-150 border-0
                  ${mode === "nlp"
                    ? "bg-amber-500/15 text-amber-500"
                    : "bg-transparent text-zinc-500 hover:text-zinc-400"
                  }`}
              >
                <Sparkles size={10} /> Natural
              </button>
              <button
                onClick={() => setMode("manual")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-mono cursor-pointer transition-colors duration-150 border-0
                  ${mode === "manual"
                    ? "bg-amber-500/15 text-amber-500"
                    : "bg-transparent text-zinc-500 hover:text-zinc-400"
                  }`}
              >
                <SlidersHorizontal size={10} /> Manual
              </button>
            </div>
          </div>

          {/* NLP Mode */}
          {mode === "nlp" && (
            <>
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="text-amber-500 text-sm font-mono shrink-0">$</span>
                <input
                  value={commandInput}
                  onChange={(e) => {
                    setCommandInput(e.target.value);
                    setParseError("");
                    setParsedRule(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleCommand()}
                  placeholder='Buy $50 of FLOW every week'
                  className="flex-1 bg-transparent border-none outline-none text-sm font-mono text-zinc-200 placeholder-zinc-600"
                />
                <button
                  onClick={handleCommand}
                  className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded text-amber-500 text-xs font-mono font-medium cursor-pointer hover:bg-amber-500/20 transition-colors duration-150 flex items-center gap-1.5 shrink-0"
                >
                  Parse <ChevronRight size={12} />
                </button>
              </div>

              <AnimatePresence>
                {parseError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-4 py-2.5 border-t border-zinc-800/60 text-xs font-mono text-red-400"
                  >
                    {parseError}
                  </motion.div>
                )}
                {parsedRule && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-4 py-3 border-t border-amber-500/10 bg-amber-500/[0.03] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">PARSED</span>
                      <span className="text-sm text-zinc-300 font-mono">{parsedRule.description}</span>
                      {parsedRule.ruleType && <RuleTypeBadge type={parsedRule.ruleType} />}
                    </div>
                    <button
                      onClick={createFromParsed}
                      className="px-4 py-1.5 bg-amber-500 text-zinc-950 rounded text-xs font-mono font-bold cursor-pointer hover:bg-amber-400 transition-colors duration-150"
                    >
                      CREATE
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {/* Manual Mode */}
          {mode === "manual" && (
            <div className="px-4 py-4">
              {/* Rule type selector */}
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

              {/* Form fields */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {/* Token */}
                <div>
                  <label className="block text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-1.5">Token</label>
                  <select
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    className="w-full bg-zinc-800/50 border border-zinc-800 rounded px-3 py-2 text-sm font-mono text-zinc-200 outline-none focus:border-amber-500/40 transition-colors duration-150 appearance-none cursor-pointer"
                  >
                    <option value="FLOW">FLOW</option>
                    <option value="USDC">USDC</option>
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-1.5">Amount ($)</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    className="w-full bg-zinc-800/50 border border-zinc-800 rounded px-3 py-2 text-sm font-mono text-zinc-200 outline-none focus:border-amber-500/40 transition-colors duration-150 placeholder-zinc-600"
                    placeholder="50"
                  />
                </div>

                {/* Interval or Price % */}
                {isPriceTrigger ? (
                  <div>
                    <label className="block text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-1.5">
                      {manualType === "PRICE_DIP_BUY" ? "Drop %" : "Rise %"}
                    </label>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={manualPricePct}
                      onChange={(e) => setManualPricePct(e.target.value)}
                      className="w-full bg-zinc-800/50 border border-zinc-800 rounded px-3 py-2 text-sm font-mono text-zinc-200 outline-none focus:border-amber-500/40 transition-colors duration-150 placeholder-zinc-600"
                      placeholder="5"
                    />
                  </div>
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

                {/* Create button */}
                <div className="flex items-end">
                  <button
                    onClick={createFromManual}
                    className="w-full px-4 py-2 bg-amber-500 text-zinc-950 rounded text-xs font-mono font-bold cursor-pointer hover:bg-amber-400 transition-colors duration-150"
                  >
                    CREATE
                  </button>
                </div>
              </div>
            </div>
          )}
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
          value={`$${vaultBalance.toFixed(2)}`}
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
          value={`$${totalInvested.toFixed(2)}`}
          sub="across strategies"
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
            <span className="text-xs font-mono text-zinc-500">DEPOSIT $</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="100.00"
              className="flex-1 bg-transparent border-none outline-none text-sm font-mono text-zinc-100 placeholder-zinc-600"
              autoFocus
            />
            {[50, 100, 250, 500].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setDepositAmount(q.toString())}
                className="px-2 py-1 text-[10px] font-mono text-zinc-500 border border-zinc-800 rounded cursor-pointer hover:text-amber-500 hover:border-amber-500/30 bg-transparent transition-colors duration-150"
              >
                ${q}
              </button>
            ))}
            <button
              type="submit"
              className="px-3 py-1.5 bg-amber-500 text-zinc-950 rounded text-xs font-mono font-bold cursor-pointer hover:bg-amber-400 transition-colors duration-150"
            >
              CONFIRM
            </button>
          </motion.form>
        )}
        {showWithdraw && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleWithdraw}
            className="mb-4 flex items-center gap-2 px-4 py-3 rounded-md border border-zinc-800 bg-zinc-900/50"
          >
            <span className="text-xs font-mono text-zinc-500">WITHDRAW $</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              max={vaultBalance}
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="50.00"
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
              className="px-3 py-1.5 bg-zinc-700 text-zinc-100 rounded text-xs font-mono font-bold cursor-pointer hover:bg-zinc-600 transition-colors duration-150"
            >
              CONFIRM
            </button>
          </motion.form>
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
                Use the command bar above to create your first strategy
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
                    onExecute={() => simulateExecution(rule.id)}
                    onCancel={() => cancelRule(rule.id)}
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
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
              Activity Log
            </span>
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
              vaultHistory.slice(0, 10).map((h, i) => (
                <div
                  key={h.id}
                  className={`flex items-center justify-between px-3 py-2.5
                    ${i < Math.min(vaultHistory.length, 10) - 1 ? "border-b border-zinc-800/30" : ""}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-1 h-1 rounded-full shrink-0 ${h.amount > 0 ? "bg-amber-500" : "bg-zinc-600"}`} />
                    <div className="min-w-0">
                      <div className="text-xs text-zinc-400 truncate">{h.description}</div>
                      <div className="text-[10px] font-mono text-zinc-700">
                        {mounted ? format(new Date(h.timestamp), "MM/dd HH:mm") : "--"}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-mono font-semibold shrink-0 ${
                      h.amount > 0 ? "text-amber-500" : "text-zinc-500"
                    }`}
                  >
                    {h.amount > 0 ? "+" : ""}${Math.abs(h.amount).toFixed(0)}
                  </span>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  highlight,
  actions,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  actions?: React.ReactNode;
}) {
  return (
    <div className={`rounded-lg px-4 py-4 border transition-colors duration-200
      ${highlight
        ? "border-amber-500/20 bg-amber-500/[0.03]"
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
      <div className={`text-xl font-mono font-bold tracking-tight
        ${highlight ? "text-amber-500" : "text-zinc-200"}`}
      >
        {value}
      </div>
      {sub && (
        <div className="text-[10px] font-mono text-zinc-700 mt-0.5">{sub}</div>
      )}
      {actions}
    </div>
  );
}

function StrategyRow({
  rule,
  mounted,
  isLast,
  onExecute,
  onCancel,
}: {
  rule: AutomationRule;
  mounted: boolean;
  isLast: boolean;
  onExecute: () => void;
  onCancel: () => void;
}) {
  const statusColor = rule.active
    ? "bg-amber-500"
    : rule.status === "paused"
    ? "bg-yellow-600"
    : "bg-zinc-600";

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3.5 group hover:bg-zinc-800/20 transition-colors duration-150
        ${!isLast ? "border-b border-zinc-800/40" : ""}
        ${!rule.active ? "opacity-35" : ""}`}
    >
      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusColor}`} />
      <RuleTypeBadge type={rule.ruleType} />
      <span className="text-sm font-mono text-zinc-300 flex-1 min-w-0 truncate">
        {rule.description}
      </span>
      <span className="text-xs font-mono text-zinc-500 shrink-0 tabular-nums">
        ${rule.amount}
      </span>
      <div className="w-px h-3 bg-zinc-800 shrink-0" />
      <span className="text-[10px] font-mono text-zinc-600 shrink-0 tabular-nums">
        {rule.executionCount}x run
      </span>
      {rule.nextExecution && rule.active && (
        <>
          <div className="w-px h-3 bg-zinc-800 shrink-0" />
          <span className="text-[10px] font-mono text-zinc-600 shrink-0 tabular-nums">
            {mounted
              ? formatDistanceToNow(new Date(rule.nextExecution), { addSuffix: false })
              : "---"}
          </span>
        </>
      )}
      {rule.active && (
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button
            onClick={onExecute}
            title="Execute now"
            className="p-1.5 rounded text-amber-500/50 hover:text-amber-500 hover:bg-amber-500/10 cursor-pointer bg-transparent border-0 transition-colors duration-150"
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
