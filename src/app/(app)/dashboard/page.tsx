"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAutoFiStore } from "@/store/useAutoFiStore";
import { RuleTypeBadge } from "@/components/RuleTypeBadge";
import {
  PlusCircle,
  TrendingUp,
  Clock,
  DollarSign,
  Activity,
  Play,
  X,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

/** Prevents hydration mismatches for dynamic date strings */
function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export default function DashboardPage() {
  const mounted = useMounted();
  const { vaultBalance, rules, vaultHistory, simulateExecution, cancelRule, allPaused } =
    useAutoFiStore();

  const activeRules = rules.filter((r) => r.active);
  const totalInvested = rules.reduce((s, r) => s + r.totalSpent, 0);
  const upcomingRules = activeRules
    .filter((r) => r.triggerType === "TIME" && r.nextExecution)
    .sort((a, b) => new Date(a.nextExecution!).getTime() - new Date(b.nextExecution!).getTime())
    .slice(0, 3);

  return (
    <div style={{ padding: "32px" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Your financial automation at a glance</p>
      </div>

      {/* Emergency stop banner */}
      {allPaused && (
        <div
          style={{
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.4)",
            borderRadius: 12,
            padding: "14px 20px",
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            gap: 12,
            color: "var(--accent-danger)",
            fontSize: 14,
          }}
        >
          🔴 <strong>Emergency Stop Active</strong> — All automations are paused. Click "Resume All
          Rules" in the sidebar to re-enable.
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <StatCard
          icon={<DollarSign size={20} />}
          label="Vault Balance"
          value={`$${vaultBalance.toFixed(2)}`}
          color="#10b981"
          sub="Available for automation"
        />
        <StatCard
          icon={<Activity size={20} />}
          label="Active Rules"
          value={activeRules.length.toString()}
          color="#6366f1"
          sub={`of ${rules.length} total rules`}
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          label="Total Automated"
          value={`$${totalInvested.toFixed(2)}`}
          color="#a78bfa"
          sub="Across all strategies"
        />
        <StatCard
          icon={<Clock size={20} />}
          label="Executions"
          value={rules.reduce((s, r) => s + r.executionCount, 0).toString()}
          color="#06b6d4"
          sub="Total rule executions"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
        {/* Active Rules */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
              Active Rules
            </h2>
            <Link href="/rules/create" className="btn-primary" style={{ fontSize: 13, padding: "8px 14px" }}>
              <PlusCircle size={14} />
              New Rule
            </Link>
          </div>

          {rules.length === 0 ? (
            <EmptyState />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {rules.map((rule) => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  mounted={mounted}
                  onExecute={() => simulateExecution(rule.id)}
                  onCancel={() => cancelRule(rule.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Upcoming */}
          <div className="card" style={{ padding: 20 }}>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "var(--text-primary)",
                margin: "0 0 16px",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Clock size={15} color="var(--accent-primary)" />
              Upcoming Executions
            </h3>
            {upcomingRules.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
                No upcoming time-based rules.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {upcomingRules.map((rule) => (
                  <div
                    key={rule.id}
                    style={{
                      background: "var(--bg-elevated)",
                      borderRadius: 10,
                      padding: "12px",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "var(--accent-success)",
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                        {rule.description}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                        {mounted ? formatDistanceToNow(new Date(rule.nextExecution!), { addSuffix: true }) : "—"}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--accent-success)",
                      }}
                    >
                      ${rule.amount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="card" style={{ padding: 20 }}>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "var(--text-primary)",
                margin: "0 0 16px",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Activity size={15} color="var(--accent-primary)" />
              Recent Activity
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {vaultHistory.slice(0, 6).map((h) => (
                <div
                  key={h.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: "1px solid var(--border-subtle)",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>
                      {h.description}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                      {mounted ? format(new Date(h.timestamp), "MMM d, HH:mm") : "—"}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: h.amount > 0 ? "var(--accent-success)" : "var(--text-secondary)",
                    }}
                  >
                    {h.amount > 0 ? "+" : ""}${Math.abs(h.amount).toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  sub: string;
}) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {label}
        </span>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: `${color}15`,
            border: `1px solid ${color}30`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color,
          }}
        >
          {icon}
        </div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color, letterSpacing: "-0.5px" }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function RuleCard({
  rule,
  mounted,
  onExecute,
  onCancel,
}: {
  rule: import("@/store/useAutoFiStore").AutomationRule;
  mounted: boolean;
  onExecute: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="card"
      style={{
        padding: 20,
        opacity: rule.active ? 1 : 0.5,
        transition: "opacity 0.2s",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
            <RuleTypeBadge type={rule.ruleType} />
            <span
              className={`badge ${rule.active ? "badge-active" : rule.status === "paused" ? "badge-paused" : "badge-cancelled"}`}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "currentColor",
                  display: "inline-block",
                }}
              />
              {rule.status}
            </span>
            {rule.notifyBeforeExecution && (
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>🔔 email alert</span>
            )}
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
            {rule.description}
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Amount: <strong style={{ color: "var(--text-secondary)" }}>${rule.amount}</strong>
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Spent: <strong style={{ color: "var(--text-secondary)" }}>${rule.totalSpent}</strong>
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Runs: <strong style={{ color: "var(--text-secondary)" }}>{rule.executionCount}</strong>
            </span>
            {rule.nextExecution && rule.active && mounted && (
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Next:{" "}
                <strong style={{ color: "var(--accent-primary)" }}>
                  {formatDistanceToNow(new Date(rule.nextExecution), { addSuffix: true })}
                </strong>
              </span>
            )}
          </div>

          {/* Monthly spend bar */}
          {rule.maxMonthlySpend > 0 && (
            <div style={{ marginTop: 10 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 10,
                  color: "var(--text-muted)",
                  marginBottom: 4,
                }}
              >
                <span>Monthly cap</span>
                <span>
                  ${rule.monthlySpent} / ${rule.maxMonthlySpend}
                </span>
              </div>
              <div
                style={{
                  height: 4,
                  borderRadius: 2,
                  background: "var(--bg-elevated)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(100, (rule.monthlySpent / rule.maxMonthlySpend) * 100)}%`,
                    background:
                      rule.monthlySpent / rule.maxMonthlySpend > 0.8
                        ? "var(--accent-danger)"
                        : "var(--accent-primary)",
                    borderRadius: 2,
                    transition: "width 0.3s",
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {rule.active && (
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button
              onClick={onExecute}
              title="Simulate execution"
              style={{
                background: "rgba(16,185,129,0.1)",
                border: "1px solid rgba(16,185,129,0.3)",
                borderRadius: 8,
                padding: "6px 10px",
                cursor: "pointer",
                color: "var(--accent-success)",
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <Play size={12} />
              Run
            </button>
            <button
              onClick={onCancel}
              title="Cancel rule"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 8,
                padding: "6px 8px",
                cursor: "pointer",
                color: "var(--accent-danger)",
                display: "flex",
                alignItems: "center",
              }}
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="card"
      style={{
        padding: 48,
        textAlign: "center",
        border: "1px dashed var(--border-glow)",
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
      <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px", color: "var(--text-primary)" }}>
        No rules yet
      </h3>
      <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 20 }}>
        Create your first automation rule to put your finances on autopilot.
      </p>
      <Link href="/rules/create" className="btn-primary">
        <PlusCircle size={16} />
        Create Your First Rule
      </Link>
    </div>
  );
}
