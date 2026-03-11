// Flow transaction helpers — sends Cadence transactions/scripts via FCL
// In demo mode, falls back to local Zustand store operations

import fcl from "@/lib/fcl";

// ──────────────────────────────────────────────
// Contract address config (per network)
// ──────────────────────────────────────────────

const FLOW_NETWORK = process.env.NEXT_PUBLIC_FLOW_NETWORK || "testnet";

const ADDRESSES: Record<string, Record<string, string>> = {
  testnet: {
    AutoFi: "YOUR_TESTNET_ADDRESS", // TODO: replace after deploy
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
// Transaction CDC templates (inline for Next.js)
// ──────────────────────────────────────────────

const SETUP_ACCOUNT = `
import AutoFi from ${() => addr("AutoFi")}

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
import FungibleToken from ${() => addr("FungibleToken")}
import FlowToken from ${() => addr("FlowToken")}
import AutoFi from ${() => addr("AutoFi")}

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
import FungibleToken from ${() => addr("FungibleToken")}
import FlowToken from ${() => addr("FlowToken")}
import AutoFi from ${() => addr("AutoFi")}

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

const CREATE_STRATEGY = `
import AutoFi from ${() => addr("AutoFi")}

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
import AutoFi from ${() => addr("AutoFi")}

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
import AutoFi from ${() => addr("AutoFi")}

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
import AutoFi from ${() => addr("AutoFi")}

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
import AutoFi from ${() => addr("AutoFi")}

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
import AutoFi from ${() => addr("AutoFi")}

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
// Script CDC templates
// ──────────────────────────────────────────────

const GET_VAULT_BALANCE = `
import AutoFi from ${() => addr("AutoFi")}

access(all) fun main(address: Address): UFix64 {
    let account = getAccount(address)
    let vaultRef = account.capabilities.borrow<&{AutoFi.VaultPublic}>(AutoFi.VaultPublicPath)
        ?? panic("AutoFi vault not found for this address")
    return vaultRef.getBalance()
}
`;

const GET_STRATEGIES = `
import AutoFi from ${() => addr("AutoFi")}

access(all) fun main(address: Address): [AutoFi.Strategy] {
    let account = getAccount(address)
    let vaultRef = account.capabilities.borrow<&{AutoFi.VaultPublic}>(AutoFi.VaultPublicPath)
        ?? panic("AutoFi vault not found for this address")
    return vaultRef.getStrategies()
}
`;

const GET_EXECUTION_HISTORY = `
import AutoFi from ${() => addr("AutoFi")}

access(all) fun main(address: Address): [AutoFi.ExecutionRecord] {
    let account = getAccount(address)
    let vaultRef = account.capabilities.borrow<&{AutoFi.VaultPublic}>(AutoFi.VaultPublicPath)
        ?? panic("AutoFi vault not found for this address")
    return vaultRef.getExecutionLog()
}
`;

// ──────────────────────────────────────────────
// Helper: resolve CDC template (replace address closures)
// ──────────────────────────────────────────────

function cdc(template: string): string {
  // Replace ${() => addr("X")} patterns with actual addresses
  return template.replace(/\$\{.*?addr\("(\w+)"\).*?\}/g, (_, contract) => addr(contract));
}

// ──────────────────────────────────────────────
// Format helpers
// ──────────────────────────────────────────────

function toUFix64(num: number): string {
  return num.toFixed(8);
}

// ──────────────────────────────────────────────
// Public API — Transactions
// ──────────────────────────────────────────────

export async function setupAccount(): Promise<string> {
  const txId = await fcl.mutate({
    cadence: cdc(SETUP_ACCOUNT),
    limit: 100,
  });
  await fcl.tx(txId).onceSealed();
  return txId;
}

export async function deposit(amount: number): Promise<string> {
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

export async function withdraw(amount: number): Promise<string> {
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

export async function createStrategy(params: {
  strategyType: number;
  token: string;
  amountPerExecution: number;
  intervalSeconds: number;
  maxMonthlySpend: number;
  slippageTolerance: number;
  description: string;
}): Promise<string> {
  const txId = await fcl.mutate({
    cadence: cdc(CREATE_STRATEGY),
    args: (arg: typeof fcl.arg, t: typeof fcl.t) => [
      arg(params.strategyType.toString(), t.UInt8),
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

export async function cancelStrategy(strategyID: number): Promise<string> {
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

export async function pauseStrategy(strategyID: number): Promise<string> {
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

export async function resumeStrategy(strategyID: number): Promise<string> {
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

export async function emergencyStop(): Promise<string> {
  const txId = await fcl.mutate({
    cadence: cdc(EMERGENCY_STOP),
    limit: 100,
  });
  await fcl.tx(txId).onceSealed();
  return txId;
}

export async function resumeAll(): Promise<string> {
  const txId = await fcl.mutate({
    cadence: cdc(RESUME_ALL),
    limit: 100,
  });
  await fcl.tx(txId).onceSealed();
  return txId;
}

// ──────────────────────────────────────────────
// Public API — Scripts (read-only)
// ──────────────────────────────────────────────

export async function getVaultBalance(address: string): Promise<number> {
  const result = await fcl.query({
    cadence: cdc(GET_VAULT_BALANCE),
    args: (arg: typeof fcl.arg, t: typeof fcl.t) => [
      arg(address, t.Address),
    ],
  });
  return parseFloat(result);
}

export async function getStrategies(address: string): Promise<unknown[]> {
  return await fcl.query({
    cadence: cdc(GET_STRATEGIES),
    args: (arg: typeof fcl.arg, t: typeof fcl.t) => [
      arg(address, t.Address),
    ],
  });
}

export async function getExecutionHistory(address: string): Promise<unknown[]> {
  return await fcl.query({
    cadence: cdc(GET_EXECUTION_HISTORY),
    args: (arg: typeof fcl.arg, t: typeof fcl.t) => [
      arg(address, t.Address),
    ],
  });
}
