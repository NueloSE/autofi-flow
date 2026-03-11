# AutoFi – Autopilot Finance on Flow

**AutoFi** is a Consumer DeFi application built on the [Flow blockchain](https://flow.com) that allows users to automate financial actions such as **investing, subscriptions, savings, and trading strategies** using rule-based automation.

Instead of manually executing transactions, users create simple automation rules and the blockchain executes them automatically.


---

# Overview

AutoFi acts as an **autonomous financial assistant for crypto users**.

Users can create automation rules like:
- Buy $50 of FLOW every week
- Pay 10 USDC monthly to a subscription
- Save 20 USDC every Friday
- Buy FLOW when price drops 5%
- Sell FLOW when price rises 10%


Once created, **AutoFi executes these rules automatically on-chain**, eliminating the need for bots, scripts, or manual transactions.

---

# Core Features

| Feature | Description |
|------|------|
| **DCA Investing** | Automatically buy tokens on a recurring schedule |
| **Subscription Payments** | Recurring payments to any wallet address |
| **Savings Automation** | Automatically move funds into savings |
| **Buy the Dip** | Automatically buy tokens when price drops by X% |
| **Take Profit** | Automatically sell tokens when price rises by X% |
| **Natural Language Rules** | Create automation rules using plain English |
| **Strategy Simulation** | Preview projected outcomes before creating rules |
| **Safety Guards** | Spending caps, slippage protection, emergency stop |
| **Email Alerts** | Pre-execution email with one-click cancel link |

---

# Example Use Cases

### DCA Investing

Automatically build a position in tokens over time.

Example:

Buy $50 of FLOW every week


### Subscription Payments

Automate recurring payments similar to traditional subscription services.

Example:

Pay 10 USDC every month


### Savings Automation

Encourage consistent saving habits.

Example:

Save 20 USDC every Friday


### Buy the Dip

Automatically purchase assets when the price drops.

Example:

Buy FLOW when price drops 5%


### Take Profit

Lock in gains automatically.

Example:

Sell FLOW when price rises 10%

---

# Advanced Features

## Natural Language Automation

Users can create automation rules using simple plain English instructions.

Example input:

Buy $50 of FLOW every Monday


AutoFi automatically converts this into a structured automation rule.

---

## Strategy Simulation

Before creating a rule, AutoFi shows a simulation preview of potential outcomes.

Example:

Invest $50 weekly

Simulation preview:
```cadence
After 3 months
Total invested: $600
Estimated portfolio value: $720
```


This helps users understand expected results before committing to automation.

---

## Safety Guard System

AutoFi includes built-in protections to prevent risky automations.

Safety features include:

• Maximum monthly spending limits  
• Slippage protection  
• Emergency stop for all automation rules  

---

## Email Notifications

Users can optionally receive email alerts before an automated rule executes.

Email includes:

- Rule description
- Scheduled execution time
- One-click cancel link

This gives users time to cancel the transaction before it runs.

AutoFi uses **Resend** (free tier: 3,000 emails/month) to send notifications.

---

# Quick Start

## 1. Clone the Repository

```bash
git clone https://github.com/youruser/autofi-flow.git
cd autofi-flow
npm install
```
## 2. Configure Environment Variables
```bash
cp .env.local.example .env.local
```
## 3. Fill in the required values:
```bash
RESEND_API_KEY=re_...
NEXT_PUBLIC_FLOW_NETWORK=testnet
CANCEL_TOKEN_SECRET=your_secret
```

## 4. Run Development Server
```bash
npm run dev
```

open: 
```
http://localhost:3000
```

# Architecture

```mermaid
autofi-flow/
├── cadence/
│   ├── contracts/
│   │   └── AutoFiEngine.cdc
│   ├── transactions/
│   │   ├── deposit_funds.cdc
│   │   ├── create_rule.cdc
│   │   ├── cancel_rule.cdc
│   │   ├── execute_rule.cdc
│   │   └── pause_all_rules.cdc
│   └── scripts/
│       ├── get_user_rules.cdc
│       └── get_vault_balance.cdc
│
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── (app)/
│   │   │   ├── dashboard/
│   │   │   ├── rules/create/
│   │   │   ├── vault/
│   │   │   └── simulation/
│   │   └── api/
│   │       ├── parse-rule/
│   │       └── notify/
│
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── WalletButton.tsx
│   │   ├── RuleTypeBadge.tsx
│   │   └── SimulationPreview.tsx
│
│   ├── lib/
│   │   ├── fcl.ts
│   │   └── email.ts
│
│   └── store/
│       └── useAutoFiStore.ts
│
└── flow.json
```

# Smart Contract
### AutoFiEngine.cdc

The core Cadence contract manages:

- User vaults

- Automation rules

- Rule execution

- Safety protections

- Emergency stop

### Rule Types

```cadence
// Rule Types
DCA_INVEST
SUBSCRIPTION_PAYMENT
SAVINGS_TRANSFER
PRICE_DIP_BUY
PROFIT_SELL

```

### Trigger Types

```cadence
// Trigger Types
TIME_BASED
PRICE_BASED

```

---
## Deploy Contracts (Flow Testnet)
1. Install Flow CLI:
```bash
curl -fsSL https://install.flow.com | bash

OR

brew install flow-cli
```
2. Configure your testnet account inside flow.json.

3. Deploy contracts:
```bash
flow project deploy --network testnet
```

### Example Automation Flow

1. User deposits funds into AutoFi vault

2. User creates an automation rule

3. Rule is stored on-chain

4. Scheduled or price trigger activates rule

5. Optional email alert is sent

6. Rule executes automatically

7. Next execution time updates

---
## Vision

**AutoFi** aims to make decentralized finance simple, automated, and accessible to everyday users.

Instead of interacting with complex DeFi protocols manually, users simply define financial rules and let their finances run on autopilot.