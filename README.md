# Genevieve App — Money Tracker

**Active independent local-first personal money product in the GENEVIEVE budget family.**

This repository is not a duplicate of `budget-calculator-personal` and is not Revenue Rescue. It preserves its own local-first money-management architecture and feature line.

## Family role

- **My-budget** — active local-first personal money tracker with progressive personal-finance and continuity features.
- **budget-calculator-personal** — separate modern personal-only Budget Calculator product.
- **Revenue Rescue** — separate protected commercial product; not part of this repository.
- **Budget Traveller / Wayfarer** — separate travel-budget products.

## Active platform

- Source control: GitHub
- Edge/application hosting: Cloudflare
- Persistent production data where enabled: Neon Postgres
- Local-first/device operation remains part of the product design
- Vercel is legacy and is not an active deployment target; the obsolete `vercel.json` has been removed.

See `docs/PRODUCT_CONTRACT.md` and the build archive for the detailed production and phase boundaries.

## Core money functions

- Track money spent, received and moved between accounts
- Accounts, savings, cash, credit cards and loans
- Essential / Worth it / Unsure / Waste review
- Recurring bills and subscriptions
- Subscription Rescue and annual cost visibility
- Safe-to-spend and payday planning
- Savings goals
- Forecasting and early-warning views
- Debt and commitment tracking
- Household continuity tools
- Export / backup / recovery support
- Offline-friendly operation

## Open development work — preserve

Two open PRs were inspected during repository consolidation:

- **PR #50 — Professional entities and project accounting.** This is real new functionality and must not be discarded as cleanup.
- **PR #33 — Phase 6 authentication runtime.** Its own PR description says it is a test vehicle / incomplete and must not be merged until the missing authentication integration is completed and re-audited.

Cleanup work must not merge, delete or rewrite those branches merely to reduce branch count.

## Data and safety

The product has evolved beyond the original browser-only prototype. Follow the current product contract, database migrations and Cloudflare/Neon deployment documents rather than old Vercel-era assumptions.

Do not add direct bank credentials to client-side code. Preserve fail-closed identity/data controls as the later phases are completed.
