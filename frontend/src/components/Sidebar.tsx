"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, PieChart, Shield, Loader2 } from "lucide-react";
import { useAutoFiStore } from "@/store/useAutoFiStore";
import { txEmergencyStop, txResumeAll, queryIsEmergencyStopped } from "@/lib/flow-transactions";
import { parseFriendlyError } from "@/lib/parse-error";
import WalletButton from "./WalletButton";

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/portfolio", icon: PieChart, label: "Portfolio" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { allPaused, setAllPaused, walletAddress, isConnected } = useAutoFiStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEmergencyToggle = async () => {
    if (!isConnected || !walletAddress || loading) return;
    setLoading(true);
    setError("");
    try {
      if (allPaused) {
        await txResumeAll();
      } else {
        await txEmergencyStop();
      }
      const stopped = await queryIsEmergencyStopped(walletAddress);
      setAllPaused(stopped);
    } catch (err) {
      setError(parseFriendlyError(err));
    }
    setLoading(false);
  };

  return (
    <aside className="app-sidebar">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-zinc-800/60">
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <img src="/autofi-logo.svg" alt="AutoFi" width={28} height={28} className="rounded" />
          <span className="font-mono font-bold text-lg text-zinc-50 tracking-tight">
            AutoFi
          </span>
          <span className="text-[9px] font-mono font-medium text-amber-500 border border-amber-500/30 px-1.5 py-0.5 rounded uppercase tracking-wider">
            mainnet
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm no-underline transition-colors duration-150
                ${isActive
                  ? "text-amber-500 border-l-2 border-amber-500 bg-amber-500/5 pl-2.5"
                  : "text-zinc-500 hover:text-zinc-300 border-l-2 border-transparent"
                }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-3 border-t border-zinc-800/60 flex flex-col gap-2">
        {/* Emergency Stop */}
        <button
          onClick={handleEmergencyToggle}
          disabled={!isConnected || loading}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-medium cursor-pointer transition-colors duration-150
            ${allPaused
              ? "bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700"
              : "bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20"
            }`}
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Shield size={13} />}
          {loading ? "Processing..." : allPaused ? "Resume All" : "Emergency Stop"}
        </button>

        {allPaused && (
          <div className="text-[10px] text-red-400 text-center font-mono">
            All rules paused
          </div>
        )}

        {error && (
          <button
            onClick={() => setError("")}
            className="text-[10px] text-red-400 text-center font-mono bg-red-500/5 border border-red-500/20 rounded px-2 py-1.5 cursor-pointer hover:bg-red-500/10 transition-colors"
          >
            {error}
          </button>
        )}

        {/* Wallet */}
        <WalletButton />
      </div>
    </aside>
  );
}
