// Flow transaction/script helpers via FCL
// When isDemoMode is true, the dashboard uses Zustand store directly.
// When connected to a real wallet, these functions send real Cadence transactions.

import fcl from "@/lib/fcl";

// ──────────────────────────────────────────────
// Contract address config (per network)
// ──────────────────────────────────────────────

const FLOW_NETWORK = process.env.NEXT_PUBLIC_FLOW_NETWORK || "testnet";

const ADDRESSES: Record<string, Record<string, string>> = {
  testnet: {
    AutoFi: "0x902e1baab3b18cac",
    FungibleToken: "0x9a0766d93b6608b7",
    FlowToken: "0x7e60df042a9c0868",
  },
  emulator: {
    AutoFi: "0xf8d6e0586b0a20c7",
    FungibleToken: "0xee82856bf20e2aa6",
    FlowToken: "0x0ae53cb6e3f42a79",
  },
};

function addr(contract: string): string {
  const network = ADDRESSES[FLOW_NETWORK] || ADDRESSES.testnet;
  return network[contract] || "";
}

// ──────────────────────────────────────────────
// CDC helper — replaces __CONTRACT__ placeholders
// ──────────────────────────────────────────────

function cdc(template: string): string {
  return template
    .replace(/__AUTOFI__/g, addr("AutoFi"))
    .replace(/__FUNGIBLE_TOKEN__/g, addr("FungibleToken"))
    .replace(/__FLOW_TOKEN__/g, addr("FlowToken"));
}

function toUFix64(num: number): string {
  return num.toFixed(8);
}

// ──────────────────────────────────────────────
// Transaction templates
// ──────────────────────────────────────────────

const SETUP_ACCOUNT = `
import AutoFi from __AUTOFI__

transaction {
    prepare(signer: auth(Storage, Capabilities) &Account) {
        if signer.storage.borrow<&AutoFi.Vault>(from: AutoFi.VaultStoragePath) != nil {
            return
        }
        let vault <- AutoFi.createVault()
        signer.storage.save(<-vault, to: AutoFi.VaultStoragePath)
        let cap = signer.capabilities.storage.issue<&{AutoFi.VaultPublic}>(AutoFi.VaultStoragePath)
        signer.capabilities.publish(cap, at: AutoFi.VaultPublicPath)
    }
}
`;

const DEPOSIT = `
import FungibleToken from __FUNGIBLE_TOKEN__
import FlowToken from __FLOW_TOKEN__
import AutoFi from __AUTOFI__

transaction(amount: UFix64) {
    prepare(signer: auth(Storage, BorrowValue) &Account) {
        let flowVault = signer.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(
            from: /storage/flowTokenVault
        ) ?? panic("Could not borrow FLOW vault")
        let deposit <- flowVault.withdraw(amount: amount)
        let autoFiVault = signer.storage.borrow<auth(AutoFi.Owner) &AutoFi.Vault>(
            from: AutoFi.VaultStoragePath
        ) ?? panic("AutoFi vault not found. Run setup_account first.")
        autoFiVault.deposit(from: <-deposit)
    }
}
`;

const WITHDRAW = `
import FungibleToken from __FUNGIBLE_TOKEN__
import FlowToken from __FLOW_TOKEN__
import AutoFi from __AUTOFI__

transaction(amount: UFix64) {
    prepare(signer: auth(Storage, BorrowValue) &Account) {
        let autoFiVault = signer.storage.borrow<auth(AutoFi.Owner) &AutoFi.Vault>(
            from: AutoFi.VaultStoragePath
        ) ?? panic("AutoFi vault not found.")
        let withdrawn <- autoFiVault.withdraw(amount: amount)
        let flowVault = signer.storage.borrow<&FlowToken.Vault>(
            from: /storage/flowTokenVault
        ) ?? panic("Could not borrow FLOW vault")
        flowVault.deposit(from: <-withdrawn)
    }
}
`;

const WITHDRAW_TO = `
import FungibleToken from __FUNGIBLE_TOKEN__
import FlowToken from __FLOW_TOKEN__
import AutoFi from __AUTOFI__

transaction(amount: UFix64, recipient: Address) {
    prepare(signer: auth(Storage, BorrowValue) &Account) {
        let autoFiVault = signer.storage.borrow<auth(AutoFi.Owner) &AutoFi.Vault>(
            from: AutoFi.VaultStoragePath
        ) ?? panic("AutoFi vault not found.")
        let withdrawn <- autoFiVault.withdraw(amount: amount)
        let recipientAccount = getAccount(recipient)
        let receiverRef = recipientAccount.capabilities.borrow<&{FungibleToken.Receiver}>(
            /public/flowTokenReceiver
        ) ?? panic("Could not borrow recipient's FLOW receiver. Make sure the address is correct.")
        receiverRef.deposit(from: <-withdrawn)
    }
}
`;

const CREATE_STRATEGY = `
import AutoFi from __AUTOFI__

transaction(
    strategyTypeRaw: UInt8,
    token: String,
    amountPerExecution: UFix64,
    intervalSeconds: UInt64,
    maxMonthlySpend: UFix64,
    slippageTolerance: UFix64,
    description: String
) {
    prepare(signer: auth(Storage, BorrowValue) &Account) {
        let vault = signer.storage.borrow<auth(AutoFi.Owner) &AutoFi.Vault>(
            from: AutoFi.VaultStoragePath
        ) ?? panic("AutoFi vault not found. Run setup_account first.")
        let strategyType = AutoFi.StrategyType(rawValue: strategyTypeRaw)
            ?? panic("Invalid strategy type")
        let _ = vault.createStrategy(
            strategyType: strategyType,
            token: token,
            amountPerExecution: amountPerExecution,
            intervalSeconds: intervalSeconds,
            maxMonthlySpend: maxMonthlySpend,
            slippageTolerance: slippageTolerance,
            description: description
        )
    }
}
`;

const CANCEL_STRATEGY = `
import AutoFi from __AUTOFI__

transaction(strategyID: UInt64) {
    prepare(signer: auth(Storage, BorrowValue) &Account) {
        let vault = signer.storage.borrow<auth(AutoFi.Owner) &AutoFi.Vault>(
            from: AutoFi.VaultStoragePath
        ) ?? panic("AutoFi vault not found.")
        vault.cancelStrategy(id: strategyID)
    }
}
`;

const PAUSE_STRATEGY = `
import AutoFi from __AUTOFI__

transaction(strategyID: UInt64) {
    prepare(signer: auth(Storage, BorrowValue) &Account) {
        let vault = signer.storage.borrow<auth(AutoFi.Owner) &AutoFi.Vault>(
            from: AutoFi.VaultStoragePath
        ) ?? panic("AutoFi vault not found.")
        vault.pauseStrategy(id: strategyID)
    }
}
`;

const RESUME_STRATEGY = `
import AutoFi from __AUTOFI__

transaction(strategyID: UInt64) {
    prepare(signer: auth(Storage, BorrowValue) &Account) {
        let vault = signer.storage.borrow<auth(AutoFi.Owner) &AutoFi.Vault>(
            from: AutoFi.VaultStoragePath
        ) ?? panic("AutoFi vault not found.")
        vault.resumeStrategy(id: strategyID)
    }
}
`;

const EMERGENCY_STOP = `
import AutoFi from __AUTOFI__

transaction {
    prepare(signer: auth(Storage, BorrowValue) &Account) {
        let vault = signer.storage.borrow<auth(AutoFi.Owner) &AutoFi.Vault>(
            from: AutoFi.VaultStoragePath
        ) ?? panic("AutoFi vault not found.")
        vault.emergencyStop()
    }
}
`;

const RESUME_ALL = `
import AutoFi from __AUTOFI__

transaction {
    prepare(signer: auth(Storage, BorrowValue) &Account) {
        let vault = signer.storage.borrow<auth(AutoFi.Owner) &AutoFi.Vault>(
            from: AutoFi.VaultStoragePath
        ) ?? panic("AutoFi vault not found.")
        vault.resumeAll()
    }
}
`;

// ──────────────────────────────────────────────
// Script templates (graceful — return defaults if no vault)
// ──────────────────────────────────────────────

const GET_VAULT_BALANCE = `
import AutoFi from __AUTOFI__

access(all) fun main(address: Address): UFix64 {
    let account = getAccount(address)
    let vaultRef = account.capabilities.borrow<&{AutoFi.VaultPublic}>(AutoFi.VaultPublicPath)
    if vaultRef == nil { return 0.0 }
    return vaultRef!.getBalance()
}
`;

const GET_STRATEGIES = `
import AutoFi from __AUTOFI__

access(all) fun main(address: Address): [AutoFi.Strategy] {
    let account = getAccount(address)
    let vaultRef = account.capabilities.borrow<&{AutoFi.VaultPublic}>(AutoFi.VaultPublicPath)
    if vaultRef == nil { return [] }
    return vaultRef!.getStrategies()
}
`;

const GET_EXECUTION_HISTORY = `
import AutoFi from __AUTOFI__

access(all) fun main(address: Address): [AutoFi.ExecutionRecord] {
    let account = getAccount(address)
    let vaultRef = account.capabilities.borrow<&{AutoFi.VaultPublic}>(AutoFi.VaultPublicPath)
    if vaultRef == nil { return [] }
    return vaultRef!.getExecutionLog()
}
`;

const IS_EMERGENCY_STOPPED = `
import AutoFi from __AUTOFI__

access(all) fun main(address: Address): Bool {
    let account = getAccount(address)
    let vaultRef = account.capabilities.borrow<&{AutoFi.VaultPublic}>(AutoFi.VaultPublicPath)
    if vaultRef == nil { return false }
    return vaultRef!.isEmergencyStopped()
}
`;

// ──────────────────────────────────────────────
// Strategy type mapping (frontend string → Cadence UInt8)
// ──────────────────────────────────────────────

const STRATEGY_TYPE_MAP: Record<string, number> = {
  DCA_INVEST: 0,
  SAVINGS_TRANSFER: 1,
  SUBSCRIPTION_PAYMENT: 2,
  PRICE_DIP_BUY: 3,
  PROFIT_SELL: 4,
};

// ──────────────────────────────────────────────
// Public API — Transactions
// ──────────────────────────────────────────────

export async function txSetupAccount(): Promise<string> {
  const txId = await fcl.mutate({
    cadence: cdc(SETUP_ACCOUNT),
    limit: 100,
  });
  await fcl.tx(txId).onceSealed();
  return txId;
}

export async function txDeposit(amount: number): Promise<string> {
  const txId = await fcl.mutate({
    cadence: cdc(DEPOSIT),
    args: (arg: typeof fcl.arg, t: typeof fcl.t) => [
      arg(toUFix64(amount), t.UFix64),
    ],
    limit: 100,
  });
  await fcl.tx(txId).onceSealed();
  return txId;
}

export async function txWithdraw(amount: number): Promise<string> {
  const txId = await fcl.mutate({
    cadence: cdc(WITHDRAW),
    args: (arg: typeof fcl.arg, t: typeof fcl.t) => [
      arg(toUFix64(amount), t.UFix64),
    ],
    limit: 100,
  });
  await fcl.tx(txId).onceSealed();
  return txId;
}

export async function txWithdrawTo(amount: number, recipient: string): Promise<string> {
  const txId = await fcl.mutate({
    cadence: cdc(WITHDRAW_TO),
    args: (arg: typeof fcl.arg, t: typeof fcl.t) => [
      arg(toUFix64(amount), t.UFix64),
      arg(recipient, t.Address),
    ],
    limit: 100,
  });
  await fcl.tx(txId).onceSealed();
  return txId;
}

export async function txCreateStrategy(params: {
  strategyType: string;
  token: string;
  amountPerExecution: number;
  intervalSeconds: number;
  maxMonthlySpend: number;
  slippageTolerance: number;
  description: string;
}): Promise<string> {
  const typeRaw = STRATEGY_TYPE_MAP[params.strategyType] ?? 0;
  const txId = await fcl.mutate({
    cadence: cdc(CREATE_STRATEGY),
    args: (arg: typeof fcl.arg, t: typeof fcl.t) => [
      arg(typeRaw.toString(), t.UInt8),
      arg(params.token, t.String),
      arg(toUFix64(params.amountPerExecution), t.UFix64),
      arg(params.intervalSeconds.toString(), t.UInt64),
      arg(toUFix64(params.maxMonthlySpend), t.UFix64),
      arg(toUFix64(params.slippageTolerance), t.UFix64),
      arg(params.description, t.String),
    ],
    limit: 200,
  });
  await fcl.tx(txId).onceSealed();
  return txId;
}

export async function txCancelStrategy(strategyID: number): Promise<string> {
  const txId = await fcl.mutate({
    cadence: cdc(CANCEL_STRATEGY),
    args: (arg: typeof fcl.arg, t: typeof fcl.t) => [
      arg(strategyID.toString(), t.UInt64),
    ],
    limit: 100,
  });
  await fcl.tx(txId).onceSealed();
  return txId;
}

export async function txPauseStrategy(strategyID: number): Promise<string> {
  const txId = await fcl.mutate({
    cadence: cdc(PAUSE_STRATEGY),
    args: (arg: typeof fcl.arg, t: typeof fcl.t) => [
      arg(strategyID.toString(), t.UInt64),
    ],
    limit: 100,
  });
  await fcl.tx(txId).onceSealed();
  return txId;
}

export async function txResumeStrategy(strategyID: number): Promise<string> {
  const txId = await fcl.mutate({
    cadence: cdc(RESUME_STRATEGY),
    args: (arg: typeof fcl.arg, t: typeof fcl.t) => [
      arg(strategyID.toString(), t.UInt64),
    ],
    limit: 100,
  });
  await fcl.tx(txId).onceSealed();
  return txId;
}

export async function txEmergencyStop(): Promise<string> {
  const txId = await fcl.mutate({
    cadence: cdc(EMERGENCY_STOP),
    limit: 100,
  });
  await fcl.tx(txId).onceSealed();
  return txId;
}

export async function txResumeAll(): Promise<string> {
  const txId = await fcl.mutate({
    cadence: cdc(RESUME_ALL),
    limit: 100,
  });
  await fcl.tx(txId).onceSealed();
  return txId;
}

// ──────────────────────────────────────────────
// Public API — Scripts (read-only queries)
// ──────────────────────────────────────────────

export async function queryVaultBalance(address: string): Promise<number> {
  const result = await fcl.query({
    cadence: cdc(GET_VAULT_BALANCE),
    args: (arg: typeof fcl.arg, t: typeof fcl.t) => [
      arg(address, t.Address),
    ],
  });
  return parseFloat(result) || 0;
}

export interface OnChainStrategy {
  id: string;
  strategyType: { rawValue: string };
  token: string;
  amountPerExecution: string;
  intervalSeconds: string;
  maxMonthlySpend: string;
  slippageTolerance: string;
  createdAt: string;
  description: string;
  status: { rawValue: string };
  nextExecution: string;
  executionCount: string;
  totalSpent: string;
  monthlySpent: string;
}

export async function queryStrategies(address: string): Promise<OnChainStrategy[]> {
  const result = await fcl.query({
    cadence: cdc(GET_STRATEGIES),
    args: (arg: typeof fcl.arg, t: typeof fcl.t) => [
      arg(address, t.Address),
    ],
  });
  return result || [];
}

export interface OnChainExecution {
  strategyID: string;
  amount: string;
  timestamp: string;
  executionNumber: string;
}

export async function queryExecutionHistory(address: string): Promise<OnChainExecution[]> {
  const result = await fcl.query({
    cadence: cdc(GET_EXECUTION_HISTORY),
    args: (arg: typeof fcl.arg, t: typeof fcl.t) => [
      arg(address, t.Address),
    ],
  });
  return result || [];
}

export async function queryIsEmergencyStopped(address: string): Promise<boolean> {
  const result = await fcl.query({
    cadence: cdc(IS_EMERGENCY_STOPPED),
    args: (arg: typeof fcl.arg, t: typeof fcl.t) => [
      arg(address, t.Address),
    ],
  });
  return result === true;
}
