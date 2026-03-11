AutoFi

## Project Overview

AutoFi is an on-chain financial automation platform built on the Flow blockchain. Users deposit funds, create automation strategies (recurring token swaps, auto-saving), and Flow's native Scheduled Transactions
execute them automatically — no bots, no keepers, no manual intervention.

**Tagline**: "Your DCA on Autopilot"

This project is being built for the **PL Genesis: Frontiers of Collaboration Hackathon** (deadline: March 16, 2026).

### Target Bounties

- **Flow Challenge** — $10,000 pool (10 teams x $1,000) — Primary bounty
- **Fresh Code Track** — $50,000 pool (10 teams x $5,000) — Main track

### Thematic Category

**Crypto: Upgrade Economies & Governance Systems**

---

## What Makes This Special

AutoFi leverages THREE Flow-exclusive features that no other blockchain has:

1.  **Scheduled Transactions** — Flow natively executes future transactions at specified times. No Chainlink Automation, no Gelato, no cron jobs. The chain itself runs your DCA.
2.  **Flow Actions** — Standardized composable DeFi primitives (Source, Sink, Swapper) that let you build atomic multi-step operations in a single transaction.
3.  **MEV Resistance** — Flow's architecture prevents frontrunning and sandwich attacks. Your DCA swaps can't be exploited by MEV bots.

---

## Features (Priority Order)

### Phase 1: Auto-Invest / DCA (MUST HAVE — Build First)

User deposits USDC (or FLOW), sets a strategy like "swap $50 USDC to FLOW every Monday", and the chain auto-executes the swap on schedule. User can view history, pause, cancel, or modify the strategy.

### Phase 2: Auto-Save (SHOULD HAVE — Build Second)

User sets a rule like "move 20 USDC to my savings vault every Friday". The chain auto-transfers on schedule. User sees vault balance, save history, and streak count.

### Phase 3: Price-Triggered Strategies (NICE TO HAVE — Only If Time Allows)

User sets rules like "buy FLOW when price drops 5%" using Pyth Oracle price feeds. Scheduled transactions periodically check price conditions and execute if met.

- **Pyth Oracle on Flow**: Contract `0x2880aB155794e7179c9eE2e38200202908C17B43` (both mainnet and testnet)
- **DO NOT build Phase 3 until Phase 1 and Phase 2 are fully working and tested.**

---

## Tech Stack

- **Blockchain**: Flow (EVM + Cadence)
- **Smart Contracts**: Cadence (primary) — using Flow's native Scheduled Transactions and Flow Actions
- **Frontend**: Next.js + TypeScript
- **Wallet Integration**: Flow Client Library (FCL) — `@onflow/fcl`
- **Styling**: Tailwind CSS
- **DEX for swaps**: IncrementFi (via Flow Actions connectors)
- **Oracle (Phase 3 only)**: Pyth Network

---

## Architecture — Agent Roles

### Agent 1: Smart Contract Agent

**Scope**: Everything in `/cadence` (contracts, transactions, scripts)
**Responsibilities**:

- Write Cadence smart contracts using Flow Actions and Scheduled Transactions
- Core contracts:
  - `AutoFi.cdc` — Main contract: manages user strategies, deposits, and orchestrates scheduled executions
  - `DCAStrategy.cdc` — Resource representing a DCA strategy (token pair, amount, frequency, status)
  - `SavingsVault.cdc` — Simple vault for auto-save feature
- Write Cadence transactions (user-facing operations)
- Write Cadence scripts (read-only queries)
- Write tests using Flow Testing Framework

**Do NOT**: Touch frontend code or anything outside `/cadence`.

---

### Agent 2: Frontend Agent

**Scope**: Everything in `/frontend`
**Responsibilities**:

- Next.js app with TypeScript and Tailwind CSS
- Pages/routes:
  - `/` — Landing page (explain what AutoFi does, hero section, how it works)
  - `/dashboard` — User dashboard (create strategies, view active/past strategies, total invested)
  - `/savings` — Auto-save vault view (balance, history, streak)
- Wallet connection via FCL (`@onflow/fcl`)
- Call Cadence transactions and scripts via FCL
- Responsive, clean UI

**Do NOT**: Write or modify Cadence contracts, touch anything in `/cadence`.

---

### Agent 3: Integration & DevOps Agent

**Scope**: Root config, deployment, connecting contracts ↔ frontend
**Responsibilities**:

- Project scaffolding (monorepo structure)
- flow.json configuration for Flow testnet
- Deployment scripts
- Environment variables (.env.example)
- README with setup instructions

**Do NOT**: Write core business logic in contracts or build UI components.

---

## Project Structure

```
autofi/
├── CLAUDE.md                         # This file
├── README.md                         # Setup instructions
├── flow.json                         # Flow CLI config (accounts, contracts, deployments)
├── .env.example                      # Environment variables template
│
├── cadence/                          # Agent 1: Smart Contract Agent
│   ├── contracts/
│   │   ├── AutoFi.cdc               # Main contract — strategy management + scheduling
│   │   ├── DCAStrategy.cdc          # DCA strategy resource definition
│   │   └── SavingsVault.cdc         # Auto-save vault
│   ├── transactions/
│   │   ├── create_dca_strategy.cdc  # User creates a new DCA strategy
│   │   ├── cancel_strategy.cdc      # User cancels an active strategy
│   │   ├── pause_strategy.cdc       # User pauses a strategy
│   │   ├── resume_strategy.cdc      # User resumes a paused strategy
│   │   ├── deposit.cdc              # User deposits funds
│   │   ├── withdraw.cdc             # User withdraws funds
│   │   ├── create_savings_rule.cdc  # User creates an auto-save rule
│   │   └── setup_account.cdc        # Initialize user account storage
│   ├── scripts/
│   │   ├── get_strategies.cdc       # Get all strategies for a user
│   │   ├── get_strategy_details.cdc # Get details of a specific strategy
│   │   ├── get_vault_balance.cdc    # Get savings vault balance
│   │   └── get_execution_history.cdc# Get past DCA execution history
│   └── tests/
│       └── AutoFi_test.cdc          # Tests
│
├── frontend/                         # Agent 2: Frontend Agent
│   ├── src/
│   │   ├── app/                      # Next.js App Router
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx              # Landing page
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx          # Strategy dashboard
│   │   │   └── savings/
│   │   │       └── page.tsx          # Savings vault view
│   │   ├── components/
│   │   │   ├── Navbar.tsx
│   │   │   ├── WalletConnect.tsx     # FCL wallet connection
│   │   │   ├── CreateStrategy.tsx    # Form to create DCA strategy
│   │   │   ├── StrategyCard.tsx      # Display an active strategy
│   │   │   ├── StrategyList.tsx      # List all strategies
│   │   │   ├── ExecutionHistory.tsx  # Past DCA executions
│   │   │   ├── DepositForm.tsx       # Deposit funds
│   │   │   ├── SavingsVault.tsx      # Auto-save vault display
│   │   │   └── HowItWorks.tsx        # Landing page explainer section
│   │   ├── hooks/
│   │   │   ├── useFlow.ts            # FCL initialization + wallet state
│   │   │   ├── useStrategies.ts      # Fetch/manage strategies
│   │   │   └── useSavings.ts         # Fetch savings vault data
│   │   ├── lib/
│   │   │   ├── fcl-config.ts         # FCL configuration (testnet, wallet discovery)
│   │   │   ├── transactions.ts       # Cadence transaction imports
│   │   │   └── scripts.ts            # Cadence script imports
│   │   └── providers/
│   │       └── FlowProvider.tsx      # FCL context provider
│   ├── public/
│   ├── tailwind.config.ts
│   ├── next.config.js
│   └── package.json
│
└── package.json                      # Root package.json (workspace config)
```

---

## Core User Flows

### Flow 1: User Creates a DCA Strategy

1.  Connect wallet via FCL (Lilico or Flow Wallet)
2.  Click "New Strategy"
3.  Fill form: source token (USDC), target token (FLOW), amount per swap ($50), frequency (weekly)
4.  Frontend sends `create_dca_strategy.cdc` transaction
5.  Contract:
    - Creates a `DCAStrategy` resource with user's parameters
    - Sets up a `FlowTransactionScheduler.TransactionHandler`
    - Calculates fees via `FlowTransactionScheduler.calculateFee()`
    - Withdraws fees from user's FLOW vault
    - Calls `manager.schedule()` with the handler, timestamp (now + frequency), and fees
    - On execution, the handler:
      - Withdraws `amount` from user's deposited USDC (Source)
      - Swaps USDC → FLOW via IncrementFi Swapper connector
      - Deposits FLOW into user's vault (Sink)
      - Schedules the NEXT execution (recurring loop)
      - Emits `DCAExecuted(user, amountIn, amountOut, timestamp)` event
6.  Dashboard shows: strategy status, next execution time, history

### Flow 2: User Views Dashboard

1.  Connect wallet
2.  Frontend calls `get_strategies.cdc` script → returns all active strategies
3.  Frontend calls `get_execution_history.cdc` → returns past DCA executions
4.  Display: active strategies with next execution time, pause/cancel buttons, execution history with amounts and timestamps

### Flow 3: User Pauses/Cancels Strategy

1.  Click pause or cancel on a strategy
2.  Frontend sends `pause_strategy.cdc` or `cancel_strategy.cdc` transaction
3.  Contract pauses scheduling (no new scheduled tx) or cancels and returns remaining deposited funds

### Flow 4: User Creates Auto-Save Rule

1.  Click "New Savings Rule"
2.  Fill form: amount (20 USDC), frequency (weekly)
3.  Frontend sends `create_savings_rule.cdc` transaction
4.  Contract:
    - Creates a scheduled transaction that transfers `amount` from user's main vault to their savings vault on schedule
    - Savings vault is a separate resource in the user's account storage
5.  Savings page shows: vault balance, save history, streak count

### Flow 5: User Deposits / Withdraws Funds

1.  User deposits USDC/FLOW into their AutoFi account (funds held in contract or user's account storage)
2.  These deposited funds are what the DCA strategies draw from
3.  User can withdraw unused funds at any time

---

## Key Cadence Patterns

### Scheduled Transaction Handler for DCA

```cadence
import FlowTransactionScheduler from 0xSchedulerAddress
import FungibleToken from 0xFungibleTokenAddress
import FlowToken from 0xFlowTokenAddress

access(all) contract AutoFi {

    // DCA Strategy resource
    access(all) resource DCAStrategy {
        access(all) let id: UInt64
        access(all) let sourceTokenType: Type
        access(all) let targetTokenType: Type
        access(all) let amountPerSwap: UFix64
        access(all) let frequencySeconds: UFix64
        access(all) var isActive: Bool
        access(all) var totalExecutions: UInt64
        access(all) var totalInvested: UFix64

        init(
            id: UInt64,
            sourceTokenType: Type,
            targetTokenType: Type,
            amountPerSwap: UFix64,
            frequencySeconds: UFix64
        ) {
            self.id = id
            self.sourceTokenType = sourceTokenType
            self.targetTokenType = targetTokenType
            self.amountPerSwap = amountPerSwap
            self.frequencySeconds = frequencySeconds
            self.isActive = true
            self.totalExecutions = 0
            self.totalInvested = 0.0
        }
    }

    // Transaction Handler for scheduled execution
    access(all) resource DCAHandler: FlowTransactionScheduler.TransactionHandler {
        access(FlowTransactionScheduler.Execute)
        fun executeTransaction(id: UInt64, data: AnyStruct?) {
            // 1. Get strategy details from data
            // 2. Withdraw source tokens from user deposit (Source)
            // 3. Swap via IncrementFi Swapper connector
            // 4. Deposit output tokens to user vault (Sink)
            // 5. Update strategy stats (totalExecutions, totalInvested)
            // 6. Schedule NEXT execution (self-recurring)
            // 7. Emit DCAExecuted event
        }
    }

    // Events
    access(all) event StrategyCreated(strategyId: UInt64, user: Address, amount: UFix64, frequency: UFix64)
    access(all) event DCAExecuted(strategyId: UInt64, user: Address, amountIn: UFix64, amountOut: UFix64, timestamp: UFix64)
    access(all) event StrategyCancelled(strategyId: UInt64, user: Address)
    access(all) event StrategyPaused(strategyId: UInt64, user: Address)
}
```

### Scheduling a Recurring DCA

```cadence
// Inside the create_dca_strategy transaction:

// 1. Create handler and save to storage
let handler <- AutoFi.createDCAHandler()
signer.storage.save(<-handler, to: /storage/AutoFiDCAHandler)

// 2. Issue capability with Execute entitlement
let cap = signer.capabilities.storage
    .issue<auth(FlowTransactionScheduler.Execute)
        &{FlowTransactionScheduler.TransactionHandler}>(/storage/AutoFiDCAHandler)

// 3. Calculate first execution time
let firstExecution = getCurrentBlock().timestamp + frequencySeconds

// 4. Calculate and withdraw fees
let priority = FlowTransactionScheduler.Priority.Medium
let executionEffort: UInt64 = 5000
let feeEstimate = FlowTransactionScheduler.calculateFee(
    executionEffort: executionEffort,
    priority: priority,
    dataSizeMB: 0
)
let vaultRef = signer.storage
    .borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(
        from: /storage/flowTokenVault)
    ?? panic("No FLOW vault found")
let fees <- vaultRef.withdraw(amount: feeEstimate ?? 0.0) as! @FlowToken.Vault

// 5. Schedule first execution
manager.schedule(
    handlerCap: cap,
    data: strategyData,
    timestamp: firstExecution,
    priority: priority,
    executionEffort: executionEffort,
    fees: <-fees
)
```

### Flow Actions: Source → Swap → Sink (inside DCA execution)

```cadence
import FungibleTokenConnectors from 0xFTConnectors
import IncrementFiSwapConnectors from 0xIncrementFi

// 1. SOURCE — withdraw USDC from user's deposit
let source = FungibleTokenConnectors.VaultSource(
    min: 0.0,
    withdrawVault: userDepositCap,
    uniqueID: uniqueIdentifier
)
let tokens <- source.withdrawAvailable(maxAmount: strategy.amountPerSwap)

// 2. SWAP — swap USDC → FLOW via IncrementFi
let swapper = IncrementFiSwapConnectors.Swapper(
    path: [usdcKey, flowKey],
    inVault: Type<@USDCFlow.Vault>(),
    outVault: Type<@FlowToken.Vault>(),
    uniqueID: uniqueIdentifier
)
let swapped <- swapper.swap(quote: nil, inVault: <-tokens)

// 3. SINK — deposit FLOW into user's vault
let sink = FungibleTokenConnectors.VaultSink(
    max: nil,
    depositVault: userFlowVaultCap,
    uniqueID: uniqueIdentifier
)
sink.depositCapacity(from: &swapped as auth(FungibleToken.Withdraw) &{FungibleToken.Vault})
```

### FCL Frontend Configuration

```typescript
import * as fcl from "@onflow/fcl";

fcl.config({
  "app.detail.title": "AutoFi",
  "app.detail.icon": "https://autofi.xyz/logo.png",
  "accessNode.api": "https://rest-testnet.onflow.org",
  "discovery.wallet": "https://fcl-discovery.onflow.org/testnet/authn",
  "flow.network": "testnet",
});

// Send a transaction
const txId = await fcl.mutate({
  cadence: CREATE_DCA_STRATEGY_CDC,
  args: (arg, t) => [
    arg("50.0", t.UFix64), // amount per swap
    arg("604800.0", t.UFix64), // frequency: 7 days in seconds
  ],
  limit: 9999,
});

const txResult = await fcl.tx(txId).onceSealed();

// Run a script (read-only)
const strategies = await fcl.query({
  cadence: GET_STRATEGIES_CDC,
  args: (arg, t) => [arg(userAddress, t.Address)],
});
```

---

## Flow Resources & Documentation

- Flow Developer Portal: https://developers.flow.com
- Cadence Language: https://cadence-lang.org/docs
- Flow Actions (intro): https://developers.flow.com/blockchain-development-tutorials/forte/flow-actions/intro-to-flow-actions
- Flow Actions (connectors): https://developers.flow.com/blockchain-development-tutorials/forte/flow-actions/connectors
- Scheduled Transactions: https://developers.flow.com/blockchain-development-tutorials/forte/scheduled-transactions/scheduled-transactions-introduction
- Native VRF: https://developers.flow.com/blockchain-development-tutorials/native-vrf/vrf-in-solidity
- FCL (Flow Client Library): https://github.com/onflow/fcl-js
- IncrementFi (DEX): https://www.incrementfi.com
- Pyth on Flow (Phase 3): Contract `0x2880aB155794e7179c9eE2e38200202908C17B43`

---

## Rules

1.  **Phase 1 (DCA) MUST be fully working before starting Phase 2 (Auto-Save)**
2.  **Phase 2 (Auto-Save) MUST be fully working before considering Phase 3 (Price Triggers)**
3.  **Phase 3 is ONLY if time allows** — do not start it unless Phase 1 and 2 are polished
4.  Keep it simple — this is a hackathon MVP
5.  Each agent stays in their lane — contract agent doesn't touch frontend, frontend agent doesn't touch contracts
6.  Use Flow's native features (Scheduled Transactions, Flow Actions) — don't reinvent what the chain already provides
7.  All swaps go through IncrementFi via Flow Actions connectors
8.  The self-recurring pattern is critical: each DCA execution must schedule the NEXT one before completing
9.  User funds must be withdrawable at any time — never lock funds permanently
10. Emit events for every strategy creation, execution, pause, and cancellation — the frontend relies on these
