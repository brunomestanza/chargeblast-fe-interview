# Chargeblast FE Interview Project

## Product Goal

Implement a clean, familiar fintech payments interface inspired by Stripe's dashboard. The main payments table is the only required surface. Everything else is optional polish intended to demonstrate additional frontend capability.

The implementation will be evaluated primarily on how closely it matches the general aesthetic of the provided Stripe reference.

## Required Scope

### Payments Table

Include these columns:

- Payment ID, truncated with a copy-to-clipboard action
- Customer
- Amount, formatted for its currency
- Status badge: Succeeded, Pending, Failed, or Refunded
- Payment Method, including card brand and last four digits
- Created date and time, with a relative-time hover tooltip

Support these interactions:

- Single-column or multi-column sorting, including at least Created, Amount, and Status
- Client-side pagination with 25, 50, and 100 rows per page

### Filters

Provide these required filters:

- Date range with Today, 7 days, 30 days, and Custom presets
- Multi-select status
- Multi-select payment method, such as Card, ACH, and Wallet
- Amount range
- Text search across payment ID, customer email, and last four digits

### Mocked Data

- Use a local JSON file or in-memory service with approximately 300 to 1,000 rows so pagination, sorting, and filters can be exercised.
- Include realistic value ranges, multiple currencies, varied statuses, customer emails, and payment methods.

## Optional Scope

Optional features, in priority order, are:

1. A left sidebar with Payments, Customers, Balances, and Product Catalog sections
2. A top navigation area with search and an account menu
3. A payment details route with a timeline, events, and metadata
4. Saved filters and URL-synchronized query parameters for shareable views
5. Column resizing and drag-to-reorder
6. CSV export of the current view

## Language Requirement

- All generated documentation, source code, interface copy, and mocked data must be written in English.

## Submission

- Share the project through GitHub.
- Deploy it to Vercel.
- Provide a publicly accessible URL.
