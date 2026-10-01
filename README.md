# shift-bot-spike

Architecture spike for a Telegram bot that monitors a job site for warehouse shifts.

## What's here
- **Monitor loop** (`src/monitor.mjs`): checks at a set interval, deduplicates, alerts on new shifts, caps memory.
- **Filters** (`src/filters.mjs`): location (partial, case-insensitive), min pay, day of week, time slot. AND logic.
- **Telegram UI** (`src/telegram.mjs`): dashboard, settings, filters, and shift alert messages as inline keyboards. Each button press returns the next message (a state machine).
- **Session manager** (`src/session.mjs`): Playwright with warm cookies, fingerprint rotation, human delays, webdriver mask, retry with backoff.
- **14 tests** across three files. No token or credentials needed to run them.

```
npm install
npm test          # 14 tests
npm run check     # same tests, JSON output
npm start         # notes page at http://localhost:3000
```

## Layout
| File | What it does |
|---|---|
| `src/session.mjs` | Playwright session: warm cookies, fingerprints, human delays, retry |
| `src/monitor.mjs` | Check loop with deduplication and memory cap |
| `src/filters.mjs` | Location, pay, day, time slot filters |
| `src/telegram.mjs` | Dashboard, settings, filters, alert messages |
| `tests/*.test.mjs` | 14 tests covering filters, monitor, and Telegram UI |

## Deploy
`npx vercel --prod` or import the repo in Vercel. The notes page runs the tests live from `/api/checks`.

No tokens, credentials, or target site URLs in this repo.
