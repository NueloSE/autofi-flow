"use client";

import { useState, useEffect } from "react";
import { Wallet, LogOut, Copy, CheckCircle, ExternalLink } from "lucide-react";
import { useAutoFiStore } from "@/store/useAutoFiStore";

export default function WalletButton() {
  const { walletAddress, isConnected, setWallet } = useAutoFiStore();
  const [copied, setCopied] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const DEMO_ADDRESS = "0x1a2b3c4d5e6f7890";

  const connect = async () => {
    // In production: await fcl.authenticate()
    setWallet(DEMO_ADDRESS);
  };

  const disconnect = () => {
    setWallet(null);
    setShowDropdown(false);
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
      <button onClick={connect} className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>
        <Wallet size={16} />
        Connect Wallet
      </button>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          width: "100%",
          background: "rgba(99,102,241,0.08)",
          border: "1px solid rgba(99,102,241,0.2)",
          borderRadius: 10,
          padding: "10px 12px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          transition: "all 0.15s",
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: "var(--gradient-brand)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
          }}
        >
          🔐
        </div>
        <div style={{ flex: 1, textAlign: "left" }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1 }}>Connected</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-accent)", lineHeight: 1.4 }}>
            {shortAddr}
          </div>
        </div>
        <div className="pulse-dot" />
      </button>

      {showDropdown && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: 0,
            right: 0,
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-glow)",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 -8px 30px rgba(0,0,0,0.4)",
            zIndex: 100,
          }}
        >
          <button
            onClick={copyAddress}
            style={{
              width: "100%",
              background: "none",
              border: "none",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              color: "var(--text-secondary)",
              fontSize: 13,
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            {copied ? <CheckCircle size={15} color="var(--accent-success)" /> : <Copy size={15} />}
            {copied ? "Copied!" : "Copy Address"}
          </button>
          <a
            href={`https://testnet.flowscan.io/account/${walletAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 16px",
              textDecoration: "none",
              color: "var(--text-secondary)",
              fontSize: 13,
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            <ExternalLink size={15} />
            View on Flowscan
          </a>
          <button
            onClick={disconnect}
            style={{
              width: "100%",
              background: "none",
              border: "none",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              color: "var(--accent-danger)",
              fontSize: 13,
            }}
          >
            <LogOut size={15} />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
