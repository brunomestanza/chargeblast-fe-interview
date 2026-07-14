# Chargeblast — Payments Dashboard

A Stripe-inspired payments dashboard built with Angular 22 (standalone components, signals, SSR).

**Live demo:** https://chargeblast-fe-interview.vercel.app/

```bash
npm install
npm start    # http://localhost:4200
npm test     # Vitest — 23 spec files
```

## Quality scripts

Playwright starts the dev server on its own, so no script needs a running app.

| Script                | What it checks                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------ |
| `npm run lint`        | ESLint + angular-eslint, including the template accessibility rules. `npm run lint:fix` autofixes.           |
| `npm run format`      | Prettier over the repo. `npm run format:check` for a read-only pass.                                         |
| `npm test`            | Vitest unit specs.                                                                                           |
| `npm run e2e`         | Playwright user flows: table load, search, sort, navigation. `npm run e2e:ui` opens the runner.              |
| `npm run test:a11y`   | axe-core WCAG 2.1 AA scan on the payments list, an open filter popover, empty results, details and settings. |
| `npm run test:visual` | Screenshot regression against committed baselines.                                                           |
| `npm run test:all`    | Everything above, in order.                                                                                  |

Specs live in `e2e/`, split by concern: `functional/`, `a11y/`, `visual/`, with shared helpers in `support/`.

### Visual baselines

Baselines are committed under `e2e/visual/*-snapshots/` and are **platform-specific** (the files are suffixed `-darwin`). A Linux CI run needs its own set, generated once with `npx playwright test --project=visual --update-snapshots` on that platform.

Run `npm run test:visual:update` after an intentional UI change, and review the regenerated PNGs in the diff like any other change. Rendering is pinned to a fixed viewport and a fixed clock — the fixture rebases payment dates onto `Date.now()`, so without a frozen clock the relative timestamps would make every run differ.

## Features

### Payments table

- **Columns:** Payment ID (truncated, copy-to-clipboard), Customer, Amount (currency-formatted), Status badge (Succeeded / Pending / Failed / Refunded), Payment Method (card brand + last4 or ACH / Wallet), Created (with relative-time hover tooltip).
- **Sorting:** multi-column, on all columns.
- **Pagination:** client-side, 25 / 50 / 100 rows per page, with the chosen page size persisted on localStorage.
- **Loading states:** skeleton rows behind a simulated query delay, so filtering and sorting read like a real network-backed table.

### Filters

- Date range with **Today / 7d / 30d / Custom** presets and a custom calendar picker.
- Status — multi-select.
- Payment method — multi-select (Card, ACH, Wallet, and card brands).
- Amount range, normalized to USD via a real **European Central Bank** rate snapshot so a single range filters across every currency.
- Text search across payment ID, customer email and last4.

### Mocked data

640 rows in `public/data/payments.json`, runtime-validated on load: realistic amounts, multiple currencies (USD, EUR, GBP, BRL, JPY…), varied statuses and payment methods. Exchange rates live in `public/data/exchange-rates.json`.

### Nice-to-haves — all six delivered

1. **Sidebar** — Payments, Customers, Balances, Product Catalog, plus an account switcher.
2. **Top nav** — search input and account menu.
3. **Details view** — `/payments/:paymentId` route with activity timeline, payment breakdown, payment method and metadata rails.
4. **URL-synced filters** — every filter and sort lives in canonical query params, so any view is a shareable link.
5. **Column resizing and drag-to-reorder** — persisted to `localStorage` and acessible.
6. **CSV export** of the current view, with a confirmation toast, ignoring pagination.

## Design engineering highlights

**1. Column resizing and drag-to-reorder**
`src/app/payments-table/payments-table.ts` · `payment-columns.ts` · `payments-table-columns.css`

Pointer-driven resize and reorder with clamped widths, keyboard-operable alternatives, and `aria-live` announcements on every column move. Layout survives reloads through `localStorage` and stays in sync across tabs via the `storage` event.

Also, we have clean simple animation, to match Stripe's design.

**2. Custom date-range calendar**
`src/app/payments-table/filters/date-range-filter/`

A hand-built calendar — no date library — with preset shortcuts, range preview, keyboard navigation, and a popover that mirrors Stripe's filter chips. Range parsing and normalization are pure functions with their own tests (`date-range.spec.ts`).

**3. Table micro-interactions**
`src/app/payments-table/payment-row.html` · `payment-row.css` · `payment-skeleton-row.ts`

Truncated IDs with a copy affordance that announces success to screen readers, a relative-time tooltip on Created wired through `aria-describedby`, card brand icons, and skeleton rows that hold row height so nothing shifts while data loads.

## AI context

`docs/` is the source of truth handed to the AI agents working in this repo — intentionally plain Markdown, no tooling:

- `docs/product-requirements.md` — scope, required and optional features.
- `docs/design-reference.md` + `docs/stripe-base-design.png` — the visual target.
- `AGENTS.md` — Angular/TypeScript conventions and the review workflow.

Three files, read directly at the start of every session. Simple enough to stay current, which is the only property that matters for context.

## Stack

Angular 22 · TypeScript · signals · standalone components · SSR (Express) · Vitest · plain CSS · deployed on Vercel.
