"use client";

import { useState, useEffect } from "react";
import { Wallet, LogOut, Copy, CheckCircle, ExternalLink } from "lucide-react";
import { useAutoFiStore } from "@/store/useAutoFiStore";
import fcl from "@/lib/fcl";

export default function WalletButton() {
  const { walletAddress, isConnected, setWallet, isDemoMode, setDemoMode } = useAutoFiStore();
  const [copied, setCopied] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Subscribe to FCL current user
  useEffect(() => {
    if (isDemoMode) return;
    const unsub = fcl.currentUser.subscribe((user: { addr?: string | null }) => {
      if (user?.addr) {
        setWallet(user.addr);
      }
    });
    return () => unsub();
  }, [isDemoMode, setWallet]);

  const connect = async () => {
    setConnecting(true);
    try {
      await fcl.authenticate();
    } catch {
      // If FCL fails (no wallet extension), fall back to demo
      setDemoMode(true);
      setWallet("0x1a2b3c4d5e6f7890");
    }
    setConnecting(false);
  };

  const connectDemo = () => {
    setDemoMode(true);
    setWallet("0x1a2b3c4d5e6f7890");
  };

  const disconnect = async () => {
    setShowDropdown(false);
    if (!isDemoMode) {
      await fcl.unauthenticate();
    }
    setWallet(null);
    setDemoMode(false);
  };

  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shortAddr = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : "";

  if (!isConnected) {
    return (
      <div className="flex flex-col gap-1.5">
        <button
          onClick={connect}
          disabled={connecting}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium cursor-pointer bg-amber-500/10 border border-amber-500/30 text-amber-500 hover:bg-amber-500/20 transition-colors duration-150 disabled:opacity-50"
        >
          <Wallet size={14} />
          {connecting ? "Connecting..." : "Connect Wallet"}
        </button>
        <button
          onClick={connectDemo}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-mono cursor-pointer bg-transparent border border-zinc-800 text-zinc-600 hover:text-zinc-400 hover:border-zinc-700 transition-colors duration-150"
        >
          Demo Mode
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md cursor-pointer bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600 transition-colors duration-150"
      >
        <Wallet size={14} className="text-amber-500" />
        <div className="flex-1 text-left min-w-0">
          <span className="font-mono text-xs text-zinc-300 block truncate">
            {shortAddr}
          </span>
        </div>
        {isDemoMode && (
          <span className="text-[8px] font-mono text-zinc-600 border border-zinc-800 px-1 py-0.5 rounded uppercase">
            demo
          </span>
        )}
        <div className="pulse-dot" />
      </button>

      {showDropdown && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-zinc-900 border border-zinc-700 rounded-md overflow-hidden shadow-lg shadow-black/40 z-50">
          <button
            onClick={copyAddress}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 cursor-pointer border-b border-zinc-800 bg-transparent border-l-0 border-r-0 border-t-0"
          >
            {copied ? <CheckCircle size={13} className="text-amber-500" /> : <Copy size={13} />}
            {copied ? "Copied" : "Copy Address"}
          </button>
          {!isDemoMode && (
            <a
              href={`https://testnet.flowscan.io/account/${walletAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-3 py-2.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 no-underline border-b border-zinc-800"
            >
              <ExternalLink size={13} />
              Flowscan
            </a>
          )}
          <button
            onClick={disconnect}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-red-400 hover:text-red-300 hover:bg-zinc-800 cursor-pointer bg-transparent border-0"
          >
            <LogOut size={13} />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
