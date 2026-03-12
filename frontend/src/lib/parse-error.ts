// Parses raw Cadence/FCL error messages into user-friendly strings

const FRIENDLY_MESSAGES: [RegExp, string][] = [
  // Contract pre-condition errors
  [/Insufficient balance for first execution/i, "Your vault balance is too low. Deposit FLOW before creating a strategy."],
  [/AutoFi vault not found.*setup_account/i, "Your AutoFi vault hasn't been set up yet. Please reconnect your wallet."],
  [/AutoFi vault not found/i, "AutoFi vault not found. Try disconnecting and reconnecting your wallet."],
  [/Could not borrow FLOW vault/i, "Unable to access your FLOW token vault. Make sure your wallet is set up correctly."],
  [/Invalid strategy type/i, "Invalid strategy type selected. Please try again."],
  [/Strategy not found/i, "This strategy no longer exists. It may have already been cancelled."],
  [/Strategy is not active/i, "This strategy is already paused or cancelled."],
  [/Strategy is not paused/i, "This strategy is already active."],
  [/amount must be greater than 0/i, "Amount must be greater than zero."],
  [/Withdraw amount exceeds vault balance/i, "You're trying to withdraw more FLOW than your vault holds."],
  [/Could not borrow recipient/i, "Invalid recipient address. Make sure it's a valid Flow account."],

  // FCL / wallet errors
  [/user rejected/i, "Transaction cancelled — you declined in your wallet."],
  [/user denied/i, "Transaction cancelled — you declined in your wallet."],
  [/declined/i, "Transaction cancelled — you declined in your wallet."],
  [/popup closed/i, "Wallet popup was closed. Please try again."],
  [/session expired/i, "Your wallet session expired. Please reconnect."],
  [/insufficient funds/i, "Not enough FLOW in your wallet to cover transaction fees."],
  [/sequence number/i, "Transaction conflict — please wait a moment and try again."],
  [/timeout/i, "Transaction timed out. The network may be congested — try again shortly."],
  [/network/i, "Network error. Check your internet connection and try again."],
  [/connection refused/i, "Cannot reach the Flow network. Please try again later."],
];

export function parseFriendlyError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);

  // Try to extract the Cadence pre-condition message first
  const preCondMatch = raw.match(/pre-condition failed:\s*(.+?)(?:\s*-->|$)/);
  if (preCondMatch) {
    const condition = preCondMatch[1].trim();
    // Check if we have a friendly version of this specific condition
    for (const [pattern, friendly] of FRIENDLY_MESSAGES) {
      if (pattern.test(condition)) return friendly;
    }
    // If no mapping, the pre-condition text itself is usually readable
    return condition;
  }

  // Try to extract panic messages
  const panicMatch = raw.match(/panic:\s*(.+?)(?:\s*-->|$)/);
  if (panicMatch) {
    const panicMsg = panicMatch[1].trim();
    for (const [pattern, friendly] of FRIENDLY_MESSAGES) {
      if (pattern.test(panicMsg)) return friendly;
    }
    return panicMsg;
  }

  // Match against the full error string
  for (const [pattern, friendly] of FRIENDLY_MESSAGES) {
    if (pattern.test(raw)) return friendly;
  }

  // Fallback: strip the noisy Cadence stack trace and return something short
  const firstLine = raw.split("\n")[0];
  if (firstLine.length > 120) {
    return "Something went wrong. Please try again.";
  }
  return firstLine || "Something went wrong. Please try again.";
}
