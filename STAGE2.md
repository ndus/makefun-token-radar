# Stage 2: Signal Ledger

Replaced the reference dashboard with an original dark navy, lime and cyan radar interface. The board renders all 614 model rows with fixed model ranks, watchlist badges, eight sortable columns, name/slug search, category and chain filters, minimum TVL, watchlist-only selection, and a live result count. Sticky table headings, alternating row backgrounds, signed change colors and monospace numbers support scanning. Null values display as unreported or a dash. Number formatting is deterministic and locale-independent.

Selecting a protocol replaces the board with a full-page brief: snapshot facts, model rank and exact implied dollars, the three exported breakdown factors, the written formula, tracking age, and an ordered list of the model's farm steps. Back preserves filters and sorting. The separate expandable comparables strip lists all 144 already-traded protocols with recorded market caps. Metadata notes show the model version, formula, factor bounds, seasoning parameters and caveat; the header shows the snapshot date and the board shows the watchlist TVL floor.

The page reads window.RADAR through ../data.js before app.js. It does not recalculate implied values, ranks, breakdowns or farm plans. Implied/TVL is a display ratio of the two exported values. Table currency is abbreviated with exact dollar tooltips; details show exact whole dollars. Factors display six decimals with an explicit precision note. No imports, dependencies, remote assets, network calls or locale-based formatters are used.

## Shot modes

- `?shot=board`: full board, initial rank order, no filters.
- `?shot=filtered`: the same board with Watchlist only enabled immediately.
- `?shot=detail&slug=<slug>`: immediately opens the matching protocol brief. An unknown slug leaves the board visible.

All modes use the ordinary interface and retain normal interactions.

## File sizes

| File | Bytes |
| --- | ---: |
| dashboard/index.html | 450 |
| dashboard/app.css | 7,934 |
| dashboard/app.js | 11,657 |
| Total | 20,041 |

## Verification

- `node --check dashboard/app.js`: PASS.
- `grep -n 'http' dashboard/index.html dashboard/app.css dashboard/app.js`: zero matches (PASS).
- Fresh output build with the kit's input/snapshot.json: PASS, 614 ranked protocols, 40 watchlist members, 144 comparables. The environment rejected the requested rm -rf command before execution; old output was moved aside instead, then out was recreated. A final build refreshed the generated dashboard after whitespace cleanup.
- `node tools/check-output.mjs out ~/workspace/makefun/token-radar-kit/token-radar-01-kit/input/snapshot.json`: all 12 checks PASS: board size (1,281,134 bytes), rows array, row count (614), known slugs, unique valid slugs, nonempty names, watchlist coverage (40/40), exact ranks, valid positive values, descending value order, varying values, and valid farm steps.
- Generated dashboard files matched source byte for byte before the final whitespace cleanup; the final build copied the cleaned source again.
- `git diff --check`: PASS.
- Browser smoke testing was attempted but could not start Chromium: the bundled browser requires a host WebGL policy, and the cached browser failed on a sandbox-denied socket operation. No visual or browser-interaction pass is claimed.
- An additional standalone dossier comparison process was killed by the environment; no separate dossier comparison pass is claimed. The normal entry build successfully generated dossier.json.

README.md includes the exact requested badge block, model description and run instructions. main.ts, lib/, vendor/, tools/ and screenshots/ were not changed. Existing screenshots therefore still show stage 1's reference interface; capturing replacement screenshots remains a later stage, outside this session's scope.
