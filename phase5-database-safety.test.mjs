import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

const migrationPaths = [
  './database/migrations/000_phase4_migration_ledger.sql',
  './database/migrations/001_phase4_user_foundation.sql',
  './database/migrations/002_phase4_accounts_transactions.sql',
  './database/migrations/003_phase4_recurring_money.sql',
  './database/migrations/004_phase4_alerts_savings_audit.sql',
  './database/migrations/005_phase5_database_safety.sql',
  './database/migrations/006_phase5_audit_actor_context.sql',
  './database/migrations/007_phase5_financial_settings_archive.sql',
];

async function allMigrationText() {
  return (await Promise.all(migrationPaths.map(read))).join('\n');
}

test('Phase 5 migrations follow the sealed Phase 4 ledger chronologically', async () => {
  const text = await allMigrationText();
  let previous = -1;
  for (const version of ['000', '001', '002', '003', '004', '005', '006', '007']) {
    const position = text.indexOf(`VALUES ('${version}',`);
    assert.ok(position > previous, `migration ${version} must follow the previous migration`);
    previous = position;
  }
});

test('money and percentage fields never use floating point SQL types', async () => {
  const text = await allMigrationText();
  assert.doesNotMatch(text, /\b(real|double\s+precision|float\d*)\b/i);
  for (const fragment of [
    'opening_balance numeric(14,2)',
    'amount numeric(14,2)',
    'target_amount numeric(14,2)',
    'balance numeric(14,2)',
    'minimum_payment numeric(14,2)',
    'interest_rate_apr numeric(7,4)',
    'progress numeric(5,2)',
  ]) {
    assert.ok(text.includes(fragment), `missing numeric money contract: ${fragment}`);
  }
});

test('every current financial record has required user ownership', async () => {
  const phase5 = await read('./database/migrations/005_phase5_database_safety.sql');
  assert.match(phase5, /transaction_categories[\s\S]*ALTER COLUMN user_id SET NOT NULL/);

  const earlier = await allMigrationText();
  for (const table of [
    'accounts','transactions','incomes','bills','bill_provisions','subscriptions',
    'savings_goals','debts','alerts','verified_savings'
  ]) {
    assert.match(earlier, new RegExp(`${table}[\\s\\S]*user_id uuid NOT NULL REFERENCES public\\.users\\(id\\)`));
  }
  assert.match(earlier, /financial_settings[\s\S]*user_id uuid PRIMARY KEY REFERENCES public\.users\(id\)/);
});

test('cross-user references are blocked by ownership-preserving constraints', async () => {
  const phase5 = await read('./database/migrations/005_phase5_database_safety.sql');
  for (const constraint of [
    'transactions_account_owner_fk',
    'transactions_to_account_owner_fk',
    'transactions_category_owner_fk',
    'incomes_account_owner_fk',
    'bills_account_owner_fk',
    'bill_provisions_bill_owner_fk',
    'subscriptions_account_owner_fk',
    'debts_account_owner_fk',
  ]) {
    assert.ok(phase5.includes(constraint), `missing ownership constraint ${constraint}`);
  }
  assert.match(phase5, /alerts_enforce_source_ownership/);
  assert.match(phase5, /alert source must belong to the same user/);
});

test('row-level security fails closed around the current application user', async () => {
  const phase5 = await read('./database/migrations/005_phase5_database_safety.sql');
  assert.match(phase5, /current_app_user_id/);
  assert.match(phase5, /current_setting\('app\.user_id', true\)/);
  assert.match(phase5, /ALTER TABLE public\.users ENABLE ROW LEVEL SECURITY/);
  assert.match(phase5, /FOR SELECT TO genevieve_budget_worker/);
  assert.match(phase5, /FOR INSERT TO genevieve_budget_worker/);
  assert.match(phase5, /FOR UPDATE TO genevieve_budget_worker/);
  assert.doesNotMatch(phase5, /FOR DELETE TO genevieve_budget_worker/);
  assert.match(phase5, /REVOKE DELETE ON/);
});

test('soft archive, timestamps and append-only audit coverage are explicit', async () => {
  const phase5 = await read('./database/migrations/005_phase5_database_safety.sql');
  const phase5Fix = await read('./database/migrations/006_phase5_audit_actor_context.sql');
  const phase5Settings = await read('./database/migrations/007_phase5_financial_settings_archive.sql');

  for (const table of [
    'accounts','transactions','transaction_categories','incomes','bills','bill_provisions',
    'subscriptions','savings_goals','debts','alerts','verified_savings'
  ]) {
    assert.match(phase5, new RegExp(`ALTER TABLE public\\.${table} ADD COLUMN archived_at timestamptz`));
  }
  assert.match(phase5Settings, /ALTER TABLE public\.financial_settings[\s\S]*ADD COLUMN archived_at timestamptz/);
  assert.match(phase5Settings, /financial_settings_archived_at_check/);

  assert.match(phase5, /ALTER TABLE public\.alerts[\s\S]*ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now\(\)/);
  assert.match(phase5, /alerts_set_updated_at/);
  assert.match(phase5, /audit_owned_record_change/);
  assert.match(phase5Fix, /actor IS NULL OR actor NOT IN/);
  assert.match(phase5Fix, /actor := 'system'/);
});

test('Phase 5 has a complete rollback to the sealed Phase 4 boundary', async () => {
  const rollback = await read('./database/rollbacks/phase5_to_phase4.sql');
  assert.match(rollback, /version IN \('007', '006', '005'\)/);
  assert.match(rollback, /financial_settings_archived_at_check/);
  assert.match(rollback, /DISABLE ROW LEVEL SECURITY/);
  assert.match(rollback, /DROP FUNCTION IF EXISTS public\.current_app_user_id/);
  assert.match(rollback, /DROP CONSTRAINT IF EXISTS transactions_account_owner_fk/);
  assert.match(rollback, /DROP COLUMN IF EXISTS archived_at/);
  assert.match(rollback, /ALTER COLUMN user_id DROP NOT NULL/);
});

test('Phase 5 does not build deferred professional tables or app screens', async () => {
  const phase5 = `${await read('./database/migrations/005_phase5_database_safety.sql')}\n${await read('./database/migrations/006_phase5_audit_actor_context.sql')}\n${await read('./database/migrations/007_phase5_financial_settings_archive.sql')}`;
  for (const table of ['organisations','projects','cost_centres','project_budgets','invoices','forecasts']) {
    assert.doesNotMatch(phase5, new RegExp(`CREATE TABLE public\\.${table}`));
  }
  assert.doesNotMatch(phase5, /src\/components|<main|<form|<button/i);
});
