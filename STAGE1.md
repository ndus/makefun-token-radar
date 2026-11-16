# Stage 1: model and output pipeline

The board includes all **614** records with `mcap_usd === null`, covers **40/40** watchlist slugs, and exports all **144** market-cap-present records as comparables (including zero market caps). Missing market cap is not proof that a token does not exist; the original symbol and Gecko fields remain available.

## Valuation

`implied = max(1, round(TVL × categoryMultiple × growthFactor × seasoningFactor))`

The kit defines snapshot `change_7d` in percentage points, despite the task's fraction description. Normalize it by dividing by 100; clamp that fraction to [-0.5, 1]. Growth is `1 + fraction × 0.5` below zero and `1 + fraction × 0.35` otherwise, giving 0.75–1.35; null gives 1.

`daysLive = max(0, UTC(as_of) − UTC(listed_at))` in days. Seasoning is `0.85 + 0.35 × min(1, log1p(daysLive / 90) / log1p(1460 / 90))`; null listing dates give 1. Listing age is tracking history, not verified token-free lifetime.

The documented `CATEGORY_MULTIPLES` table covers all 53 snapshot categories. These are heuristic FDV/TVL assumptions, not empirically fitted ratios:

| Group | Multiples | Reason |
| --- | --- | --- |
| Trading venues | 0.35–1.10 | Turnover fees; derivatives require less locked capital |
| Lending and collateral | 0.20–0.45 | Credit spreads and servicing fees |
| Vaults and curators | 0.15–0.30 | A small share of deposit yield |
| Staking and restaking | 0.10–0.18 | Operator fees, not gross staking balances |
| Bridges and wrappers | 0.04–0.08 | Assets mainly represent backing |
| Reserves, RWA, synthetic assets, CEX | 0.10–0.30 | Limited token accrual and redemption risk |
| Infrastructure | 0.25–0.50 | Usage fees; TVL is a weak proxy |
| Other services | 0.08–0.35 | Conservative fee-capture assumptions |
| Unknown/null | 0.10 | Conservative fallback |

Ordering is implied value descending, TVL descending, then slug in code-unit order. Rank is assigned afterward. Each row exports its full-precision `breakdown` with `multiple`, `growthFactor`, `seasoningFactor`, and `daysLive`.

## Farm plans and data contract

Six steps per row: separate-wallet hygiene, three category actions, weekly monitoring, and official announcement tracking. Playbooks: DEX swaps/liquidity; lending deposits/small responsible borrows/repayment; bridge outward/use/return transfers; staking/receipt-token DeFi/redemption; small derivatives trades/closing; vault inspection/deposit/redemption; and a documented-service fallback. Names, supported chain selection, and TVL-tier capital caps ($25/$75/$150) personalize plans. Gas estimates distinguish Ethereum ($5–25), selected inexpensive chains ($0.01–0.50), Bitcoin ($1–10), and other networks ($0.10–3); bridge routes add destination costs. Estimates are budgets, not live quotes. Plans promise no rewards.

`out/data.js` assigns `window.RADAR`, loaded by `dashboard/index.html` via `../data.js`. It includes complete rows with farm steps and breakdowns, comparables, watchlist array and membership object, snapshot date, floor, counts, and model metadata. `live` and row age/multiplier aliases support existing table fields.

**Stage 2 remains necessary:** the untouched starter page still recomputes its old formula and plans and uses overly categorical token labels. Its existing screenshots are also unchanged. This stage verifies the model/output pipeline, not final dashboard consistency or full competition eligibility.

## Verification

Executed the requested entry command twice, with `MAKEFUN_OUTPUT_DIR=out` and `out2`. Local Node is **24.22.1**; the implementation uses Node 22-compatible standard-library APIs and erasable TypeScript, but was not directly run on Node 22.

Checker output:

```text
PASS board size <= 8 MiB: 1281134 bytes
PASS rows array
PASS 100-4000 rows: 614 rows
PASS known slugs
PASS unique valid slugs
PASS nonempty names
PASS watchlist coverage: 40/40
PASS ranks exactly 1..N
PASS positive integer values within cap
PASS values non-increasing by rank
PASS values not all equal
PASS 3-12 farm steps, 20-600 trimmed characters
```

Both `diff -u out/board.json out2/board.json` and `diff -u out/data.js out2/data.js` returned 0 with no output. Additional checks passed for category coverage, null inputs, growth/seasoning boundaries, UTC ages, slug tie ordering, missing-watchlist rejection, and zero-market-cap comparables. Steps measured 193–349 characters. A deliberately malformed board failed the checker for ranks and farm steps with exit code 1. The dossier matches `buildDossier(out, {text_max_bytes: 65536})` byte for byte; copied dashboard/screenshots match their sources. `git diff --check` passed, and vendor/dashboard/screenshots have no changes. Generated `out/` and `out2/` are ignored and uncommitted.
