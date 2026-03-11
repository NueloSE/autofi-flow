# AutoFi

**Autopilot Finance on Flow**

AutoFi is a rule-based financial automation platform built on the Flow blockchain that allows users to automate investing, subscriptions, savings, and trading strategies using simple rules.

The project demonstrates how Flow’s scheduled transactions and smart contract capabilities can power fully automated financial systems without bots or manual intervention.

---

## Overview

AutoFi acts as an **autonomous financial assistant**.

Users can create simple automation rules such as:

• Buy $50 of FLOW every week (DCA investing)  
• Pay 10 USDC monthly to a subscription service  
• Move $20 to a savings vault every Friday  
• Buy FLOW when the price drops 5%  
• Sell FLOW when the price rises 10% to take profit

Once created, the blockchain executes these rules automatically.

---

## Features

### Automated Investing (DCA)

Automatically invest in crypto on a schedule.

Example:
Buy $50 of FLOW every week

---

### Subscription Payments

Automate recurring payments to services.

Example:
Pay 10 USDC every month

---

### Savings Automation

Automatically move funds to savings.

Example:
Save 20 USDC every Friday

---

### Buy the Dip

Automatically buy tokens when price drops.

Example:
Buy FLOW when price drops 5%

---

### Take Profit

Automatically sell tokens when price increases.

Example:

Sell FLOW when price rises 10%

---

### Email Notifications

Users can receive email alerts before automated transactions occur.

The notification allows users to cancel the rule before execution if needed.

---

## Advanced Features

### Natural Language Automation

Users can create rules using plain English.

Example:
Buy $50 of FLOW every Monday

AutoFi automatically converts the instruction into a rule.

---

### Strategy Simulation

Before creating a rule, users can preview potential outcomes.

Example:
Invest $50 weekly

Simulation preview:

After 3 months
Total invested: $600
Estimated portfolio value: $720

---

### Safety Guards

AutoFi includes built-in safety protections:

• Maximum monthly spending limits  
• Slippage protection  
• Emergency stop for all automations

---

## Architecture

AutoFi consists of three main components.

### Smart Contracts

Built using Cadence on the Flow blockchain.

Responsibilities:

• Manage user vaults  
• Store automation rules  
• Execute automated actions  
• Enforce safety guards

---

### Frontend

Built with:

• Next.js  
• React  
• TailwindCSS

Features:

• automation dashboard  
• rule creation interface  
• natural language rule input  
• automation simulation preview

---

### Notification System

Email notifications are sent before automation events using an email service such as:

• SendGrid  
• Resend

---

---

## Example Automation Flow

1. User deposits funds
2. User creates an automation rule
3. AutoFi stores the rule on-chain
4. Scheduled transactions or price triggers activate the rule
5. Optional email notification is sent
6. Rule executes automatically
7. Next execution time updates

---

## Example Use Cases

### DCA Investing

Buy $50 of FLOW every week

### Subscription

Pay 10 USDC monthly

### Trading Strategy

Buy FLOW if price drops 5%
Sell when price rises 10%
