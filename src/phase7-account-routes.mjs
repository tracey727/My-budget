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
const MAX_MONEY = 999999999999.99;

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

function apiResult(result) {
  if (!result?.ok) return json({ ok: false, error: { code: result?.code || 'database_unavailable' } }, result?.status || 503);
  if (result.data?.syncConflict) {
    return json({
      ok: false,
      error: { code: 'phase7_sync_conflict' },
      expectedRevision: result.data.expectedRevision,
    }, 409);
  }
  if (result.data?.syncRejected) {
    return json({ ok: false, error: { code: result.data.code || 'phase7_sync_rejected' } }, result.data.status || 409);
  }
  return json({ ok: true, ...result.data });
}

function roundMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || Math.abs(number) > MAX_MONEY) return null;
  return Math.round(number * 100) / 100;
}

function nonNegativeMoney(value) {
  const amount = roundMoney(value);
  return amount === null || amount < 0 ? null : amount;
}

function safeText(value, maxLength) {
  if (typeof value !== 'string') return '';
  const text = value.trim();
  return text.length <= maxLength ? text : '';
}

function safeRevision(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export function normalizePhase7SyncPayload(value) {
  if (!value || typeof value !== 'object' || value.syncMode !== 'upsert_only' || !Array.isArray(value.accounts)) return null;
  if (!UUID_PATTERN.test(String(value.userId || '')) || value.accounts.length > 250) return null;
  const baseRevision = safeRevision(value.baseRevision);
  if (baseRevision === null) return null;

  const accounts = [];
  const seenClientIds = new Set();
  const seenServerIds = new Set();
  for (const raw of value.accounts) {
    const clientId = safeText(raw?.id, 200);
    const name = safeText(raw?.name, 200);
    const type = safeText(raw?.type, 40);
    const openingBalance = roundMoney(raw?.openingBalance);
    const currentBalance = roundMoney(raw?.currentBalance);
    const serverId = typeof raw?.serverId === 'string' && UUID_PATTERN.test(raw.serverId) ? raw.serverId : null;
    if (!clientId || seenClientIds.has(clientId) || !name || !ACCOUNT_TYPES.has(type)) return null;
    if (openingBalance === null || currentBalance === null || (serverId && seenServerIds.has(serverId))) return null;
    seenClientIds.add(clientId);
    if (serverId) seenServerIds.add(serverId);
    accounts.push({ clientId, serverId, name, type, openingBalance, currentBalance });
  }

  const settingsSource = value.settings && typeof value.settings === 'object' ? value.settings : {};
  const emergencyBufferAmount = nonNegativeMoney(settingsSource.emergencyBufferAmount ?? 0);
  if (emergencyBufferAmount === null) return null;
  const incomeCycle = INCOME_CYCLES.has(settingsSource.incomeCycle) ? settingsSource.incomeCycle : null;
  const budgetingMethod = BUDGETING_METHODS.has(settingsSource.budgetingMethod) ? settingsSource.budgetingMethod : null;

  const protectionSource = value.protection && typeof value.protection === 'object' ? value.protection : null;
  const billReserved = nonNegativeMoney(protectionSource?.billReserved);
  const protectedSavings = nonNegativeMoney(protectionSource?.protectedSavings);
  if (protectionSource?.complete !== true || billReserved === null || protectedSavings === null) return null;

  return {
    userId: String(value.userId),
    baseRevision,
    accounts,
    settings: { emergencyBufferAmount, incomeCycle, budgetingMethod },
    protection: { complete: true, billReserved, protectedSavings },
  };
}

export function normalizePhase7ArchivePayload(value) {
  if (!value || typeof value !== 'object' || value.confirm !== 'ARCHIVE_ACCOUNT') return null;
  const userId = String(value.userId || '');
  const baseRevision = safeRevision(value.baseRevision);
  if (!UUID_PATTERN.test(userId) || baseRevision === null) return null;
  return { userId, baseRevision };
}

function rowMoney(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : 0;
}

function balanceSummary(accounts, settings) {
  let assets = 0;
  let debts = 0;
  let liquid = 0;
  for (const account of accounts) {
    const balance = rowMoney(account.current_balance_snapshot);
    if (LIABILITY_TYPES.has(account.account_type)) debts += Math.max(0, balance);
    else {
      assets += balance;
      if (LIQUID_TYPES.has(account.account_type)) liquid += balance;
    }
  }
  const emergency = rowMoney(settings?.emergency_buffer_amount);
  const billReserved = rowMoney(settings?.phase7_bill_reserved_snapshot);
  const protectedSavings = rowMoney(settings?.phase7_protected_savings_snapshot);
  const protectionComplete = settings?.phase7_protection_snapshot_complete === true;
  const protectedReserved = Math.round((emergency + billReserved + protectedSavings) * 100) / 100;
  return {
    assetBalance: Math.round(assets * 100) / 100,
    debtBalance: Math.round(debts * 100) / 100,
    liquidBalance: Math.round(liquid * 100) / 100,
    protectedReserved,
    spendableBalance: protectionComplete ? Math.round(Math.max(0, liquid - protectedReserved) * 100) / 100 : null,
    spendableAvailable: protectionComplete,
    components: { emergencyReserved: emergency, billReserved, protectedSavings },
  };
}

export async function readPhase7AccountState(client, ownerUserId) {
  const accountResult = await client.query(
    `SELECT id, phase7_client_id, name, account_type, currency_code, opening_balance,
            current_balance_snapshot, balance_snapshot_at, archived, archived_at, created_at, updated_at
     FROM public.accounts
     WHERE user_id = $1 AND user_id = public.current_app_user_id() AND archived_at IS NULL
     ORDER BY created_at, id`,
    [ownerUserId],
  );
  const settingsResult = await client.query(
    `SELECT income_cycle, budgeting_method, emergency_buffer_amount,
            phase7_sync_revision, phase7_bill_reserved_snapshot,
            phase7_protected_savings_snapshot, phase7_protection_snapshot_complete,
            phase7_protection_snapshot_at
     FROM public.financial_settings
     WHERE user_id = $1 AND user_id = public.current_app_user_id()
     LIMIT 1`,
    [ownerUserId],
  );

  const rows = accountResult.rows || [];
  const accounts = rows.map((row) => ({
    id: row.id,
    serverId: row.id,
    clientId: row.phase7_client_id || row.id,
    name: row.name,
    type: row.account_type,
    currencyCode: row.currency_code,
    openingBalance: rowMoney(row.opening_balance),
    currentBalance: rowMoney(row.current_balance_snapshot),
    balance: rowMoney(row.current_balance_snapshot),
    balanceSnapshotAt: row.balance_snapshot_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
  const settings = settingsResult.rows?.[0] || {};
  const revision = Number(settings.phase7_sync_revision || 0);
  const protection = {
    complete: settings.phase7_protection_snapshot_complete === true,
    billReserved: rowMoney(settings.phase7_bill_reserved_snapshot),
    protectedSavings: rowMoney(settings.phase7_protected_savings_snapshot),
    snapshotAt: settings.phase7_protection_snapshot_at || null,
  };
  return {
    userId: ownerUserId,
    revision,
    accounts,
    settings: {
      incomeCycle: settings.income_cycle || 'fortnightly',
      budgetingMethod: settings.budgeting_method || 'mixed',
      emergencyBufferAmount: rowMoney(settings.emergency_buffer_amount),
    },
    protection,
    summary: balanceSummary(rows, settings),
    persistence: 'neon',
    migration: '015',
  };
}

async function lockSyncState(client, ownerUserId) {
  const result = await client.query(
    `SELECT phase7_sync_revision
     FROM public.financial_settings
     WHERE user_id = $1 AND user_id = public.current_app_user_id()
     FOR UPDATE`,
    [ownerUserId],
  );
  return result.rows?.[0] ? Number(result.rows[0].phase7_sync_revision || 0) : null;
}

async function validateServerMappings(client, ownerUserId, accounts) {
  const mapped = accounts.filter((account) => account.serverId);
  if (!mapped.length) return true;
  const result = await client.query(
    `SELECT id, phase7_client_id
     FROM public.accounts
     WHERE user_id = $1 AND user_id = public.current_app_user_id()
       AND archived_at IS NULL AND id = ANY($2::uuid[])
     FOR UPDATE`,
    [ownerUserId, mapped.map((account) => account.serverId)],
  );
  const rows = new Map((result.rows || []).map((row) => [row.id, row]));
  return mapped.every((account) => {
    const row = rows.get(account.serverId);
    return row && (!row.phase7_client_id || row.phase7_client_id === account.clientId);
  });
}

async function updateOrInsertAccount(client, ownerUserId, account) {
  if (account.serverId) {
    const update = await client.query(
      `UPDATE public.accounts
       SET name = $3, account_type = $4,
           current_balance_snapshot = $5::numeric, balance_snapshot_at = now(),
           phase7_client_id = COALESCE(phase7_client_id, $6)
       WHERE user_id = $1 AND id = $2 AND user_id = public.current_app_user_id()
         AND archived_at IS NULL
       RETURNING id, opening_balance`,
      [ownerUserId, account.serverId, account.name, account.type, account.currentBalance, account.clientId],
    );
    if (update.rows?.[0]?.id) return update.rows[0];
    return null;
  }

  const existing = await client.query(
    `UPDATE public.accounts
     SET name = $3, account_type = $4,
         current_balance_snapshot = $5::numeric, balance_snapshot_at = now()
     WHERE user_id = $1 AND phase7_client_id = $2
       AND user_id = public.current_app_user_id() AND archived_at IS NULL
     RETURNING id, opening_balance`,
    [ownerUserId, account.clientId, account.name, account.type, account.currentBalance],
  );
  if (existing.rows?.[0]?.id) return existing.rows[0];

  const insert = await client.query(
    `INSERT INTO public.accounts (
       user_id, phase7_client_id, name, account_type, opening_balance,
       current_balance_snapshot, balance_snapshot_at
     ) VALUES ($1, $2, $3, $4, $5::numeric, $6::numeric, now())
     RETURNING id, opening_balance`,
    [ownerUserId, account.clientId, account.name, account.type, account.openingBalance, account.currentBalance],
  );
  return insert.rows?.[0] || null;
}

export async function syncPhase7AccountState(client, ownerUserId, payload) {
  const normalized = normalizePhase7SyncPayload(payload);
  if (!normalized) return { syncRejected: true, status: 400, code: 'invalid_phase7_account_sync' };
  if (normalized.userId !== ownerUserId) {
    return { syncRejected: true, status: 403, code: 'phase7_user_binding_mismatch' };
  }

  const currentRevision = await lockSyncState(client, ownerUserId);
  if (currentRevision === null) return { syncRejected: true, status: 409, code: 'phase7_sync_state_unavailable' };
  if (normalized.baseRevision !== currentRevision) {
    return { syncConflict: true, expectedRevision: currentRevision };
  }
  if (!await validateServerMappings(client, ownerUserId, normalized.accounts)) {
    return { syncRejected: true, status: 409, code: 'phase7_account_mapping_invalid' };
  }

  const mappings = [];
  for (const account of normalized.accounts) {
    const persisted = await updateOrInsertAccount(client, ownerUserId, account);
    if (!persisted?.id) return { syncRejected: true, status: 409, code: 'phase7_account_mapping_invalid' };
    mappings.push({
      clientId: account.clientId,
      serverId: persisted.id,
      openingBalance: rowMoney(persisted.opening_balance),
    });
  }

  const nextRevision = currentRevision + 1;
  const settings = normalized.settings;
  await client.query(
    `UPDATE public.financial_settings
     SET emergency_buffer_amount = $2::numeric,
         income_cycle = COALESCE($3, income_cycle),
         budgeting_method = COALESCE($4, budgeting_method),
         phase7_sync_revision = $5,
         phase7_bill_reserved_snapshot = $6::numeric,
         phase7_protected_savings_snapshot = $7::numeric,
         phase7_protection_snapshot_complete = true,
         phase7_protection_snapshot_at = now()
     WHERE user_id = $1 AND user_id = public.current_app_user_id()`,
    [
      ownerUserId,
      settings.emergencyBufferAmount,
      settings.incomeCycle,
      settings.budgetingMethod,
      nextRevision,
      normalized.protection.billReserved,
      normalized.protection.protectedSavings,
    ],
  );

  const state = await readPhase7AccountState(client, ownerUserId);
  return { ...state, mappings };
}

export async function archivePhase7Account(client, ownerUserId, accountId, payload) {
  const normalized = normalizePhase7ArchivePayload(payload);
  if (!normalized) return { syncRejected: true, status: 400, code: 'invalid_phase7_account_archive' };
  if (normalized.userId !== ownerUserId) {
    return { syncRejected: true, status: 403, code: 'phase7_user_binding_mismatch' };
  }
  const currentRevision = await lockSyncState(client, ownerUserId);
  if (currentRevision === null) return { syncRejected: true, status: 409, code: 'phase7_sync_state_unavailable' };
  if (normalized.baseRevision !== currentRevision) {
    return { syncConflict: true, expectedRevision: currentRevision };
  }

  const archived = await client.query(
    `UPDATE public.accounts
     SET archived_at = now()
     WHERE user_id = $1 AND id = $2 AND user_id = public.current_app_user_id()
       AND archived_at IS NULL
     RETURNING id`,
    [ownerUserId, accountId],
  );
  if (!archived.rows?.[0]?.id) return { syncRejected: true, status: 404, code: 'phase7_account_not_found' };

  await client.query(
    `UPDATE public.financial_settings
     SET phase7_sync_revision = $2
     WHERE user_id = $1 AND user_id = public.current_app_user_id()`,
    [ownerUserId, currentRevision + 1],
  );
  const state = await readPhase7AccountState(client, ownerUserId);
  return { ...state, archivedAccountId: archived.rows[0].id };
}

async function readJson(request, maxBytes = 262144) {
  try {
    const declaredLength = Number(request.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) return null;
    if (!request.body) return null;

    const reader = request.body.getReader();
    const decoder = new TextDecoder();
    let text = '';
    let bytes = 0;
    while (true) {
      const { done, value: chunk } = await reader.read();
      if (done) break;
      bytes += chunk.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        return null;
      }
      text += decoder.decode(chunk, { stream: true });
    }
    text += decoder.decode();
    const value = JSON.parse(text);
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
    if (!normalizePhase7SyncPayload(body)) return json({ ok: false, error: { code: 'invalid_phase7_account_sync' } }, 400);
    const result = await withAuthenticatedUserTransaction(request, env, (client, context) =>
      syncPhase7AccountState(client, context.ownerUserId, body));
    return apiResult(result);
  }
  const archiveMatch = url.pathname.match(/^\/api\/phase7\/accounts\/([0-9a-f-]+)\/archive$/i);
  if (archiveMatch && request.method === 'POST' && UUID_PATTERN.test(archiveMatch[1])) {
    const body = await readJson(request);
    if (!normalizePhase7ArchivePayload(body)) return json({ ok: false, error: { code: 'invalid_phase7_account_archive' } }, 400);
    const result = await withAuthenticatedUserTransaction(request, env, (client, context) =>
      archivePhase7Account(client, context.ownerUserId, archiveMatch[1], body));
    return apiResult(result);
  }
  return null;
}
