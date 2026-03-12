"use client";

import Link from "next/link";
import { ArrowRight, Clock, Shield, Zap, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 },
  }),
};

const COMMANDS = [
  { text: "Buy $50 of FLOW every week", parsed: "DCA  ·  $50  ·  FLOW  ·  Weekly" },
  { text: "Save $20 USDC every Friday", parsed: "SAVE  ·  $20  ·  USDC  ·  Weekly" },
  { text: "Buy FLOW if price drops 5%", parsed: "DIP  ·  FLOW  ·  -5% trigger" },
];

const STEPS = [
  { num: "01", title: "Connect Wallet", desc: "Link your Flow wallet in one click. Supports Lilico and Flow Wallet." },
  { num: "02", title: "Type a Command", desc: "Describe your strategy in plain English. AutoFi understands what you mean." },
  { num: "03", title: "Chain Executes", desc: "Flow's scheduled transactions run your strategy on-chain. No bots needed." },
];

const FEATURES = [
  {
    icon: <Clock size={20} />,
    title: "Scheduled Transactions",
    desc: "Flow natively executes future transactions at specified times. No Chainlink, no Gelato, no cron jobs. The chain itself runs your DCA.",
    tag: "FLOW NATIVE",
  },
  {
    icon: <Shield size={20} />,
    title: "MEV Resistant",
    desc: "Flow's architecture prevents frontrunning and sandwich attacks. Your DCA swaps execute at fair prices, every time.",
    tag: "PROTECTION",
  },
  {
    icon: <Zap size={20} />,
    title: "Flow Actions",
    desc: "Composable DeFi primitives Source, Swap, Sink. Build atomic multi-step operations in a single transaction.",
    tag: "COMPOSABLE",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 overflow-hidden">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-zinc-800/40 bg-zinc-950/90 backdrop-blur-lg px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="font-mono font-bold text-base text-zinc-50 tracking-tight">
            AutoFi
          </span>
          <span className="text-[9px] font-mono font-medium text-amber-500 border border-amber-500/30 px-1.5 py-0.5 rounded uppercase tracking-wider">
            mainnet
          </span>
        </div>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-md text-amber-500 text-sm font-mono font-medium no-underline hover:bg-amber-500/20 transition-colors duration-150"
        >
          Launch App <ArrowRight size={14} />
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative pt-20 pb-16 px-6">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(245,158,11,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.3) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
        {/* Top glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="text-xs font-mono text-amber-500/80 uppercase tracking-[0.3em] mb-8"
          >
            Financial Automation on Flow
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-7xl font-bold text-zinc-50 tracking-tight leading-[1.05] mb-6"
          >
            Your DCA on
            <br />
            <span className="text-amber-500">Autopilot</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-zinc-400 leading-relaxed max-w-xl mx-auto mb-10"
          >
            Create strategies your way type in plain English or use the
            manual form. Flow&apos;s blockchain executes them automatically.
            No bots, no keepers, no manual intervention.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex gap-3 justify-center mb-16"
          >
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-7 py-3.5 bg-amber-500 text-zinc-950 rounded-md text-sm font-mono font-bold no-underline hover:bg-amber-400 transition-colors duration-150"
            >
              Launch App <ArrowRight size={15} />
            </Link>
          </motion.div>

          {/* Terminal Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="max-w-2xl mx-auto"
          >
            <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/80 backdrop-blur-sm shadow-2xl shadow-black/40">
              {/* Terminal bar */}
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-800/60 bg-zinc-900">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                </div>
                <span className="text-[10px] font-mono text-zinc-600 ml-2">autofi command</span>
              </div>

              {/* Terminal content */}
              <div className="p-4 space-y-3">
                {COMMANDS.map((cmd, i) => (
                  <motion.div
                    key={cmd.text}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + i * 0.2, duration: 0.4 }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-amber-500 text-xs font-mono">$</span>
                      <span className="text-sm font-mono text-zinc-300">{cmd.text}</span>
                    </div>
                    <div className="flex items-center gap-2 pl-4 mb-1">
                      <span className="text-[10px] font-mono text-zinc-600">{">"}</span>
                      <span className="text-xs font-mono text-amber-500/70">{cmd.parsed}</span>
                      <span className="text-[10px] font-mono text-zinc-700 ml-auto">OK</span>
                    </div>
                  </motion.div>
                ))}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.6 }}
                  className="flex items-center gap-2 pt-1"
                >
                  <span className="text-amber-500 text-xs font-mono">$</span>
                  <span className="cursor-blink text-sm font-mono text-zinc-500" />
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-24 relative">
        <div className="max-w-4xl mx-auto">
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            variants={fadeUp}
            className="text-xs font-mono text-zinc-600 uppercase tracking-[0.3em] mb-10 text-center"
          >
            How it works
          </motion.p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
                className="border border-zinc-800/60 rounded-lg px-6 py-6 hover:border-zinc-700 transition-colors duration-300 group"
              >
                <span className="text-3xl font-mono font-bold text-amber-500/20 block mb-3 group-hover:text-amber-500/40 transition-colors duration-300">
                  {step.num}
                </span>
                <h3 className="text-base font-semibold text-zinc-200 mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-zinc-500 leading-relaxed m-0">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-4xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
      </div>

      {/* Features */}
      <section className="px-6 py-24">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            variants={fadeUp}
            className="text-center mb-12"
          >
            <p className="text-xs font-mono text-zinc-600 uppercase tracking-[0.3em] mb-3">
              Built Different
            </p>
            <h2 className="text-3xl font-bold text-zinc-100 tracking-tight">
              Three Flow-exclusive features
            </h2>
          </motion.div>

          <div className="space-y-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
                className="flex items-start gap-5 border border-zinc-800/60 rounded-lg px-6 py-5 hover:border-zinc-700 transition-colors duration-300 group"
              >
                <div className="mt-0.5 p-2.5 rounded-md bg-amber-500/5 border border-amber-500/10 text-amber-500 group-hover:bg-amber-500/10 transition-colors duration-300 shrink-0">
                  {f.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1.5">
                    <h3 className="text-base font-semibold text-zinc-200 m-0">
                      {f.title}
                    </h3>
                    <span className="text-[9px] font-mono font-medium text-zinc-600 border border-zinc-800 px-1.5 py-0.5 rounded uppercase tracking-wider">
                      {f.tag}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-500 leading-relaxed m-0">
                    {f.desc}
                  </p>
                </div>
                <ChevronRight size={16} className="text-zinc-800 group-hover:text-zinc-600 transition-colors duration-300 mt-1 shrink-0" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            variants={fadeUp}
            className="flex items-center justify-between px-8 py-6 border border-zinc-800/60 rounded-lg"
          >
            {[
              { label: "Automation Types", value: "5" },
              { label: "Safety Guards", value: "3" },
              { label: "Chains Supported", value: "Flow" },
              { label: "Open Source", value: "Yes" },
            ].map((s, i) => (
              <div key={s.label} className="text-center flex-1">
                <div className="text-2xl font-mono font-bold text-amber-500 mb-1">{s.value}</div>
                <div className="text-[11px] font-mono text-zinc-600 uppercase tracking-wider">{s.label}</div>
                {i < 3 && <div className="hidden" />}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="text-center py-24 px-6 relative">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          custom={0}
          variants={fadeUp}
          className="relative"
        >
          <h2 className="text-4xl font-bold text-zinc-50 tracking-tight mb-4">
            Start automating today
          </h2>
          <p className="text-base text-zinc-500 mb-10 max-w-md mx-auto">
            Connect your Flow wallet and create your first strategy in under a minute.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-4 bg-amber-500 text-zinc-950 rounded-md text-sm font-mono font-bold no-underline hover:bg-amber-400 transition-colors duration-150"
          >
            Get Started <ArrowRight size={15} />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/40 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-mono font-bold text-sm text-zinc-50">AutoFi</span>
          <span className="text-xs text-zinc-700">·</span>
          <span className="text-xs font-mono text-zinc-600">Built on Flow Blockchain</span>
        </div>
        <span className="text-xs font-mono text-zinc-700">
          PL Genesis Hackathon 2026
        </span>
      </footer>
    </div>
  );
}
