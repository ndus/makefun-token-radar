import assert from 'node:assert/strict';

export type Protocol = {
  slug: string; name: string; category: string | null; chains: string[];
  tvl_usd: number; change_7d: number | null; mcap_usd: number | null;
  listed_at: string | null; gecko_id: string | null; symbol: string | null;
};
export type Snapshot = {
  as_of: string; source: string; floor_usd: number;
  protocols: Protocol[]; watchlist: string[];
};
export type Breakdown = {
  multiple: number; growthFactor: number; seasoningFactor: number; daysLive: number | null;
};
export type RankedProtocol = Protocol & {
  rank: number; implied_value_usd: number; breakdown: Breakdown; farm_steps: string[];
  age_days: number | null; growth_multiplier: number; maturity_multiplier: number;
};

// Heuristic FDV/TVL assumptions, not fitted market statistics. TVL is not revenue;
// these discounts reflect how much of a category's assets might support token value.
export const CATEGORY_MULTIPLES: Record<string, number> = {
  // Trading venues monetize turnover; derivatives need less locked capital per fee dollar.
  Dexs: 0.65, Derivatives: 1.1, Options: 0.8, 'Interest Rate Derivatives': 0.75,
  'Prediction Market': 0.9, 'NFT Marketplace': 0.7, 'OTC Marketplace': 0.35,
  // Credit spreads support moderate multiples; collateral services capture smaller fees.
  Lending: 0.45, 'Uncollateralized Lending': 0.3, CDP: 0.3, 'CDP Manager': 0.2,
  'Collateral Management': 0.2, 'Collateral Markets': 0.25,
  // Vault managers earn a fraction of deposit yield, with an extra leverage discount.
  Yield: 0.25, 'Yield Aggregator': 0.3, 'Risk Curators': 0.2,
  'Onchain Capital Allocator': 0.25, 'Liquidity Manager': 0.3,
  'Leveraged Farming': 0.2, 'Options Vault': 0.25, Farm: 0.15, Indexes: 0.2,
  // Staking balances pass rewards through; only the operator fee supports token value.
  'Liquid Staking': 0.12, 'Liquid Restaking': 0.15, Restaking: 0.18,
  'Restaked BTC': 0.1, 'Staking Pool': 0.1,
  // Bridge and wrapped-asset TVL mostly represents backing, not productive fee capital.
  Bridge: 0.08, 'Canonical Bridge': 0.04, 'Cross Chain Bridge': 0.08,
  'Anchor BTC': 0.06, 'Decentralized BTC': 0.08, 'Stablecoin Wrapper': 0.05,
  // Reserves and real-world assets have limited direct token accrual and redemption risk.
  RWA: 0.15, 'Stablecoin Issuer': 0.2, 'Algo-Stables': 0.1,
  'Dual-Token Stablecoin': 0.15, 'Reserve Currency': 0.12, Synthetics: 0.3,
  'Basis Trading': 0.18, CeDeFi: 0.15, CEX: 0.1,
  // Infrastructure can charge for usage, but TVL is a weak proxy for that activity.
  Chain: 0.5, Payments: 0.35, Privacy: 0.4, 'Crypto Card Issuer': 0.25,
  'AI Agents': 0.35, 'Decentralized AI': 0.4,
  // Smaller service categories receive conservative multiples for uncertain fee capture.
  Insurance: 0.3, Launchpad: 0.35, 'Governance Incentives': 0.15,
  'Token Locker': 0.08, DOR: 0.1,
};
export const DEFAULT_MULTIPLE = 0.1;
export function categoryMultiple(category: string | null): number {
  return category !== null && Object.hasOwn(CATEGORY_MULTIPLES, category)
    ? CATEGORY_MULTIPLES[category] : DEFAULT_MULTIPLE;
}

/** Accepts a fractional seven-day change: -0.5 => 0.75, 0 => 1, +1 => 1.35. */
export function growthFactor(change: number | null): number {
  if (change === null) return 1;
  const bounded = Math.max(-0.5, Math.min(1, change));
  return 1 + bounded * (bounded < 0 ? 0.5 : 0.35);
}
function utcDay(date: string): number {
  assert(/^\d{4}-\d{2}-\d{2}$/.test(date), `Invalid UTC day: ${date}`);
  const ms = Date.parse(date + 'T00:00:00.000Z');
  assert(Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === date, `Invalid date: ${date}`);
  return ms / 86_400_000;
}
export function modelBreakdown(protocol: Protocol, asOf: string): Breakdown {
  const daysLive = protocol.listed_at === null ? null : Math.max(0, utcDay(asOf) - utcDay(protocol.listed_at));
  return {
    multiple: categoryMultiple(protocol.category),
    // The sealed kit stores percentage points (e.g. -10 means -10%), not fractions.
    growthFactor: growthFactor(protocol.change_7d === null ? null : protocol.change_7d / 100),
    seasoningFactor: daysLive === null ? 1 : 0.85 + 0.35 * Math.min(1, Math.log1p(daysLive / 90) / Math.log1p(1460 / 90)),
    daysLive,
  };
}

// Three category-specific actions sit between wallet setup and ongoing oversight.
// Placeholders refer only to the current protocol's snapshot and its TVL tier.
const PLAYBOOKS: Record<string, string[]> = {
  dex: [
    'On {name}, swap $10 of a supported asset on {chain}; inspect the quote and set slippage at 0.5% or less.',
    'Add up to ${capital} across a liquid pair on {name}; use a wide range if concentrated liquidity is required and record the deposit ratio.',
    'Remove $5 of liquidity from {name} to test the exit; inspect impermanent loss and pool volume before keeping the remainder.',
  ],
  lending: [
    'Supply up to ${capital} of an accepted asset to {name} on {chain}; check utilization, collateral rules and the withdrawal queue first.',
    'If borrowing is enabled on {name}, borrow at most 10% of supplied value; keep a health factor above 2 and avoid recursive leverage.',
    'Repay the small {name} loan with accrued interest and withdraw $5 to test access; keep only a deposit you can afford to lose.',
  ],
  bridge: [
    'Use {name} to bridge a real $10 transfer from {chain} to a documented supported destination; verify both token contracts and finality.',
    'After settlement, use the received asset for a needed payment or swap; keep total {name} route exposure below ${capital}.',
    'Bridge the remaining test funds back through {name} when supported; check return fees, destination gas and any challenge period before signing.',
  ],
  staking: [
    'Stake up to ${capital} of a supported asset with {name} on {chain}; check validator concentration, slashing exposure and the exit delay.',
    'Hold the {name} receipt token; if officially supported, place at most $10 into a DeFi pool without borrowing against it.',
    'Test a small receipt redemption on {name}; compare the secondary-market discount with the unstaking queue before deciding where to hold.',
  ],
  perps: [
    'Deposit at most ${capital} as margin on {name} on {chain}; read funding, liquidation and withdrawal rules before placing any order.',
    'If suitable, open a $10 notional position on {name} with isolated margin and at most 1x leverage; set a stop and review execution fees.',
    'Close the test trade on {name} and withdraw unused margin; log realized loss and funding, and never trade merely to manufacture volume.',
  ],
  vault: [
    'Inspect a {name} vault on {chain}: read its asset mandate, manager permissions, fees and exit queue before selecting a supported deposit asset.',
    'Deposit up to ${capital} into the selected {name} vault; record share price and underlying exposures rather than relying on headline APY.',
    'Redeem $5 of {name} vault shares to test the queue; review allocation changes and withdraw if its risk exceeds your original plan.',
  ],
  general: [
    'Read {name} documentation for its supported service on {chain}; verify eligibility and supported assets before allocating up to ${capital}.',
    'Use the smallest documented {name} action that serves a real need, such as a $10 payment or purchase; skip it if access or terms are unclear.',
    'Test the documented {name} exit or settlement flow with $5 where possible; record custody and redemption limits before increasing exposure.',
  ],
};
const CATEGORY_PLAYBOOK: Record<string, string> = {};
for (const [book, categories] of Object.entries({
  dex: ['Dexs', 'Liquidity Manager'],
  lending: ['Lending', 'Uncollateralized Lending', 'CDP', 'CDP Manager', 'Collateral Markets', 'Collateral Management'],
  bridge: ['Bridge', 'Canonical Bridge', 'Cross Chain Bridge', 'Anchor BTC', 'Decentralized BTC'],
  staking: ['Liquid Staking', 'Liquid Restaking', 'Restaking', 'Restaked BTC', 'Staking Pool'],
  perps: ['Derivatives', 'Perps', 'Perpetuals', 'Perps/Dexs', 'Options', 'Interest Rate Derivatives'],
  vault: ['Yield', 'Yield Aggregator', 'Risk Curators', 'Onchain Capital Allocator', 'Options Vault', 'Leveraged Farming', 'Farm', 'Indexes'],
})) for (const category of categories) CATEGORY_PLAYBOOK[category] = book;

const LOW_FEE_CHAINS = new Set(['Base', 'Arbitrum', 'Optimism', 'Linea', 'Scroll', 'zkSync Era', 'Zora', 'Ink', 'Unichain', 'World Chain', 'Solana', 'Sui', 'Polygon']);
function gasBudget(chain: string): string {
  if (chain === 'Ethereum') return '$5-25';
  if (LOW_FEE_CHAINS.has(chain)) return '$0.01-0.50';
  if (chain === 'Bitcoin') return '$1-10';
  return '$0.10-3';
}
export function farmingPlan(protocol: Protocol): string[] {
  const chain = protocol.chains.find(c => LOW_FEE_CHAINS.has(c)) ?? protocol.chains[0] ?? 'the documented network';
  const capital = protocol.tvl_usd < 50_000_000 ? 25 : protocol.tvl_usd < 500_000_000 ? 75 : 150;
  const tier = protocol.tvl_usd < 50_000_000 ? 'under-$50M TVL' : protocol.tvl_usd < 500_000_000 ? '$50M-$500M TVL' : '$500M+ TVL';
  const book = CATEGORY_PLAYBOOK[protocol.category ?? ''] ?? 'general';
  const bridge = book === 'bridge';
  const fee = bridge ? `${gasBudget(chain)} source gas plus $1-30 destination/bridge fees` : `${gasBudget(chain)} gas per transaction`;
  const interpolate = (s: string) => s.replaceAll('{name}', protocol.name).replaceAll('{chain}', chain).replaceAll('{capital}', String(capital));
  const result = [
    `Create a separate farming wallet for ${protocol.name} on ${chain}; never share keys or seed words, and verify the official app before signing. Cost: $0 setup; reserve ${gasBudget(chain)} gas per transaction. Time: 10 minutes setup.`,
    ...PLAYBOOKS[book].map(action => `${interpolate(action)} Cost: up to $${capital} reusable capital; ${fee}; allow $0-2 for service fees, plus possible losses. Time: 15 minutes setup; settlement may take days.`),
    `Review ${protocol.name} weekly: ${book === 'lending' ? 'check health factor and borrow APR' : book === 'vault' ? 'check vault allocations and redemption liquidity' : book === 'dex' ? 'check pool range and impermanent loss' : book === 'staking' ? 'check receipt discount and validator status' : book === 'perps' ? 'check funding and close unwanted exposure' : book === 'bridge' ? 'check both transfer receipts and outstanding settlements' : 'check custody terms and completed activity'}. Its ${tier} tier sets a $${capital} test cap, not a safety rating. Cost: $0 to review; ${gasBudget(chain)} gas per adjustment. Time: 10 minutes per week.`,
    `Track ${protocol.name}'s official documentation and verified announcement channels for points or token news; bookmark genuine links and reject unsolicited claim messages. Participation may earn nothing. Cost: $0. Time: 5 minutes setup and 5 minutes per week.`,
  ];
  for (const step of result) assert(step.length >= 60 && step.length <= 400, `${protocol.slug}: farm step length ${step.length}`);
  return result;
}

export function readSnapshot(json: string): Snapshot {
  const snapshot: Snapshot = JSON.parse(json);
  assert(snapshot && Array.isArray(snapshot.protocols) && Array.isArray(snapshot.watchlist), 'Snapshot arrays missing');
  utcDay(snapshot.as_of);
  assert(Number.isSafeInteger(snapshot.floor_usd) && snapshot.floor_usd > 0, 'Invalid floor');
  const seen = new Set<string>();
  for (const p of snapshot.protocols) {
    assert(typeof p.slug === 'string' && p.slug.length > 0 && !seen.has(p.slug), 'Invalid or duplicate slug');
    seen.add(p.slug);
    assert(typeof p.name === 'string' && p.name.trim().length > 0, `${p.slug}: missing name`);
    assert(p.category === null || typeof p.category === 'string', `${p.slug}: invalid category`);
    assert(Array.isArray(p.chains) && p.chains.every(c => typeof c === 'string'), `${p.slug}: invalid chains`);
    assert(Number.isFinite(p.tvl_usd) && p.tvl_usd >= 0, `${p.slug}: invalid TVL`);
    for (const key of ['change_7d', 'mcap_usd'] as const) assert(p[key] === null || (typeof p[key] === 'number' && Number.isFinite(p[key])), `${p.slug}: invalid ${key}`);
    if (p.listed_at !== null) utcDay(p.listed_at);
  }
  assert(snapshot.watchlist.every(slug => typeof slug === 'string' && seen.has(slug)), 'Unknown watchlist slug');
  return snapshot;
}
const lexical = (a: string, b: string) => a === b ? 0 : a < b ? -1 : 1;
export function buildBoard(snapshot: Snapshot): RankedProtocol[] {
  const rows = snapshot.protocols.filter(p => p.mcap_usd === null).map(p => {
    const breakdown = modelBreakdown(p, snapshot.as_of);
    const implied = Math.max(1, Math.round(p.tvl_usd * breakdown.multiple * breakdown.growthFactor * breakdown.seasoningFactor));
    assert(Number.isSafeInteger(implied) && implied <= 100_000_000_000_000, `${p.slug}: value outside gate limits`);
    return { ...p, rank: 0, implied_value_usd: implied, breakdown, farm_steps: farmingPlan(p),
      age_days: breakdown.daysLive, growth_multiplier: breakdown.growthFactor, maturity_multiplier: breakdown.seasoningFactor };
  });
  rows.sort((a, b) => b.implied_value_usd - a.implied_value_usd || b.tvl_usd - a.tvl_usd || lexical(a.slug, b.slug));
  rows.forEach((row, index) => { row.rank = index + 1; });
  const included = new Set(rows.map(row => row.slug));
  assert(included.size === rows.length, 'Each protocol must appear only once');
  assert(snapshot.watchlist.every(slug => included.has(slug)), 'Board must include every watchlist protocol');
  return rows;
}
export function comparables(snapshot: Snapshot): Protocol[] {
  return snapshot.protocols.filter(p => p.mcap_usd !== null)
    .sort((a, b) => b.mcap_usd! - a.mcap_usd! || b.tvl_usd - a.tvl_usd || lexical(a.slug, b.slug));
}
export function dashboardData(snapshot: Snapshot, rows: RankedProtocol[]) {
  const live = comparables(snapshot);
  return {
    as_of: snapshot.as_of, source: snapshot.source, floor_usd: snapshot.floor_usd,
    model_version: 'category-seasoning-1',
    model: { category_multiples: CATEGORY_MULTIPLES, default_multiple: DEFAULT_MULTIPLE,
      growth_input_unit: 'percentage points; divided by 100 before growthFactor',
      growth_fraction_bounds: [-0.5, 1], growth_factor_bounds: [0.75, 1.35],
      seasoning_days_scale: 90, seasoning_days_cap: 1460, seasoning_factor_bounds: [0.85, 1.2],
      formula: 'round(TVL * categoryMultiple * growthFactor * seasoningFactor), minimum $1',
      caveat: 'Missing market cap is not proof of no token. Listing age is tracking history, not verified token-free lifetime. Multiples are assumptions, not fitted comparables.' },
    rows, comparables: live, live,
    watchlist: [...snapshot.watchlist], watchlist_set: Object.fromEntries(snapshot.watchlist.map(slug => [slug, true])),
    watchlist_size: snapshot.watchlist.length, board_size: rows.length, live_size: live.length,
    early_size: rows.filter(row => row.tvl_usd < snapshot.floor_usd).length,
  };
}
