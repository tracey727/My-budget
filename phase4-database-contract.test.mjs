import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPaths = [
  './database/migrations/000_phase4_migration_ledger.sql',
  './database/migrations/001_phase4_user_foundation.sql',
  './database/migrations/002_phase4_accounts_transactions.sql',
  './database/migrations/003_phase4_recurring_money.sql',
  './database/migrations/004_phase4_alerts_savings_audit.sql',
];

const requiredTables = [
  'users',
  'profiles',
  'accounts',
  'transactions',
  'transaction_categories',
  'incomes',
  'bills',
  'bill_provisions',
  'subscriptions',
  'savings_goals',
  'debts',
  'alerts',
  'financial_settings',
  'verified_savings',
  'audit_events',
];

const professionalTables = [
  'organisations',
  'organisation_members',
  'projects',
  'project_members',
  'cost_centres',
  'project_budgets',
  'project_expenses',
  'commitments',
  'invoices',
  'suppliers',
  'forecasts',
];

async function migrationText() {
  return (await Promise.all(migrationPaths.map((path) => readFile(new URL(path, import.meta.url), 'utf8')))).join('\n');
}

test('Phase 4 migrations are locked in chronological order', async () => {
  const text = await migrationText();
  let previous = -1;
  for (const version of ['000', '001', '002', '003', '004']) {
    const position = text.indexOf(`VALUES ('${version}',`);
    assert.ok(position > previous, `migration ${version} must follow the previous migration`);
    previous = position;
  }
});

test('every required Phase 4 table is created exactly once', async () => {
  const text = await migrationText();
  for (const table of requiredTables) {
    const matches = text.match(new RegExp(`CREATE TABLE public\\.${table}\\s*\\(`, 'g')) || [];
    assert.equal(matches.length, 1, `${table} must be created exactly once`);
  }
});

test('professional tables remain deferred', async () => {
  const text = await migrationText();
  for (const table of professionalTables) {
    assert.doesNotMatch(text, new RegExp(`CREATE TABLE public\\.${table}\\s*\\(`), `${table} must not be built in Phase 4`);
  }
});

test('current app data contracts are represented in PostgreSQL', async () => {
  const text = await migrationText();
  for (const fragment of [
    "'bank', 'savings', 'cash', 'credit', 'loan', 'bnpl', 'investment', 'other'",
    "'income', 'expense', 'transfer'",
    "'essential', 'worth', 'unsure', 'waste'",
    "'yes', 'no', 'maybe'",
    "'green', 'yellow', 'red', 'recovery'",
    "'keep', 'cancel', 'maybe', 'another_month', 'pause', 'review_next_charge'",
    'required_weekly_amount',
    'required_fortnightly_amount',
    'protected boolean',
  ]) {
    assert.ok(text.includes(fragment), `missing database contract fragment: ${fragment}`);
  }
});

test('account, transaction and recurring-money relationships are explicit', async () => {
  const text = await migrationText();
  assert.match(text, /accounts[\s\S]*user_id uuid NOT NULL REFERENCES public\.users\(id\)/);
  assert.match(text, /transactions[\s\S]*account_id uuid NOT NULL REFERENCES public\.accounts\(id\)/);
  assert.match(text, /transactions[\s\S]*category_id uuid REFERENCES public\.transaction_categories\(id\)/);
  assert.match(text, /bill_provisions[\s\S]*bill_id uuid NOT NULL UNIQUE REFERENCES public\.bills\(id\)/);
  assert.match(text, /subscriptions[\s\S]*account_id uuid REFERENCES public\.accounts\(id\)/);
  assert.match(text, /debts[\s\S]*account_id uuid REFERENCES public\.accounts\(id\)/);
});

test('audit events are append-only and verified savings remain evidence based', async () => {
  const text = await migrationText();
  assert.match(text, /audit_events_append_only/);
  assert.match(text, /RAISE EXCEPTION 'audit_events are append-only'/);
  assert.match(text, /verified_savings_verified_at_check/);
  assert.match(text, /status <> 'verified' OR verified_at IS NOT NULL/);
});
