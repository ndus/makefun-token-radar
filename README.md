# makefun-token-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/ndus/makefun-token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/ndus/makefun-token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Signal Ledger ranks every protocol in the sealed DefiLlama snapshot that records no token: 614 protocols, including all 40 watchlist members. Missing market cap is not proof of token absence. Already-traded tokens appear separately with their recorded market caps.

Implied value is TVL × category multiple × 7d-growth factor × seasoning factor, rounded to whole dollars with a $1 minimum. Category multiples are heuristic assumptions. Seven-day TVL change is normalized from percentage points and bounded; seasoning uses days since listing, which measures tracking history. This is an estimate, not a launch prediction or a traded market cap.

Each protocol carries a category-specific farm playbook with concrete actions, capital and gas budgets, time estimates, and an exit test. Participation may earn nothing. The dashboard displays the model's exported ranks, values, factors and steps without recalculating them. Search, category, chain, minimum-TVL and watchlist filters, sortable columns, and protocol briefs work fully offline.

## Run

Use Node.js with TypeScript type-stripping support (Node 22.18+ or newer).

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <path-to-snapshot.json>
```

Then open `out/dashboard/index.html` in a browser. No server or network connection is needed.

Screenshot modes: `?shot=board`, `?shot=filtered` (watchlist only), and `?shot=detail&slug=<protocol-slug>`.
