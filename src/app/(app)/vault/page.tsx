"use client";

import { useState, useEffect } from "react";
import { useAutoFiStore } from "@/store/useAutoFiStore";
import { ArrowDownToLine, ArrowUpFromLine, DollarSign, Clock } from "lucide-react";
import { format } from "date-fns";

export default function VaultPage() {
  const { vaultBalance, deposit, withdraw, vaultHistory } = useAutoFiStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [tab, setTab] = useState<"deposit" | "withdraw">("deposit");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(depositAmount);
    if (!amt || amt <= 0) return;
    setLoading(true);
    // Simulate FCL transaction delay
    await new Promise((r) => setTimeout(r, 800));
    deposit(amt);
    setSuccess(`Deposited $${amt.toFixed(2)} to your vault`);
    setDepositAmount("");
    setLoading(false);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt <= 0) return;
    if (amt > vaultBalance) {
      alert("Insufficient vault balance");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    withdraw(amt);
    setSuccess(`Withdrew $${amt.toFixed(2)} from your vault`);
    setWithdrawAmount("");
    setLoading(false);
    setTimeout(() => setSuccess(null), 3000);
  };

  return (
    <div style={{ padding: "32px", maxWidth: 800, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Vault</h1>
        <p className="page-subtitle">Deposit and manage funds used for your automations</p>
      </div>

      {/* Balance Card */}
      <div
        className="card"
        style={{
          padding: 28,
          marginBottom: 24,
          background: "linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 100%)",
          border: "1px solid rgba(99,102,241,0.25)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>
          Available Vault Balance
        </div>
        <div
          style={{ fontSize: 52, fontWeight: 900, color: "var(--text-primary)", letterSpacing: "-2px", lineHeight: 1 }}
        >
          ${vaultBalance.toFixed(2)}
        </div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8 }}>
          USDC · AutoFi Vault · Flow Testnet
        </div>
      </div>

      {/* Deposit / Withdraw */}
      {success && (
        <div
          style={{
            background: "rgba(16,185,129,0.1)",
            border: "1px solid rgba(16,185,129,0.3)",
            borderRadius: 10,
            padding: "12px 16px",
            marginBottom: 16,
            color: "var(--accent-success)",
            fontSize: 14,
          }}
        >
          ✓ {success}
        </div>
      )}

      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        {/* Tab */}
        <div
          style={{
            display: "flex",
            background: "var(--bg-elevated)",
            borderRadius: 8,
            padding: 3,
            marginBottom: 20,
            width: "fit-content",
          }}
        >
          {(["deposit", "withdraw"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: tab === t ? "var(--accent-primary)" : "transparent",
                color: tab === t ? "white" : "var(--text-secondary)",
                border: "none",
                borderRadius: 6,
                padding: "7px 16px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.15s",
              }}
            >
              {t === "deposit" ? <ArrowDownToLine size={13} /> : <ArrowUpFromLine size={13} />}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === "deposit" ? (
          <form onSubmit={handleDeposit}>
            <label className="form-label">Amount to Deposit (USDC)</label>
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <input
                className="input-field"
                type="number"
                min="0.01"
                step="0.01"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="100.00"
                required
              />
              <button type="submit" className="btn-primary" disabled={loading} style={{ flexShrink: 0 }}>
                {loading ? "Processing…" : <><ArrowDownToLine size={14} /> Deposit</>}
              </button>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[50, 100, 250, 500].map((q) => (
                <button
                  key={q}
                  type="button"
                  className="btn-secondary"
                  style={{ padding: "6px 12px", fontSize: 12 }}
                  onClick={() => setDepositAmount(q.toString())}
                >
                  ${q}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 12 }}>
              In production, this triggers an FCL transaction to transfer USDC from your wallet to the AutoFi vault contract.
            </p>
          </form>
        ) : (
          <form onSubmit={handleWithdraw}>
            <label className="form-label">Amount to Withdraw (USDC)</label>
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <input
                className="input-field"
                type="number"
                min="0.01"
                step="0.01"
                max={vaultBalance}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="50.00"
                required
              />
              <button type="submit" className="btn-primary" disabled={loading} style={{ flexShrink: 0 }}>
                {loading ? "Processing…" : <><ArrowUpFromLine size={14} /> Withdraw</>}
              </button>
            </div>
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: 12, padding: "6px 12px" }}
              onClick={() => setWithdrawAmount(vaultBalance.toString())}
            >
              Max: ${vaultBalance.toFixed(2)}
            </button>
          </form>
        )}
      </div>

      {/* History */}
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
          <Clock size={15} color="var(--accent-primary)" /> Transaction History
        </h3>
        <div>
          {vaultHistory.length === 0 ? (
            <p style={{ fontSize: 14, color: "var(--text-muted)" }}>No transactions yet.</p>
          ) : (
            vaultHistory.map((h, i) => (
              <div
                key={h.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 0",
                  borderBottom: i < vaultHistory.length - 1 ? "1px solid var(--border-subtle)" : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background:
                        h.type === "deposit"
                          ? "rgba(16,185,129,0.1)"
                          : h.type === "withdraw"
                          ? "rgba(239,68,68,0.1)"
                          : "rgba(99,102,241,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                    }}
                  >
                    {h.type === "deposit" ? "⬇️" : h.type === "withdraw" ? "⬆️" : "⚡"}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                      {h.description}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                      {mounted ? format(new Date(h.timestamp), "MMM d, yyyy · HH:mm") : "—"}
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: h.amount > 0 ? "var(--accent-success)" : "var(--text-secondary)",
                  }}
                >
                  {h.amount > 0 ? "+" : ""}${Math.abs(h.amount).toFixed(2)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
