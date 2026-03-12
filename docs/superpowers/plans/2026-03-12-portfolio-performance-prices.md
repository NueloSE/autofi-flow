# Portfolio, Strategy Performance & Live Prices

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a portfolio page showing multi-token balances with USD values, enhance strategy cards with performance data, and display live FLOW/USD prices throughout the dashboard.

**Architecture:** A shared `flow-prices.ts` module fetches FLOW/USD price from a public API and caches it. A `flow-balances.ts` module queries on-chain token balances (FLOW wallet, AutoFi vault, USDC, stFLOW, DUST). The portfolio page at `/portfolio` displays these with USD conversion. Strategy cards on the dashboard get a performance line showing what was received. The vault balance stat card shows USD equivalent.

**Tech Stack:** Next.js, TypeScript, Tailwind CSS, FCL (Cadence scripts), CoinGecko public API (no key needed)

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `frontend/src/lib/flow-prices.ts` | Create | Fetch + cache FLOW/USD price from CoinGecko |
| `frontend/src/lib/flow-balances.ts` | Create | Query on-chain token balances via FCL scripts |
| `frontend/src/app/(app)/portfolio/page.tsx` | Create | Portfolio page — multi-token breakdown with USD values |
| `frontend/src/components/Sidebar.tsx` | Modify | Add Portfolio nav item |
| `frontend/src/app/(app)/dashboard/page.tsx` | Modify | Add USD values to vault balance, add performance to strategy rows |
| `frontend/src/components/TokenIcon.tsx` | No change | Already supports FLOW, USDC, stFLOW, DUST |

---

## Task 1: Price Fetching Module

**Files:**
- Create: `frontend/src/lib/flow-prices.ts`

- [ ] **Step 1: Create the price module**

```typescript
// Fetches FLOW/USD price from CoinGecko (free, no API key)
// Caches for 60s to avoid rate limits

let cachedPrice: number | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000; // 60 seconds

export async function getFlowUsdPrice(): Promise<number> {
  const now = Date.now();
  if (cachedPrice !== null && now - cacheTimestamp < CACHE_TTL) {
    return cachedPrice;
  }
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=flow&vs_currencies=usd",
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return cachedPrice ?? 0;
    const data = await res.json();
    cachedPrice = data?.flow?.usd ?? 0;
    cacheTimestamp = now;
    return cachedPrice;
  } catch {
    return cachedPrice ?? 0;
  }
}

export function formatUsd(amount: number): string {
  if (amount < 0.01 && amount > 0) return "<$0.01";
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
```

---

## Task 2: On-Chain Balance Queries

**Files:**
- Create: `frontend/src/lib/flow-balances.ts`

- [ ] **Step 1: Create the balances module**

Queries wallet FLOW balance + each token vault balance via Cadence scripts through FCL. Each token needs its own script because they're different contract types.

```typescript
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
  testnet: { /* testnet addresses */ },
};

function addr(contract: string): string {
  return (ADDRESSES[FLOW_NETWORK] || ADDRESSES.mainnet)?.[contract] || "";
}

export interface TokenBalance {
  token: string;
  symbol: string;
  balance: number;
  icon: string; // matches TokenIcon token prop
}

// Query each token balance with individual scripts
// Returns array of { token, symbol, balance, icon }
export async function queryAllBalances(address: string): Promise<TokenBalance[]> {
  const balances: TokenBalance[] = [];

  // Wallet FLOW balance
  const flowBal = await safeQuery(
    `import FlowToken from ${addr("FlowToken")}
     import FungibleToken from ${addr("FungibleToken")}
     access(all) fun main(addr: Address): UFix64 {
       let acct = getAccount(addr)
       let ref = acct.capabilities.borrow<&{FungibleToken.Balance}>(/public/flowTokenBalance)
       return ref?.balance ?? 0.0
     }`,
    address
  );
  balances.push({ token: "Flow", symbol: "FLOW", balance: flowBal, icon: "FLOW" });

  // AutoFi Vault FLOW
  const vaultBal = await safeQuery(
    `import AutoFi from ${addr("AutoFi")}
     access(all) fun main(addr: Address): UFix64 {
       let acct = getAccount(addr)
       let ref = acct.capabilities.borrow<&{AutoFi.VaultPublic}>(AutoFi.VaultPublicPath)
       return ref?.getBalance() ?? 0.0
     }`,
    address
  );
  balances.push({ token: "AutoFi Vault", symbol: "FLOW", balance: vaultBal, icon: "FLOW" });

  // USDCFlow
  const usdcBal = await safeQuery(
    `import FungibleToken from ${addr("FungibleToken")}
     import USDCFlow from ${addr("USDCFlow")}
     access(all) fun main(addr: Address): UFix64 {
       let acct = getAccount(addr)
       let ref = acct.capabilities.borrow<&{FungibleToken.Balance}>(/public/usdcFlowBalance)
       return ref?.balance ?? 0.0
     }`,
    address
  );
  balances.push({ token: "USDC", symbol: "USDC", balance: usdcBal, icon: "USDC" });

  // stFLOW
  const stFlowBal = await safeQuery(
    `import FungibleToken from ${addr("FungibleToken")}
     import stFlowToken from ${addr("stFlowToken")}
     access(all) fun main(addr: Address): UFix64 {
       let acct = getAccount(addr)
       let ref = acct.capabilities.borrow<&{FungibleToken.Balance}>(/public/stFlowTokenBalance)
       return ref?.balance ?? 0.0
     }`,
    address
  );
  balances.push({ token: "stFLOW", symbol: "stFLOW", balance: stFlowBal, icon: "stFLOW" });

  // DUST
  const dustBal = await safeQuery(
    `import FungibleToken from ${addr("FungibleToken")}
     import FlovatarDustToken from ${addr("FlovatarDustToken")}
     access(all) fun main(addr: Address): UFix64 {
       let acct = getAccount(addr)
       let ref = acct.capabilities.borrow<&{FungibleToken.Balance}>(/public/FlovatarDustTokenBalance)
       return ref?.balance ?? 0.0
     }`,
    address
  );
  balances.push({ token: "DUST", symbol: "DUST", balance: dustBal, icon: "DUST" });

  return balances;
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
```

---

## Task 3: Portfolio Page

**Files:**
- Create: `frontend/src/app/(app)/portfolio/page.tsx`

- [ ] **Step 1: Create the portfolio page**

Page shows:
- Total portfolio value in USD at the top
- Token breakdown table: icon, name, balance, USD value, % of portfolio
- AutoFi vault shown as sub-item under FLOW
- Uses same dark theme as dashboard

Key components:
- Fetch balances via `queryAllBalances()` on mount
- Fetch FLOW price via `getFlowUsdPrice()` on mount
- For non-FLOW tokens, estimate USD value using FLOW price (since all are paired with FLOW on IncrementFi). USDC is 1:1 USD. stFLOW ≈ FLOW price. DUST needs a rough estimate or just show token amount.
- Auto-refresh every 30s
- Loading skeleton while fetching

---

## Task 4: Sidebar — Add Portfolio Link

**Files:**
- Modify: `frontend/src/components/Sidebar.tsx`

- [ ] **Step 1: Add Portfolio to NAV_ITEMS**

Add `PieChart` icon import from lucide-react and add nav item:
```typescript
import { LayoutDashboard, Shield, Loader2, PieChart } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/portfolio", icon: PieChart, label: "Portfolio" },
];
```

---

## Task 5: Dashboard — USD Values & Strategy Performance

**Files:**
- Modify: `frontend/src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Add FLOW price fetching to dashboard**

In `DashboardPage`, fetch FLOW price on mount and store in state:
```typescript
const [flowPrice, setFlowPrice] = useState(0);

useEffect(() => {
  getFlowUsdPrice().then(setFlowPrice);
  const iv = setInterval(() => getFlowUsdPrice().then(setFlowPrice), 60_000);
  return () => clearInterval(iv);
}, []);
```

- [ ] **Step 2: Show USD equivalent on Vault Balance stat card**

Update the vault balance StatCard `sub` prop:
```
sub={flowPrice > 0 ? `≈ ${formatUsd(vaultBalance * flowPrice)}` : undefined}
```

- [ ] **Step 3: Show USD equivalent on Total Invested stat card**

Same pattern:
```
sub={flowPrice > 0 ? `≈ ${formatUsd(totalInvested * flowPrice)}` : undefined}
```

- [ ] **Step 4: Add performance line to StrategyRow**

Below the description, show what was received if the strategy has executions:
- For non-FLOW tokens: "Spent X FLOW" (already shown via totalSpent)
- Show USD equivalent: "≈ $Y total"

In the StrategyRow component, pass flowPrice as a prop and display:
```
{flowPrice > 0 && rule.totalSpent > 0 && (
  <span className="text-[10px] font-mono text-zinc-600">
    ≈ {formatUsd(rule.totalSpent * flowPrice)} spent
  </span>
)}
```

---

## Task 6: Build Verification

- [ ] **Step 1: Run build**

```bash
cd frontend && npx next build
```

Expected: Build succeeds with no errors.

- [ ] **Step 2: Manual test checklist**
- Portfolio page loads at /portfolio
- Token balances display correctly
- USD values show next to FLOW amounts on dashboard
- Strategy rows show USD spent
- Sidebar has Portfolio link and it's active when on /portfolio
