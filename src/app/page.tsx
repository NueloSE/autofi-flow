"use client";

import Link from "next/link";
import { ArrowRight, Zap, Shield, Brain, TrendingUp, RefreshCw, CreditCard, PiggyBank, Activity } from "lucide-react";

const FEATURES = [
  {
    icon: "📈",
    title: "DCA Investing",
    description: "Automatically invest on a schedule. Build wealth steadily without timing the market.",
    color: "#6366f1",
  },
  {
    icon: "💳",
    title: "Subscriptions",
    description: "Automate recurring payments to any wallet or service. Set it and forget it.",
    color: "#06b6d4",
  },
  {
    icon: "🏦",
    title: "Savings Automation",
    description: "Move funds to your savings vault automatically at regular intervals.",
    color: "#10b981",
  },
  {
    icon: "📉",
    title: "Buy the Dip",
    description: "Automatically buy tokens when prices drop to your target. Never miss a dip.",
    color: "#f59e0b",
  },
  {
    icon: "💰",
    title: "Take Profit",
    description: "Automatically sell when prices rise to lock in gains. Emotion-free trading.",
    color: "#a78bfa",
  },
  {
    icon: "🔔",
    title: "Email Alerts",
    description: "Get notified before automations execute. Cancel any time from the email link.",
    color: "#ec4899",
  },
];

const DIFFERENTIATORS = [
  {
    icon: <Brain size={24} />,
    title: "Natural Language Rules",
    description: 'Just type "Buy $50 of FLOW every Monday" and AutoFi converts it into an automation instantly.',
    color: "#6366f1",
  },
  {
    icon: <Activity size={24} />,
    title: "Strategy Simulation",
    description: "Preview projected returns before creating any rule. Make informed decisions.",
    color: "#06b6d4",
  },
  {
    icon: <Shield size={24} />,
    title: "Safety Guards",
    description: "Monthly spend caps, slippage protection, and an emergency stop—all built in.",
    color: "#10b981",
  },
];

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* Nav */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          borderBottom: "1px solid var(--border-subtle)",
          background: "rgba(5, 10, 24, 0.8)",
          backdropFilter: "blur(20px)",
          padding: "0 32px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "var(--gradient-brand)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
            }}
          >
            ⚡
          </div>
          <span style={{ fontWeight: 800, fontSize: 18, color: "var(--text-primary)", letterSpacing: "-0.3px" }}>
            AutoFi
          </span>
          <span
            style={{
              fontSize: 10,
              background: "rgba(99,102,241,0.15)",
              color: "var(--accent-primary)",
              border: "1px solid rgba(99,102,241,0.3)",
              padding: "2px 8px",
              borderRadius: 100,
              fontWeight: 600,
              letterSpacing: "0.5px",
              textTransform: "uppercase",
            }}
          >
            Flow Testnet
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/dashboard" className="btn-primary">
            Launch App <ArrowRight size={15} />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section
        style={{
          textAlign: "center",
          padding: "100px 24px 80px",
          maxWidth: 800,
          margin: "0 auto",
          position: "relative",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 600,
            height: 400,
            background: "radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(99,102,241,0.1)",
            border: "1px solid rgba(99,102,241,0.3)",
            borderRadius: 100,
            padding: "6px 16px",
            marginBottom: 24,
            fontSize: 13,
            color: "var(--text-accent)",
          }}
        >
          <Zap size={14} />
          Consumer DeFi · Powered by Flow
        </div>

        <h1
          style={{
            fontSize: "clamp(40px, 6vw, 72px)",
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: "-2px",
            margin: "0 0 20px",
            color: "var(--text-primary)",
          }}
        >
          Your Finance on{" "}
          <span className="gradient-text">Autopilot</span>
        </h1>

        <p
          style={{
            fontSize: "clamp(16px, 2vw, 20px)",
            color: "var(--text-secondary)",
            lineHeight: 1.6,
            maxWidth: 560,
            margin: "0 auto 40px",
          }}
        >
          Automate investing, subscriptions, savings, and trading strategies on the Flow blockchain. 
          No jargon. No manual steps. Just intelligent financial automation that works for you 24/7.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/dashboard" className="btn-primary" style={{ padding: "14px 28px", fontSize: 16 }}>
            Launch App <ArrowRight size={16} />
          </Link>
          <Link href="/simulation" className="btn-secondary" style={{ padding: "14px 28px", fontSize: 16 }}>
            <Activity size={16} />
            Try Simulator
          </Link>
        </div>

        {/* Hero stats */}
        <div
          style={{
            display: "flex",
            gap: 32,
            justifyContent: "center",
            marginTop: 60,
            flexWrap: "wrap",
          }}
        >
          {[
            { label: "Automation Types", value: "5" },
            { label: "Safety Guards", value: "3" },
            { label: "Built on Flow", value: "✓" },
            { label: "Gas Abstracted", value: "✓" },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.5px",
                }}
              >
                {s.value}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section style={{ padding: "0 24px 80px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2
            style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.5px", margin: "0 0 12px", color: "var(--text-primary)" }}
          >
            Everything You Need to Automate
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 16 }}>
            Five powerful automation types covering all your financial needs
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 16,
          }}
        >
          {FEATURES.map((feature, i) => (
            <div
              key={feature.title}
              className="card"
              style={{
                padding: 24,
                animationDelay: `${i * 60}ms`,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: `${feature.color}18`,
                  border: `1px solid ${feature.color}30`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  marginBottom: 16,
                }}
              >
                {feature.icon}
              </div>
              <h3
                style={{
                  margin: "0 0 8px",
                  fontSize: 17,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                {feature.title}
              </h3>
              <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Differentiators */}
      <section
        style={{
          padding: "80px 24px",
          background: "var(--bg-secondary)",
          borderTop: "1px solid var(--border-subtle)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2
              style={{
                fontSize: 36,
                fontWeight: 800,
                letterSpacing: "-0.5px",
                margin: "0 0 12px",
                color: "var(--text-primary)",
              }}
            >
              What Makes AutoFi Different
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 24,
            }}
          >
            {DIFFERENTIATORS.map((item) => (
              <div
                key={item.title}
                className="card"
                style={{ padding: 28, textAlign: "center" }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    background: `${item.color}15`,
                    border: `1px solid ${item.color}30`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 20px",
                    color: item.color,
                  }}
                >
                  {item.icon}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 10px", color: "var(--text-primary)" }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "100px 24px", textAlign: "center" }}>
        <h2
          style={{
            fontSize: "clamp(32px, 5vw, 56px)",
            fontWeight: 900,
            letterSpacing: "-1px",
            margin: "0 0 16px",
            color: "var(--text-primary)",
          }}
        >
          Start automating your{" "}
          <span className="gradient-text">financial future</span>
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: 17, marginBottom: 36 }}>
          Connect your Flow wallet and create your first automation in minutes.
        </p>
        <Link href="/dashboard" className="btn-primary" style={{ padding: "16px 36px", fontSize: 17 }}>
          Get Started Free <ArrowRight size={18} />
        </Link>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--border-subtle)",
          padding: "24px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>⚡</span>
          <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>AutoFi</span>
          <span style={{ color: "var(--text-muted)", fontSize: 13 }}>· Built on Flow Blockchain</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Flow Consumer DeFi Hackathon 2025
        </div>
      </footer>
    </div>
  );
}
