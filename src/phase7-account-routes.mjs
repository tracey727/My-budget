import { withAuthenticatedUserTransaction } from './worker-phase6-sealed.mjs';

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACCOUNT_TYPES = new Set(['bank', 'savings', 'cash', 'credit', 'loan', 'bnpl', 'investment', 'other']);
const LIABILITY_TYPES = new Set(['credit', 'loan', 'bnpl']);
const LIQUID_TYPES = new Set(['bank', 'savings', 'cash']);
const INCOME_CYCLES = new Set(['weekly', 'fortnightly', 'monthly', 'irregular']);
const BUDGETING_METHODS = new Set(['smooth', 'target', 'mixed']);

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

function apiResult(result) {
  if (!result?.ok) return json({ ok: false, error: { code: result?.code || 'database_unavailable' } }, result?.status || 503);
  return json({ ok: true, ...result.data });
}

function roundMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.round(number * 100) / 100;
}

function safeText(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export function normalizePhase7SyncPayload(value) {
  if (!value || typeof value !== 'object' || value.fullSnapshot !== true || !Array.isArray(value.accounts)) return null;
  if (value.accounts.length > 250) return null;

  const accounts = [];
  const seenClientIds = new Set();
  for (const raw of value.accounts) {
    const clientId = safeText(raw?.id, 200);
    const name = safeText(raw?.name, 200);
    const type = safeText(raw?.type, 40);
    const balance = roundMoney(raw?.balance);
    const serverId = typeof raw?.serverId === 'string' && UUID_PATTERN.test(raw.serverId) ? raw.serverId : null;
    if (!clientId || seenClientIds.has(clientId) || !name || !ACCOUNT_TYPES.has(type) || balance === null || balance < 0) return null;
    seenClientIds.add(clientId);
    accounts.push({ clientId, serverId, name, type, balance });
  }

  const settingsSource = value.settings && typeof value.settings === 'object' ? value.settings : {};
  const emergencyBufferAmount = roundMoney(settingsSource.emergencyBufferAmount ?? 0);
  if (emergencyBufferAmount === null || emergencyBufferAmount < 0) return null;
  const incomeCycle = INCOME_CYCLES.has(settingsSource.incomeCycle) ? settingsSource.incomeCycle : null;
  const budgetingMethod = BUDGETING_METHODS.has(settingsSource.budgetingMethod) ? settingsSource.budgetingMethod : null;

  return {
    accounts,
    settings: { emergencyBufferAmount, incomeCycle, budgetingMethod },
  };
}

function rowMoney(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : 0;
}

function balanceSummary(accounts, protectedRows) {
  let assets = 0;
  let debts = 0;
  let liquid = 0;
  for (const account of accounts) {
    const balance = rowMoney(account.opening_balance);
    if (LIABILITY_TYPES.has(account.account_type)) debts += Math.max(0, balance);
    else {
      assets += balance;
      if (LIQUID_TYPES.has(account.account_type)) liquid += balance;
    }
  }
  const emergency = rowMoney(protectedRows?.emergency_buffer_amount);
  const billReserved = rowMoney(protectedRows?.bill_reserved);
  const protectedSavings = rowMoney(protectedRows?.protected_savings);
  const protectedReserved = Math.round((emergency + billReserved + protectedSavings) * 100) / 100;
  return {
    assetBalance: Math.round(assets * 100) / 100,
    debtBalance: Math.round(debts * 100) / 100,
    liquidBalance: Math.round(liquid * 100) / 100,
    protectedReserved,
    spendableBalance: Math.round(Math.max(0, liquid - protectedReserved) * 100) / 100,
    components: { emergencyReserved: emergency, billReserved, protectedSavings },
  };
}

export async function readPhase7AccountState(client, ownerUserId) {
  const accountResult = await client.query(
    `SELECT id, name, account_type, currency_code, opening_balance, archived, archived_at, created_at, updated_at
     FROM public.accounts
     WHERE user_id = $1 AND user_id = public.current_app_user_id() AND archived_at IS NULL
     ORDER BY created_at, id`,
    [ownerUserId],
  );
  const settingsResult = await client.query(
    `SELECT income_cycle, budgeting_method, emergency_buffer_amount
     FROM public.financial_settings
     WHERE user_id = $1 AND user_id = public.current_app_user_id()
     LIMIT 1`,
    [ownerUserId],
  );
  const protectedResult = await client.query(
    `SELECT
       COALESCE((SELECT emergency_buffer_amount FROM public.financial_settings WHERE user_id = $1), 0)::text AS emergency_buffer_amount,
       COALESCE((SELECT SUM(bp.amount_reserved) FROM public.bill_provisions bp WHERE bp.user_id = $1 AND bp.archived_at IS NULL), 0)::text AS bill_reserved,
       COALESCE((SELECT SUM(sg.current_amount) FROM public.savings_goals sg WHERE sg.user_id = $1 AND sg.protected = true AND sg.archived_at IS NULL), 0)::text AS protected_savings`,
    [ownerUserId],
  );

  const rows = accountResult.rows || [];
  const accounts = rows.map((row) => ({
    id: row.id,
    serverId: row.id,
    name: row.name,
    type: row.account_type,
    currencyCode: row.currency_code,
    balance: rowMoney(row.opening_balance),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
  const settings = settingsResult.rows?.[0] || {};
  return {
    accounts,
    settings: {
      incomeCycle: settings.income_cycle || 'fortnightly',
      budgetingMethod: settings.budgeting_method || 'mixed',
      emergencyBufferAmount: rowMoney(settings.emergency_buffer_amount),
    },
    summary: balanceSummary(rows, protectedResult.rows?.[0] || {}),
    persistence: 'neon',
    migration: '014',
  };
}

async function updateOrInsertAccount(client, ownerUserId, account) {
  if (account.serverId) {
    const update = await client.query(
      `UPDATE public.accounts
       SET name = $3, account_type = $4, opening_balance = $5::numeric, archived = false, archived_at = NULL
       WHERE user_id = $1 AND id = $2 AND user_id = public.current_app_user_id()
       RETURNING id`,
      [ownerUserId, account.serverId, account.name, account.type, account.balance],
    );
    if (update.rows?.[0]?.id) return update.rows[0].id;
  }

  const insert = await client.query(
    `INSERT INTO public.accounts (user_id, name, account_type, opening_balance)
     VALUES ($1, $2, $3, $4::numeric)
     RETURNING id`,
    [ownerUserId, account.name, account.type, account.balance],
  );
  return insert.rows?.[0]?.id || null;
}

export async function syncPhase7AccountState(client, ownerUserId, payload) {
  const normalized = normalizePhase7SyncPayload(payload);
  if (!normalized) {
    const error = new Error('invalid_phase7_account_snapshot');
    error.code = 'invalid_phase7_account_snapshot';
    throw error;
  }

  const mappings = [];
  const activeServerIds = [];
  for (const account of normalized.accounts) {
    const serverId = await updateOrInsertAccount(client, ownerUserId, account);
    if (!serverId) throw new Error('account persistence failed');
    mappings.push({ clientId: account.clientId, serverId });
    activeServerIds.push(serverId);
  }

  if (activeServerIds.length) {
    await client.query(
      `UPDATE public.accounts
       SET archived_at = COALESCE(archived_at, now())
       WHERE user_id = $1 AND user_id = public.current_app_user_id()
         AND archived_at IS NULL AND NOT (id = ANY($2::uuid[]))`,
      [ownerUserId, activeServerIds],
    );
  } else {
    await client.query(
      `UPDATE public.accounts
       SET archived_at = COALESCE(archived_at, now())
       WHERE user_id = $1 AND user_id = public.current_app_user_id() AND archived_at IS NULL`,
      [ownerUserId],
    );
  }

  const settings = normalized.settings;
  await client.query(
    `UPDATE public.financial_settings
     SET emergency_buffer_amount = $2::numeric,
         income_cycle = COALESCE($3, income_cycle),
         budgeting_method = COALESCE($4, budgeting_method)
     WHERE user_id = $1 AND user_id = public.current_app_user_id()`,
    [ownerUserId, settings.emergencyBufferAmount, settings.incomeCycle, settings.budgetingMethod],
  );

  const state = await readPhase7AccountState(client, ownerUserId);
  return { ...state, mappings };
}

async function readJson(request) {
  try {
    const value = await request.json();
    return value && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
}

export async function handlePhase7AccountRequest(request, env) {
  const url = new URL(request.url);
  if (url.pathname === '/api/phase7/accounts' && request.method === 'GET') {
    const result = await withAuthenticatedUserTransaction(request, env, (client, context) =>
      readPhase7AccountState(client, context.ownerUserId));
    return apiResult(result);
  }
  if (url.pathname === '/api/phase7/accounts/sync' && request.method === 'POST') {
    const body = await readJson(request);
    if (!normalizePhase7SyncPayload(body)) return json({ ok: false, error: { code: 'invalid_phase7_account_snapshot' } }, 400);
    const result = await withAuthenticatedUserTransaction(request, env, (client, context) =>
      syncPhase7AccountState(client, context.ownerUserId, body));
    return apiResult(result);
  }
  return null;
}
