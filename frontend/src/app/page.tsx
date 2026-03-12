"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Clock, Shield, Zap, Activity, Radio } from "lucide-react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";

// ─── Live execution feed simulation ───
const FEED_EVENTS = [
  { id: 1, user: "0x8f2a..c91d", action: "DCA executed", amount: "+50 USDC", token: "FLOW", status: "confirmed", time: "2s ago" },
  { id: 2, user: "0x3b7e..a4f2", action: "Strategy created", amount: "$100/wk", token: "FLOW", status: "scheduled", time: "5s ago" },
  { id: 3, user: "0xd1c9..7e3a", action: "DCA executed", amount: "+25 USDC", token: "FLOW", status: "confirmed", time: "12s ago" },
  { id: 4, user: "0x5f8b..2d1c", action: "Auto-save", amount: "20 FLOW", token: "vault", status: "confirmed", time: "18s ago" },
  { id: 5, user: "0xa2e4..8f7b", action: "DCA executed", amount: "+200 USDC", token: "FLOW", status: "confirmed", time: "24s ago" },
  { id: 6, user: "0x7c3d..e5a9", action: "Strategy created", amount: "$75/day", token: "USDC", status: "scheduled", time: "31s ago" },
  { id: 7, user: "0x1e9f..b3c8", action: "DCA executed", amount: "+150 USDC", token: "FLOW", status: "confirmed", time: "38s ago" },
  { id: 8, user: "0x4d6a..f2e1", action: "Funds deposited", amount: "500 FLOW", token: "vault", status: "confirmed", time: "45s ago" },
  { id: 9, user: "0x9b1c..d7a3", action: "DCA executed", amount: "+80 USDC", token: "FLOW", status: "confirmed", time: "52s ago" },
  { id: 10, user: "0x6e8f..c4b2", action: "Strategy paused", amount: "—", token: "FLOW", status: "paused", time: "1m ago" },
];

function useCyclingFeed() {
  const [items, setItems] = useState(FEED_EVENTS.slice(0, 5));
  const indexRef = useRef(5);

  useEffect(() => {
    const interval = setInterval(() => {
      const nextItem = {
        ...FEED_EVENTS[indexRef.current % FEED_EVENTS.length],
        id: Date.now(),
        time: "just now",
      };
      setItems((prev) => [nextItem, ...prev.slice(0, 4)]);
      indexRef.current++;
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return items;
}

// ─── Ticker tape component ───
const TICKER_ITEMS = [
  "FLOW/USDC", "DCA ACTIVE", "NEXT EXEC: 2m 14s", "FLOW/USDC",
  "MEV PROTECTED", "ON-CHAIN", "NO BOTS", "FLOW/USDC",
  "SCHEDULED TX", "SELF-RECURRING", "FLOW/USDC", "ZERO KEEPERS",
];

function Ticker() {
  return (
    <div className="overflow-hidden border-y border-amber-500/10 bg-amber-500/[0.02] py-2.5">
      <motion.div
        className="flex gap-8 whitespace-nowrap"
        animate={{ x: [0, -1200] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      >
        {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
          <span key={i} className="text-[10px] font-mono text-amber-500/40 uppercase tracking-[0.25em] flex items-center gap-3">
            <span className="w-1 h-1 rounded-full bg-amber-500/30" />
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

// ─── Animated counter ───
function Counter({ target, suffix = "" }: { target: string; suffix?: string }) {
  const [display, setDisplay] = useState("0");
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;
    const num = parseInt(target.replace(/[^0-9]/g, ""));
    if (isNaN(num)) { setDisplay(target); return; }
    const duration = 1500;
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.floor(num * eased).toLocaleString());
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target]);

  return <span ref={ref}>{display}{suffix}</span>;
}

// ─── Orbit ring SVG ───
function OrbitRing({ size, duration, opacity, delay = 0 }: { size: number; duration: number; opacity: number; delay?: number }) {
  return (
    <motion.div
      className="absolute rounded-full border border-amber-500"
      style={{
        width: size,
        height: size,
        opacity,
        left: "50%",
        top: "50%",
        marginLeft: -size / 2,
        marginTop: -size / 2,
      }}
      animate={{ rotate: 360 }}
      transition={{ duration, repeat: Infinity, ease: "linear", delay }}
    >
      <div
        className="absolute w-2 h-2 rounded-full bg-amber-500"
        style={{ top: -4, left: "50%", marginLeft: -4, boxShadow: "0 0 12px rgba(245,158,11,0.6)" }}
      />
    </motion.div>
  );
}

export default function LandingPage() {
  const feedItems = useCyclingFeed();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.95]);

  return (
    <div ref={containerRef} className="min-h-screen bg-zinc-950 landing-grain landing-scanline">
      {/* ══════ Nav ══════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800/30 bg-zinc-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-base text-zinc-50 tracking-tight">
              AutoFi
            </span>
            <span className="text-[9px] font-mono font-medium text-amber-500 border border-amber-500/30 px-1.5 py-0.5 rounded uppercase tracking-wider">
              mainnet
            </span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#how" className="text-xs font-mono text-zinc-600 hover:text-zinc-400 no-underline transition-colors hidden sm:block">
              How it works
            </a>
            <a href="#tech" className="text-xs font-mono text-zinc-600 hover:text-zinc-400 no-underline transition-colors hidden sm:block">
              Technology
            </a>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-zinc-950 rounded text-xs font-mono font-bold no-underline hover:bg-amber-400 transition-colors duration-150"
            >
              Launch App <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ══════ Hero: Full viewport cinematic ══════ */}
      <motion.section
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative min-h-screen flex flex-col justify-center pt-14 overflow-hidden"
      >
        {/* Ambient glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-amber-500/[0.04] rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-amber-500/[0.02] rounded-full blur-[120px] pointer-events-none" />

        {/* Orbit animation behind text */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2" style={{ transform: "translate(-50%, -55%)" }}>
            <OrbitRing size={500} duration={20} opacity={0.06} />
            <OrbitRing size={700} duration={35} opacity={0.04} delay={5} />
            <OrbitRing size={900} duration={50} opacity={0.02} delay={10} />
          </div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto w-full px-6 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-12 items-center">
          {/* Left: Hero copy */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="flex items-center gap-3 mb-8"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-[0.2em]">
                Live on Flow Mainnet
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="mb-6"
            >
              <span className="block text-6xl sm:text-7xl lg:text-8xl font-bold text-zinc-50 tracking-tight leading-[0.95]">
                Your DCA
              </span>
              <span
                className="block text-6xl sm:text-7xl lg:text-8xl tracking-tight leading-[0.95] text-amber-500"
                style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}
              >
                on Autopilot
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-base sm:text-lg text-zinc-500 leading-relaxed max-w-lg mb-10"
            >
              Set your strategy. The blockchain executes it.
              <br />
              <span className="text-zinc-400">No bots. No keepers. No cron jobs.</span>
              <br />
              Flow&apos;s native Scheduled Transactions do the work.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.35 }}
              className="flex flex-wrap items-center gap-4"
            >
              <Link
                href="/dashboard"
                className="group flex items-center gap-3 px-8 py-4 bg-amber-500 text-zinc-950 rounded-lg text-sm font-mono font-bold no-underline hover:bg-amber-400 transition-all duration-200 hover:shadow-[0_0_40px_rgba(245,158,11,0.2)]"
              >
                Launch App
                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform duration-200" />
              </Link>
              <a
                href="#how"
                className="flex items-center gap-2 px-6 py-4 border border-zinc-800 rounded-lg text-sm font-mono text-zinc-400 no-underline hover:border-zinc-600 hover:text-zinc-300 transition-colors duration-200"
              >
                See how it works
              </a>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="flex items-center gap-6 mt-12 pt-8 border-t border-zinc-800/40"
            >
              {[
                { label: "Execution Fee", value: "~0.001 FLOW" },
                { label: "MEV Attacks", value: "Impossible" },
                { label: "Uptime", value: "Chain-level" },
              ].map((badge) => (
                <div key={badge.label} className="flex flex-col">
                  <span className="text-[10px] font-mono text-zinc-700 uppercase tracking-wider">{badge.label}</span>
                  <span className="text-sm font-mono text-zinc-300 font-medium">{badge.value}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: Live feed terminal */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="hidden lg:block"
          >
            <div className="relative">
              {/* Glow behind card */}
              <div className="absolute -inset-4 bg-amber-500/[0.03] rounded-2xl blur-xl" />

              <div className="relative border border-zinc-800/80 rounded-xl overflow-hidden bg-zinc-900/90 backdrop-blur-sm shadow-2xl shadow-black/50">
                {/* Terminal header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60 bg-zinc-950/50">
                  <div className="flex items-center gap-2">
                    <Radio size={11} className="text-green-500" />
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Live Executions</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-zinc-700" />
                    <div className="w-2 h-2 rounded-full bg-zinc-700" />
                    <div className="w-2 h-2 rounded-full bg-amber-500/50" />
                  </div>
                </div>

                {/* Feed */}
                <div className="divide-y divide-zinc-800/30">
                  <AnimatePresence mode="popLayout">
                    {feedItems.map((item) => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-center justify-between px-4 py-3 hover:bg-zinc-800/10 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            item.status === "confirmed" ? "bg-green-500" :
                            item.status === "scheduled" ? "bg-amber-500" :
                            "bg-zinc-600"
                          }`} />
                          <div className="min-w-0">
                            <div className="text-[11px] font-mono text-zinc-300 truncate">{item.action}</div>
                            <div className="text-[9px] font-mono text-zinc-700">{item.user}</div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <div className={`text-[11px] font-mono font-medium ${
                            item.status === "confirmed" ? "text-green-500" :
                            item.status === "scheduled" ? "text-amber-500" :
                            "text-zinc-600"
                          }`}>{item.amount}</div>
                          <div className="text-[9px] font-mono text-zinc-700">{item.time}</div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="px-4 py-2.5 border-t border-zinc-800/40 bg-zinc-950/30 flex items-center justify-between">
                  <span className="text-[9px] font-mono text-zinc-700">Flow Mainnet</span>
                  <span className="text-[9px] font-mono text-zinc-700 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                    streaming
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-[9px] font-mono text-zinc-700 uppercase tracking-[0.3em]">Scroll</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-px h-6 bg-gradient-to-b from-zinc-700 to-transparent"
          />
        </motion.div>
      </motion.section>

      {/* ══════ Ticker ══════ */}
      <Ticker />

      {/* ══════ How It Works ══════ */}
      <section id="how" className="relative py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex items-end justify-between mb-16"
          >
            <div>
              <span className="text-[10px] font-mono text-amber-500/60 uppercase tracking-[0.3em] block mb-3">
                Process
              </span>
              <h2 className="text-4xl sm:text-5xl font-bold text-zinc-100 tracking-tight leading-[1.1]">
                Three steps.
                <br />
                <span className="text-zinc-600">Then autopilot.</span>
              </h2>
            </div>
            <span className="text-[10px] font-mono text-zinc-800 uppercase tracking-wider hidden sm:block">
              00 — 03
            </span>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
            {[
              {
                num: "01",
                title: "Connect",
                desc: "Link your Flow wallet. One click. Supports Lilico and Flow Wallet.",
                visual: (
                  <div className="flex items-center gap-2 mt-6">
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-amber-500/40" />
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-amber-500/30 to-transparent" />
                    <span className="text-[9px] font-mono text-green-500">CONNECTED</span>
                  </div>
                ),
              },
              {
                num: "02",
                title: "Command",
                desc: "Type in plain English or use the manual form. AutoFi parses your intent.",
                visual: (
                  <div className="mt-6 bg-zinc-950/80 border border-zinc-800/60 rounded px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-500 text-[11px] font-mono">$</span>
                      <span className="text-[11px] font-mono text-zinc-400">Buy $50 of FLOW weekly</span>
                    </div>
                  </div>
                ),
              },
              {
                num: "03",
                title: "Autopilot",
                desc: "Flow's chain schedules and executes your strategy. It even re-schedules the next one.",
                visual: (
                  <div className="mt-6 flex items-center gap-2">
                    {["Exec #1", "Exec #2", "Exec #3"].map((label, i) => (
                      <motion.div
                        key={label}
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5 + i * 0.15 }}
                        className="flex-1 text-center py-1.5 rounded bg-green-500/10 border border-green-500/20"
                      >
                        <span className="text-[9px] font-mono text-green-500">{label}</span>
                      </motion.div>
                    ))}
                    <span className="text-zinc-700 text-xs font-mono">...</span>
                  </div>
                ),
              },
            ].map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                className={`relative p-8 ${
                  i < 2 ? "md:border-r border-zinc-800/40" : ""
                }`}
              >
                <span className="text-6xl font-mono font-bold text-zinc-900 block mb-4 select-none">
                  {step.num}
                </span>
                <h3 className="text-xl font-bold text-zinc-200 mb-2">{step.title}</h3>
                <p className="text-sm text-zinc-600 leading-relaxed m-0">{step.desc}</p>
                {step.visual}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ Divider ══════ */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-zinc-800/60 to-transparent" />
      </div>

      {/* ══════ Technology Section ══════ */}
      <section id="tech" className="relative py-32 px-6 overflow-hidden">
        {/* Side glow */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[300px] h-[500px] bg-amber-500/[0.02] rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-16"
          >
            <span className="text-[10px] font-mono text-amber-500/60 uppercase tracking-[0.3em] block mb-3">
              Technology
            </span>
            <h2 className="text-4xl sm:text-5xl font-bold text-zinc-100 tracking-tight leading-[1.1] max-w-2xl">
              Built on three Flow-exclusive
              <br />
              <span
                className="text-amber-500"
                style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}
              >
                primitives
              </span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon: <Clock size={20} />,
                tag: "01",
                title: "Scheduled Transactions",
                desc: "Flow natively executes future transactions at specified times. The chain itself runs your DCA — no Chainlink Automation, no Gelato, no off-chain cron jobs.",
                highlight: true,
              },
              {
                icon: <Shield size={20} />,
                tag: "02",
                title: "MEV Resistance",
                desc: "Flow's architecture prevents frontrunning and sandwich attacks. Your swaps execute at fair market prices, every single time.",
                highlight: false,
              },
              {
                icon: <Zap size={20} />,
                tag: "03",
                title: "Flow Actions",
                desc: "Composable DeFi primitives — Source, Swapper, Sink. Build atomic multi-step operations in a single transaction.",
                highlight: false,
              },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.5 }}
                className={`group relative rounded-xl p-8 transition-all duration-300 border ${
                  f.highlight
                    ? "border-amber-500/20 bg-amber-500/[0.03] hover:border-amber-500/30"
                    : "border-zinc-800/50 bg-zinc-900/30 hover:border-zinc-700/60"
                }`}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className={`p-3 rounded-lg transition-colors duration-300 ${
                    f.highlight
                      ? "bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/15"
                      : "bg-zinc-800/50 text-zinc-500 group-hover:text-zinc-400"
                  }`}>
                    {f.icon}
                  </div>
                  <span className="text-[10px] font-mono text-zinc-800 uppercase tracking-wider">
                    {f.tag}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-zinc-200 mb-3">{f.title}</h3>
                <p className="text-sm text-zinc-600 leading-relaxed m-0">{f.desc}</p>

                {f.highlight && (
                  <div className="absolute -top-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ Stats ══════ */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-px bg-zinc-800/30 border border-zinc-800/40 rounded-xl overflow-hidden"
          >
            {[
              { value: "5", label: "Strategy Types", suffix: "" },
              { value: "3", label: "Safety Guards", suffix: "" },
              { value: "0", label: "External Deps", suffix: "" },
              { value: "100", label: "On-Chain", suffix: "%" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="bg-zinc-950 px-6 py-8 text-center"
              >
                <div className="text-3xl font-mono font-bold text-amber-500 mb-2">
                  <Counter target={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.2em]">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════ CTA ══════ */}
      <section className="relative py-32 px-6 overflow-hidden">
        {/* Dramatic glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[400px] bg-amber-500/[0.04] rounded-full blur-[150px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative max-w-3xl mx-auto text-center"
        >
          <span className="text-[10px] font-mono text-amber-500/50 uppercase tracking-[0.3em] block mb-6">
            Ready?
          </span>
          <h2 className="text-5xl sm:text-6xl font-bold text-zinc-50 tracking-tight mb-6 leading-[1.05]">
            Stop timing the market.
            <br />
            <span
              className="text-amber-500"
              style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}
            >
              Automate it.
            </span>
          </h2>
          <p className="text-base text-zinc-600 mb-10 max-w-md mx-auto leading-relaxed">
            Connect your Flow wallet and create your first automated strategy in under a minute.
          </p>
          <Link
            href="/dashboard"
            className="group inline-flex items-center gap-3 px-10 py-5 bg-amber-500 text-zinc-950 rounded-lg text-sm font-mono font-bold no-underline hover:bg-amber-400 transition-all duration-200 hover:shadow-[0_0_60px_rgba(245,158,11,0.25)]"
          >
            Launch App
            <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
          </Link>
        </motion.div>
      </section>

      {/* ══════ Footer ══════ */}
      <footer className="border-t border-zinc-800/30 px-6">
        <div className="max-w-6xl mx-auto py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-mono font-bold text-sm text-zinc-50">AutoFi</span>
            <div className="w-px h-3 bg-zinc-800" />
            <span className="text-[11px] font-mono text-zinc-700">Built on Flow</span>
          </div>
          <span className="text-[11px] font-mono text-zinc-800">
            PL Genesis: Frontiers of Collaboration 2026
          </span>
        </div>
      </footer>
    </div>
  );
}
