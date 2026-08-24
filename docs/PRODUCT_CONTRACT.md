# GENEVIEVE Budget — Product Contract

Locked: 24 August 2026, 12:45 PM AEST (Queensland)
Status: Phase 1 product rules locked; later user-directed data-contract clarifications recorded without changing the core rules

## Product doors

GENEVIEVE Budget uses one shared financial engine with two product doors:

1. GENEVIEVE Budget — Personal
2. GENEVIEVE Budget Professional

Personal users see consumer features only. Professional users unlock business, project, cost-centre, commitment, invoice, revenue, forecasting, profitability and reporting features.

## Core financial rule

A displayed bank balance must never be treated as the user's safe-to-spend amount.

Safe-to-spend calculations must account for protected obligations before presenting money as available.

Shared financial flow:

Accounts → Transactions → Obligations → Budget → Forecast → Alerts → Decisions → Savings

Professional extension:

Projects → Cost Centres → Commitments → Invoices → Revenue → Forecasting → Project Profitability → Business Cash Flow → Reporting

## Personal budgeting methods

### Option 1 — Smooth My Bills / Pay Ahead

Irregular bills are converted into an amount required per user income cycle. The user may physically move the amount to a bills account or reserve it virtually in the app.

Typical obligations include registration, electricity, water, council rates, insurance, servicing, school costs, Christmas, pet expenses, memberships, subscriptions, professional registrations, tax, licences, holidays and medical expenses.

### Option 2 — Hold My Money / Bill Target

The user keeps their money until the bill is due. The app tracks the amount required, time remaining, amount already reserved and required contribution per income cycle.

## GENEVIEVE colour alert system

The same alert system applies to both personal budgeting options and to professional budget/project monitoring:

- Green — on target or ahead.
- Yellow — beginning to fall behind / watch.
- Red — current position or contribution rate will not meet the obligation or budget safely.
- Recovery — show the exact adjustment required to return to target.

Alerts must be explanatory and non-shaming.

## Personal safe-to-spend calculation

Income
minus essential bills
minus bill provisions or bill targets
minus debt commitments
minus protected emergency amount
minus savings commitments
= Actually Safe to Spend

The app must be able to express this as safe this income cycle, safe this week and safe today.

## Expense review

The user-facing review is conversational:

- Yes — needed.
- No — not needed; record for review without shaming.
- Maybe — place in Think About It for later review.

The underlying analytical classification may retain Essential, Worth It, Unsure and Waste where useful.

## Subscription storage and decisions

A subscription record stores:

- Subscription
- Amount
- Frequency
- Next charge
- Account
- Auto-renew
- Usage
- Annual cost
- Decision

Supported decision values are exactly:

- Keep
- Cancel
- Maybe
- Another month
- Pause
- Review next charge

A decision is a planning record and does not itself perform an external cancellation, pause or account change. No subscription may be cancelled or altered without explicit user-authorised action.

## Savings goals

A savings-goal record stores:

- Goal
- Target
- Current amount
- Deadline
- Required weekly amount
- Required fortnightly amount
- Progress
- Protected Yes/No

Progress is derived from current amount versus target. Required weekly and fortnightly amounts are derived from the amount still required and the remaining time to the deadline. Protected savings must not be represented as free cash.

## Professional money rules

Professional users can track multiple businesses, divisions, projects, accounts, cards, expense accounts, budgets, funding pools and cost centres.

Each project can show approved budget, committed expenditure, actual expenditure, forecast expenditure, remaining budget, budget variance, completion percentage, cost-to-complete and projected final project cost.

Professional safe cash is Available Uncommitted Cash, not raw bank balance.

Forecast windows: 7 day, 30 day, 90 day and 12 month.

## Verified Savings Ledger

Potential or modelled savings must remain separate from realised savings.

Verified saving flow:

Baseline → Proposed action → Action completed → Evidence → Later result → Verified saving

## Privacy and financial authority

- Financial data is private by default.
- Trusted-support access must be optional and permission-limited.
- Read access and action authority are separate permissions.
- No account transfer, payment, cancellation, subscription change or other financial action may occur without explicit user authority.
- Internal transfers between a user's own accounts must not be counted as spending.
- Protected bill money, emergency buffers and reserved funds must not be represented as free cash.

## Infrastructure lock

Production architecture target:

- GitHub — source control and deployment source of truth.
- Neon Postgres — persistent application data.
- Cloudflare — production application/API hosting and edge delivery.

The existing Vercel configuration is legacy and is not the target architecture for this production build.

## Chronological build gate

Every implementation step must follow this gate before the next step begins:

1. Add one bounded change.
2. Verify code/config linkage to the previous and next architectural responsibility.
3. Run available build/test/static checks.
4. Verify deployment health for subscriber-facing code.
5. Record the completed change and evidence in the build archive.
6. Record what remains, in chronological order.
7. Do not advance while a material failure remains.
