<p align="center">
  <img src="frontend/public/flow-logo.svg" width="60" />
</p>

<h1 align="center">AutoFi — Your DCA on Autopilot</h1>

<p align="center">
  <strong>On-chain financial automation powered by Flow's native Scheduled Transactions.</strong><br/>
  No bots. No keepers. No cron jobs. Just the chain doing the work.
</p>

<p align="center">
  <a href="#why-flow">Why Flow</a> · <a href="#features">Features</a> · <a href="#how-it-works">How It Works</a> · <a href="#architecture">Architecture</a> · <a href="#quick-start">Quick Start</a> · <a href="#live-on-mainnet">Live on Mainnet</a>
</p>

---

## The Problem

DCA (Dollar-Cost Averaging) is one of the most effective investment strategies — but in crypto, it's a pain. You either:

- **Set calendar reminders** and manually swap every week
- **Trust a centralized app** with your keys
- **Run keeper bots** that cost gas and can go offline

Every existing solution requires off-chain infrastructure that can fail, get hacked, or rug.

## The Solution

**AutoFi** lets you type a strategy in plain English, and **Flow's blockchain executes it automatically** — forever, on schedule, with zero off-chain dependencies.

```
> Buy 5 USDC every 5 minutes
```

That's it. The chain handles the rest.

---

## Why Flow

AutoFi isn't just *deployed* on Flow — it's **only possible on Flow**. We leverage three features no other chain has:

| Feature | What It Does | Why It Matters |
|---|---|---|
| **Scheduled Transactions** | The chain itself executes future transactions at specified times | No Chainlink Automation, no Gelato, no cron jobs. Zero off-chain infrastructure. |
| **Cadence Resource Model** | User funds are stored as owned resources, not in a shared pool | Your vault is *yours*. Not a mapping in someone else's contract. |
| **MEV Resistance** | Flow's architecture prevents frontrunning and sandwich attacks | Your DCA swaps can't be exploited by MEV bots. Every swap gets a fair price. |

---

## Live on Mainnet

AutoFi is live on Flow Mainnet. Try it out:

- [AutoFi Contract](https://flowscan.org/contract/0x3002afb10b4ba66d)
- [AutoFi Scheduler Contract](https://flowscan.org/contract/0x3002afb10b4ba66d)
- [AutoFi Frontend](https://autofi.flow.link)

## Features

### Core Automation
- **DCA Investing** — Automatically swap FLOW into USDC, stFLOW, or DUST on a recurring schedule via IncrementFi DEX
- **Savings Automation** — Auto-transfer funds to savings on a schedule
- **Subscription Payments** — Recurring payments to any wallet address
- **Buy the Dip** — Buy tokens when price drops by X%
- **Take Profit** — Sell tokens when price rises by X%

### User Experience
- **Natural Language Input** — Type `"Buy 5 USDC every 5 min"` and AutoFi parses it into a strategy
- **Manual Mode** — Full control with dropdowns for token, amount, frequency
- **Real-time Countdown** — Live timers showing when each strategy executes next
- **On-chain Activity Feed** — All history pulled directly from Flow contract events

### Safety
- **Monthly Spend Caps** — Strategies won't exceed your budget
- **Emergency Stop** — One-click pause on all active strategies
- **Per-strategy Controls** — Pause, resume, or cancel any individual strategy
- **Slippage Protection** — Built into every DEX swap

### Supported Tokens
| Token | Type | DEX Pool |
|---|---|---|
| **FLOW** | Native | Base pair |
| **USDC** | Stablecoin (bridged) | FLOW/USDCFlow |
| **stFLOW** | Liquid staking | FLOW/stFLOW |
| **DUST** | Flovatar ecosystem | FLOW/DUST |

All swaps execute through **IncrementFi's SwapRouter** — the primary Cadence-native DEX on Flow.

---

## How It Works

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│   User types:   │     │  AutoFi Contract  │     │  Flow Scheduled Tx  │
│  "Buy 5 USDC    │────>│  Creates strategy │────>│  Executes on-chain  │
│   every 5 min"  │     │  in user's vault  │     │  at scheduled time  │
└─────────────────┘     └──────────────────┘     └──────────┬──────────┘
                                                            │
                        ┌──────────────────┐                │
                        │  IncrementFi DEX │<───────────────┘
                        │  FLOW → USDC     │  Swaps tokens, deposits
                        │  swap executed   │  output to user's wallet
                        └──────────────────┘
                                │
                                v
                    ┌───────────────────────┐
                    │  Schedules NEXT swap  │  Self-recurring loop —
                    │  (same interval)      │  chain keeps going
                    └───────────────────────┘
```

**The self-recurring pattern is key**: each execution schedules the *next* one before completing. The chain perpetually runs your strategy until you cancel it.

---

## Architecture

### Smart Contracts (Cadence)

| Contract | Address (Mainnet) | Purpose |
|---|---|---|
| `AutoFi.cdc` | `0x3002afb10b4ba66d` | Core vault, strategies, DEX swap execution |
| `AutoFiScheduler.cdc` | `0x3002afb10b4ba66d` | Bridges AutoFi with Flow's `FlowTransactionScheduler` |

### Contract Design

```
AutoFi.Vault (per-user resource)
├── flowVault: @FlowToken.Vault     — deposited FLOW funds
├── strategies: {UInt64: Strategy}   — user's automation strategies
├── executionLog: [ExecutionRecord]  — on-chain execution history
└── emergencyStopped: Bool           — safety kill switch

AutoFiScheduler.Handler (per-user resource)
├── vaultCap → AutoFi.Vault         — executes strategies
├── flowVaultCap → FlowToken.Vault  — pays scheduling fees
└── managerCap → Scheduler.Manager  — schedules next execution
```

### Frontend (Next.js + TypeScript)

```
frontend/src/
├── app/
│   ├── page.tsx                    — Landing page
│   └── (app)/dashboard/page.tsx    — Main dashboard
├── components/
│   ├── TokenIcon.tsx               — Token logo display
│   └── RuleTypeBadge.tsx           — Strategy type badges
├── lib/
│   ├── fcl.ts                      — FCL wallet config (mainnet/testnet)
│   ├── flow-transactions.ts        — Cadence transaction templates + FCL calls
│   ├── flow-events.ts              — On-chain event fetching for activity feed
│   ├── parse-rule.ts               — Natural language → strategy parser
│   └── parse-error.ts              — Cadence errors → friendly messages
└── store/
    └── useAutoFiStore.ts           — Zustand state management
```

### Key Dependencies
| Dependency | Role |
|---|---|
| `FlowTransactionScheduler` | Flow's native scheduled execution engine |
| `SwapRouter` (IncrementFi) | On-chain token swaps |
| `@onflow/fcl` | Wallet connection + transaction signing |

---

## Live on Mainnet

AutoFi is deployed and running on **Flow Mainnet**:

- **Contract**: [`0x3002afb10b4ba66d`](https://www.flowscan.io/account/0x3002afb10b4ba66d)
- **Network**: Flow Mainnet
- **DEX**: IncrementFi (SwapRouter `0xa6850776a94e6551`)

---

## Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- [Flow CLI](https://developers.flow.com/tools/flow-cli/install) (optional, for contract deployment)
- A Flow wallet ([Flow Wallet](https://wallet.flow.com/) or [Lilico](https://lilico.app/))

### 1. Clone & Install

```bash
git clone https://github.com/youruser/autofi-flow.git
cd autofi-flow/frontend
npm install
```

### 2. Configure Environment

```bash
# frontend/.env.local
NEXT_PUBLIC_FLOW_NETWORK=mainnet
```

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Use It

1. Connect your Flow wallet
2. Deposit FLOW into your AutoFi vault
3. Type a strategy: `"Buy 5 USDC every 5 min"`
4. Watch it execute automatically on-chain

---

## Contract Deployment

To deploy your own instance:

```bash
# Install Flow CLI
brew install flow-cli

# Deploy to testnet
flow project deploy --network testnet

# Deploy to mainnet
flow accounts add-contract AutoFi cadence/contracts/AutoFi.cdc --network mainnet --signer mainnet-account
flow accounts add-contract AutoFiScheduler cadence/contracts/AutoFiScheduler.cdc --network mainnet --signer mainnet-account
```

---

## Strategy Types

| Type | Trigger | Example |
|---|---|---|
| `DCA_INVEST` | Time-based | "Buy 5 USDC every 5 min" |
| `SAVINGS_TRANSFER` | Time-based | "Save 10 FLOW weekly" |
| `SUBSCRIPTION_PAYMENT` | Time-based | "Pay 20 USDC monthly" |
| `PRICE_DIP_BUY` | Price-based | "Buy FLOW when price drops 5%" |
| `PROFIT_SELL` | Price-based | "Sell FLOW when price rises 10%" |

---

## What Makes This Different

| Feature | AutoFi (Flow) | Existing DCA Tools |
|---|---|---|
| Execution | Chain-native scheduled transactions | Off-chain keepers/bots |
| Infrastructure | Zero — the chain IS the infrastructure | Servers, cron jobs, monitoring |
| Custody | User owns their vault resource | Funds in shared contract pools |
| MEV Protection | Built into Flow | None (sandwich attacks common) |
| Uptime | 100% (as long as Flow runs) | Depends on bot/keeper uptime |
| Cost | One-time scheduling fee | Ongoing gas for keeper transactions |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Blockchain | Flow (Cadence) |
| Smart Contracts | Cadence — `AutoFi.cdc`, `AutoFiScheduler.cdc` |
| Scheduling | Flow Native Scheduled Transactions |
| DEX | IncrementFi SwapRouter |
| Frontend | Next.js 15 + TypeScript |
| Styling | Tailwind CSS |
| Wallet | Flow Client Library (FCL) |
| State | Zustand |

---

## Hackathon

Built for **PL Genesis: Frontiers of Collaboration Hackathon**.

- **Flow Challenge** — $10,000 pool
- **Fresh Code Track** — $50,000 pool
- **Category**: Crypto — Upgrade Economies & Governance Systems

---

<p align="center">
  <strong>AutoFi</strong> — Your finances on autopilot. Powered by Flow.<br/>
</p>
