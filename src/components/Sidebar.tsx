"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Zap,
  PlusCircle,
  Wallet,
  Activity,
  Shield,
  Settings,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useAutoFiStore } from "@/store/useAutoFiStore";
import WalletButton from "./WalletButton";

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/rules/create", icon: PlusCircle, label: "Create Rule" },
  { href: "/vault", icon: Wallet, label: "Vault" },
  { href: "/simulation", icon: Activity, label: "Simulate" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { rules, vaultBalance, allPaused } = useAutoFiStore();
  const activeRules = rules.filter((r) => r.active).length;

  return (
    <aside className="app-sidebar">
      {/* Logo */}
      <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "var(--gradient-brand)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
            }}
          >
            ⚡
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: "var(--text-primary)", letterSpacing: "-0.3px" }}>
              AutoFi
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: -2 }}>
              Autopilot Finance
            </div>
          </div>
        </Link>
      </div>

      {/* Stats strip */}
      <div
        style={{
          padding: "12px 20px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          gap: 16,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px" }}>
            Vault
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--accent-success)" }}>
            ${vaultBalance.toFixed(0)}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px" }}>
            Active Rules
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--accent-primary)" }}>
            {activeRules}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 12px" }}>
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 10,
                marginBottom: 2,
                textDecoration: "none",
                background: isActive ? "rgba(99,102,241,0.12)" : "transparent",
                color: isActive ? "var(--accent-primary)" : "var(--text-secondary)",
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                transition: "all 0.15s ease",
                border: isActive ? "1px solid rgba(99,102,241,0.2)" : "1px solid transparent",
              }}
            >
              <Icon size={17} />
              {label}
              {isActive && <ChevronRight size={14} style={{ marginLeft: "auto", opacity: 0.6 }} />}
            </Link>
          );
        })}

        {/* Emergency Stop */}
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border-subtle)" }}>
          <EmergencyStopButton allPaused={allPaused} />
        </div>
      </nav>

      {/* Wallet */}
      <div style={{ padding: "16px", borderTop: "1px solid var(--border-subtle)" }}>
        <WalletButton />
        {allPaused && (
          <div
            style={{
              marginTop: 8,
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 8,
              padding: "6px 10px",
              fontSize: 11,
              color: "var(--accent-danger)",
              textAlign: "center",
            }}
          >
            🔴 All rules paused
          </div>
        )}
      </div>
    </aside>
  );
}

function EmergencyStopButton({ allPaused }: { allPaused: boolean }) {
  const { pauseAllRules, resumeAllRules } = useAutoFiStore();

  return (
    <button
      onClick={allPaused ? resumeAllRules : pauseAllRules}
      className={allPaused ? "btn-secondary" : "btn-danger"}
      style={{ width: "100%", justifyContent: "center", fontSize: 13 }}
    >
      <Shield size={15} />
      {allPaused ? "Resume All Rules" : "Emergency Stop"}
    </button>
  );
}
