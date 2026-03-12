// Queries on-chain token balances for a user across all supported tokens

import fcl from "@/lib/fcl";

const FLOW_NETWORK = process.env.NEXT_PUBLIC_FLOW_NETWORK || "testnet";

const ADDRESSES: Record<string, Record<string, string>> = {
  mainnet: {
    FungibleToken: "0xf233dcee88fe0abe",
    FlowToken: "0x1654653399040a61",
    AutoFi: "0x3002afb10b4ba66d",
    USDCFlow: "0xf1ab99c82dee3526",
    stFlowToken: "0xd6f80565193ad727",
    FlovatarDustToken: "0x921ea449dffec68a",
  },
  testnet: {
    FungibleToken: "0x9a0766d93b6608b7",
    FlowToken: "0x7e60df042a9c0868",
    AutoFi: "0x902e1baab3b18cac",
    USDCFlow: "0x64adf39cbc354fcb",
    stFlowToken: "0x64adf39cbc354fcb",
    FlovatarDustToken: "0x64adf39cbc354fcb",
  },
};

function addr(contract: string): string {
  return (ADDRESSES[FLOW_NETWORK] || ADDRESSES.mainnet)?.[contract] || "";
}

export interface TokenBalance {
  token: string;
  symbol: string;
  balance: number;
  icon: string;
  isVault?: boolean;
}

async function safeQuery(cadence: string, address: string): Promise<number> {
  try {
    const result = await fcl.query({
      cadence,
      args: (arg: typeof fcl.arg, t: typeof fcl.t) => [arg(address, t.Address)],
    });
    return parseFloat(result) || 0;
  } catch {
    return 0;
  }
}

// Try multiple public paths — some tokens only publish a Receiver cap (which also has balance in Cadence)
async function safeQueryMultiPath(
  fungibleTokenAddr: string,
  publicPaths: string[],
  address: string
): Promise<number> {
  for (const path of publicPaths) {
    const result = await safeQuery(
      `import FungibleToken from ${fungibleTokenAddr}
       access(all) fun main(addr: Address): UFix64 {
         let acct = getAccount(addr)
         let ref = acct.capabilities.borrow<&{FungibleToken.Balance}>(${path})
         return ref?.balance ?? 0.0
       }`,
      address
    );
    if (result > 0) return result;
  }
  return 0;
}

export async function queryAllBalances(address: string): Promise<TokenBalance[]> {
  const [flowBal, vaultBal, usdcBal, stFlowBal, dustBal] = await Promise.all([
    // Wallet FLOW balance
    safeQuery(
      `import FlowToken from ${addr("FlowToken")}
       import FungibleToken from ${addr("FungibleToken")}
       access(all) fun main(addr: Address): UFix64 {
         let acct = getAccount(addr)
         let ref = acct.capabilities.borrow<&{FungibleToken.Balance}>(/public/flowTokenBalance)
         return ref?.balance ?? 0.0
       }`,
      address
    ),
    // AutoFi Vault FLOW
    safeQuery(
      `import AutoFi from ${addr("AutoFi")}
       access(all) fun main(addr: Address): UFix64 {
         let acct = getAccount(addr)
         let ref = acct.capabilities.borrow<&{AutoFi.VaultPublic}>(AutoFi.VaultPublicPath)
         return ref?.getBalance() ?? 0.0
       }`,
      address
    ),
    // USDCFlow — try balance path, then fall back to receiver path
    safeQueryMultiPath(
      addr("FungibleToken"),
      ["/public/usdcFlowBalance", "/public/usdcFlowReceiver"],
      address
    ),
    // stFLOW — try balance path, then fall back to receiver path
    safeQueryMultiPath(
      addr("FungibleToken"),
      ["/public/stFlowTokenBalance", "/public/stFlowTokenReceiver"],
      address
    ),
    // DUST — try balance path, then fall back to receiver path
    safeQueryMultiPath(
      addr("FungibleToken"),
      ["/public/FlovatarDustTokenBalance", "/public/FlovatarDustTokenReceiver"],
      address
    ),
  ]);

  return [
    { token: "Flow Wallet", symbol: "FLOW", balance: flowBal, icon: "FLOW" },
    { token: "AutoFi Vault", symbol: "FLOW", balance: vaultBal, icon: "FLOW", isVault: true },
    { token: "USDC", symbol: "USDC", balance: usdcBal, icon: "USDC" },
    { token: "stFLOW", symbol: "stFLOW", balance: stFlowBal, icon: "stFLOW" },
    { token: "DUST", symbol: "DUST", balance: dustBal, icon: "DUST" },
  ];
}
