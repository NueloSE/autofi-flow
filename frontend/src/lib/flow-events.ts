// Queries AutoFi contract events from the Flow Access REST API
// Events are the on-chain source of truth for all activity history

import type { VaultHistory } from "@/store/useAutoFiStore";

const FLOW_NETWORK = process.env.NEXT_PUBLIC_FLOW_NETWORK || "testnet";

const ACCESS_NODES: Record<string, string> = {
  mainnet: "https://rest-mainnet.onflow.org",
  testnet: "https://rest-testnet.onflow.org",
};
const AUTOFI_ADDRESSES: Record<string, string> = {
  mainnet: "3002afb10b4ba66d",
  testnet: "902e1baab3b18cac",
};

const ACCESS_NODE = ACCESS_NODES[FLOW_NETWORK] || ACCESS_NODES.testnet;
const AUTOFI_ADDRESS = AUTOFI_ADDRESSES[FLOW_NETWORK] || AUTOFI_ADDRESSES.testnet;
const MAX_BLOCK_RANGE = 249; // API limit is 250 exclusive
const MAX_SCAN_BLOCKS = 5000; // Cap scan to prevent too many requests (~20 batches per type)

// Event type identifiers
const EVENT_TYPES = [
  `A.${AUTOFI_ADDRESS}.AutoFi.FundsDeposited`,
  `A.${AUTOFI_ADDRESS}.AutoFi.FundsWithdrawn`,
  `A.${AUTOFI_ADDRESS}.AutoFi.StrategyCreated`,
  `A.${AUTOFI_ADDRESS}.AutoFi.StrategyCancelled`,
  `A.${AUTOFI_ADDRESS}.AutoFi.StrategyPaused`,
  `A.${AUTOFI_ADDRESS}.AutoFi.StrategyResumed`,
  `A.${AUTOFI_ADDRESS}.AutoFi.StrategyExecuted`,
  `A.${AUTOFI_ADDRESS}.AutoFi.EmergencyStopActivated`,
  `A.${AUTOFI_ADDRESS}.AutoFi.EmergencyStopDeactivated`,
] as const;

// Persisted keys — network-specific so testnet/mainnet don't mix
const LAST_BLOCK_KEY = `autofi-last-event-block-${FLOW_NETWORK}`;
const HISTORY_KEY = `autofi-event-history-${FLOW_NETWORK}`;

interface FlowEventBlock {
  block_id: string;
  block_height: string;
  block_timestamp: string;
  events?: RawFlowEvent[];
}

interface RawFlowEvent {
  type: string;
  transaction_id: string;
  transaction_index: string;
  event_index: string;
  payload: string; // base64-encoded JSON
}

interface ParsedFlowEvent {
  type: string;
  transaction_id: string;
  event_index: string;
  fields: Record<string, string>;
  _blockTimestamp: string;
}

async function getLatestBlockHeight(): Promise<number> {
  const res = await fetch(`${ACCESS_NODE}/v1/blocks?height=sealed`);
  if (!res.ok) throw new Error("Failed to fetch latest block");
  const data = await res.json();
  return parseInt(data[0].header.height, 10);
}

function decodeEventPayload(base64Payload: string): Record<string, string> {
  try {
    const json = atob(base64Payload);
    const parsed = JSON.parse(json);
    const fields: Record<string, string> = {};
    const fieldList = parsed?.value?.fields || [];
    for (const f of fieldList) {
      const name = f?.name || "";
      // Handle nested value structures: {value: {value: "0x...", type: "Address"}, name: "owner"}
      let val = f?.value?.value;
      if (val !== undefined && val !== null) {
        fields[name] = String(val);
      }
    }
    return fields;
  } catch {
    return {};
  }
}

async function queryEvents(eventType: string, startHeight: number, endHeight: number): Promise<ParsedFlowEvent[]> {
  const events: ParsedFlowEvent[] = [];
  let cursor = startHeight;

  while (cursor <= endHeight) {
    const batchEnd = Math.min(cursor + MAX_BLOCK_RANGE, endHeight);
    const url = `${ACCESS_NODE}/v1/events?type=${eventType}&start_height=${cursor}&end_height=${batchEnd}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`Event query failed for ${eventType} at ${cursor}-${batchEnd}:`, res.status);
      cursor = batchEnd + 1;
      continue;
    }
    const blocks: FlowEventBlock[] = await res.json();
    for (const block of blocks) {
      if (block.events && block.events.length > 0) {
        for (const rawEvt of block.events) {
          events.push({
            type: rawEvt.type,
            transaction_id: rawEvt.transaction_id,
            event_index: rawEvt.event_index,
            fields: decodeEventPayload(rawEvt.payload),
            _blockTimestamp: block.block_timestamp,
          });
        }
      }
    }
    cursor = batchEnd + 1;
  }

  return events;
}

// Strategy type raw value to name
const STRATEGY_TYPE_NAMES: Record<string, string> = {
  "0": "DCA Invest",
  "1": "Savings Transfer",
  "2": "Subscription Payment",
  "3": "Price Dip Buy",
  "4": "Profit Sell",
};

function eventToHistoryEntry(
  evt: ParsedFlowEvent,
  userAddress: string,
): VaultHistory | null {
  const f = evt.fields;

  const owner = f.owner || "";
  // Filter events to only this user — normalize address comparison
  const normalAddr = userAddress.replace("0x", "").toLowerCase();
  const normalOwner = owner.replace("0x", "").toLowerCase();
  if (normalOwner && normalOwner !== normalAddr) {
    return null;
  }

  const timestamp = evt._blockTimestamp ? new Date(evt._blockTimestamp) : new Date();
  const txId = evt.transaction_id;
  const shortTx = txId ? `${txId.slice(0, 8)}` : "";

  const eventName = evt.type.split(".").pop() || "";

  switch (eventName) {
    case "FundsDeposited": {
      const amount = parseFloat(f.amount) || 0;
      return {
        id: `evt-deposit-${txId}-${evt.event_index}`,
        type: "deposit",
        amount,
        timestamp,
        description: `Deposited ${amount.toFixed(2)} FLOW`,
      };
    }
    case "FundsWithdrawn": {
      const amount = parseFloat(f.amount) || 0;
      return {
        id: `evt-withdraw-${txId}-${evt.event_index}`,
        type: "withdraw",
        amount: -amount,
        timestamp,
        description: `Withdrew ${amount.toFixed(2)} FLOW`,
      };
    }
    case "StrategyCreated": {
      const strategyID = f.strategyID || "";
      const strategyType = f.strategyType || "0";
      const token = f.token || "";
      const amount = parseFloat(f.amount) || 0;
      const typeName = STRATEGY_TYPE_NAMES[strategyType] || "Strategy";
      return {
        id: `evt-created-${txId}-${evt.event_index}`,
        type: "strategy_created",
        amount: 0,
        timestamp,
        description: `Created ${typeName}: ${amount} ${token} (#${strategyID})`,
      };
    }
    case "StrategyCancelled": {
      const strategyID = f.strategyID || "";
      return {
        id: `evt-cancelled-${txId}-${evt.event_index}`,
        type: "strategy_cancelled",
        amount: 0,
        timestamp,
        description: `Cancelled strategy #${strategyID}`,
      };
    }
    case "StrategyPaused": {
      const strategyID = f.strategyID || "";
      return {
        id: `evt-paused-${txId}-${evt.event_index}`,
        type: "strategy_cancelled",
        amount: 0,
        timestamp,
        description: `Paused strategy #${strategyID}`,
      };
    }
    case "StrategyResumed": {
      const strategyID = f.strategyID || "";
      return {
        id: `evt-resumed-${txId}-${evt.event_index}`,
        type: "strategy_created",
        amount: 0,
        timestamp,
        description: `Resumed strategy #${strategyID}`,
      };
    }
    case "StrategyExecuted": {
      const strategyID = f.strategyID || "";
      const amountSpent = parseFloat(f.amountSpent) || 0;
      const execCount = f.executionCount || "";
      return {
        id: `evt-exec-${txId}-${evt.event_index}`,
        type: "rule_execution",
        amount: -amountSpent,
        timestamp,
        description: `Strategy #${strategyID} execution #${execCount} (${shortTx})`,
      };
    }
    case "EmergencyStopActivated":
      return {
        id: `evt-estop-${txId}-${evt.event_index}`,
        type: "emergency_stop",
        amount: 0,
        timestamp,
        description: "Emergency stop activated",
      };
    case "EmergencyStopDeactivated":
      return {
        id: `evt-eresume-${txId}-${evt.event_index}`,
        type: "resume_all",
        amount: 0,
        timestamp,
        description: "All strategies resumed",
      };
    default:
      return null;
  }
}

/**
 * Fetches all AutoFi events for a user from the Flow Access API.
 * Uses localStorage to remember last scanned block for incremental fetching.
 */
export async function fetchEventHistory(userAddress: string): Promise<VaultHistory[]> {
  const latestBlock = await getLatestBlockHeight();

  // Determine start block
  const savedBlock = localStorage.getItem(LAST_BLOCK_KEY);
  const previousEntries: VaultHistory[] = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  let startBlock: number;

  if (savedBlock) {
    startBlock = parseInt(savedBlock, 10) + 1;
  } else {
    // First load: scan recent blocks only
    startBlock = latestBlock - MAX_SCAN_BLOCKS;
  }

  if (startBlock > latestBlock) {
    return previousEntries;
  }

  // Safety cap — if gap grew too large (e.g. tab was open for hours), limit scan
  if (latestBlock - startBlock > MAX_SCAN_BLOCKS) {
    startBlock = latestBlock - MAX_SCAN_BLOCKS;
  }

  // Query all event types in parallel across the block range
  const allEvents = await Promise.all(
    EVENT_TYPES.map((type) => queryEvents(type, startBlock, latestBlock)),
  );

  const flatEvents = allEvents.flat();

  // Convert to history entries, filtering by user
  const newEntries: VaultHistory[] = [];
  for (const evt of flatEvents) {
    const entry = eventToHistoryEntry(evt, userAddress);
    if (entry) newEntries.push(entry);
  }

  // Merge with previous entries, deduplicate by id
  const existingIds = new Set(previousEntries.map((e) => e.id));
  const merged = [...previousEntries];
  for (const entry of newEntries) {
    if (!existingIds.has(entry.id)) {
      merged.push(entry);
    }
  }

  // Sort newest first
  merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Persist
  localStorage.setItem(LAST_BLOCK_KEY, latestBlock.toString());
  localStorage.setItem(HISTORY_KEY, JSON.stringify(merged.slice(0, 100)));

  return merged;
}

/**
 * Fetches events from a single transaction result and adds them to history.
 * Call this right after a successful tx for instant UI update.
 */
export async function addEventsFromTx(txId: string, userAddress: string): Promise<VaultHistory[]> {
  try {
    const res = await fetch(`${ACCESS_NODE}/v1/transaction_results/${txId}`);
    if (!res.ok) return getCachedHistory();
    const result = await res.json();
    const events: RawFlowEvent[] = result.events || [];
    const previousEntries: VaultHistory[] = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    const existingIds = new Set(previousEntries.map((e) => e.id));

    const autoFiPrefix = `A.${AUTOFI_ADDRESS}.AutoFi.`;
    for (const rawEvt of events) {
      if (!rawEvt.type.startsWith(autoFiPrefix)) continue;
      const parsed: ParsedFlowEvent = {
        type: rawEvt.type,
        transaction_id: rawEvt.transaction_id,
        event_index: rawEvt.event_index,
        fields: decodeEventPayload(rawEvt.payload),
        _blockTimestamp: new Date().toISOString(),
      };
      const entry = eventToHistoryEntry(parsed, userAddress);
      if (entry && !existingIds.has(entry.id)) {
        previousEntries.unshift(entry);
      }
    }

    previousEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    localStorage.setItem(HISTORY_KEY, JSON.stringify(previousEntries.slice(0, 100)));
    return previousEntries;
  } catch {
    return getCachedHistory();
  }
}

function getCachedHistory(): VaultHistory[] {
  return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
}

/**
 * Resets the event cache so next fetch does a full scan.
 */
export function resetEventCache() {
  localStorage.removeItem(LAST_BLOCK_KEY);
  localStorage.removeItem(HISTORY_KEY);
}
