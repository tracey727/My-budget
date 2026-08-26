import { Client } from "pg";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

// Phase 6 is promoted in production; readiness now seals the live Phase 6 boundary.
const CURRENT_PHASE = 6;
const EXPECTED_DATABASE = "neondb";
const EXPECTED_MIGRATION = "014";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OWNER_CAPABILITIES = new Set(["read", "financial_action"]);
const PROFESSIONAL_CAPABILITIES = new Set(["read", "financial_action", "manage_members", "manage_workspace"]);
const PROFESSIONAL_ROLES = new Set([
  "owner",
  "administrator",
  "manager",
  "accountant_bookkeeper",
  "project_manager",
  "read_only",
]);
const EXPLICIT_PERMISSION_FAILURES = new Set([
  "professional_authority_required",
  "professional_entitlement_required",
]);

export const AUTH_LIFECYCLE_PATHS = Object.freeze([
  "/auth/sign-up/email",
  "/auth/sign-in/email",
  "/auth/sign-in/magic-link",
  "/auth/sign-out",
  "/auth/forget-password",
  "/auth/reset-password",
  "/auth/get-session",
  "/auth/list-sessions",
  "/auth/revoke-session",
  "/auth/revoke-other-sessions",
  "/auth/delete-user",
]);

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

function failure(status, code) {
  return { ok: false, status, code };
}

async function readJson(request) {
  try {
    const value = await request.json();
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}

export function resolveAuthBaseUrl(env) {
  const raw = typeof env?.NEON_AUTH_URL === "string" ? env.NEON_AUTH_URL.trim() : "";
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    url.search = "";
    url.hash = "";
    url.pathname = url.pathname.replace(/\/+$/, "");
    return url;
  } catch {
    return null;
  }
}

function authUpstreamUrl(requestUrl, env) {
  const base = resolveAuthBaseUrl(env);
  if (!base) return null;
  const incoming = new URL(requestUrl);
  const suffix = incoming.pathname.startsWith("/auth")
    ? incoming.pathname.slice("/auth".length)
    : incoming.pathname;
  const upstream = new URL(base.toString());
  upstream.pathname = `${base.pathname}${suffix || "/"}`.replace(/\/{2,}/g, "/");
  upstream.search = incoming.search;
  return upstream;
}

export async function proxyAuthRequest(request, env, fetchImpl = fetch) {
  const upstreamUrl = authUpstreamUrl(request.url, env);
  if (!upstreamUrl) return json({ ok: false, error: { code: "auth_unavailable" } }, 503);

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");
  headers.set("cache-control", "no-store");
  const method = request.method.toUpperCase();
  const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();

  try {
    const upstream = await fetchImpl(upstreamUrl, { method, headers, body, redirect: "manual" });
    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.set("cache-control", "no-store");
    if (typeof upstream.headers?.getSetCookie === "function") {
      const cookies = upstream.headers.getSetCookie();
      if (cookies.length) {
        responseHeaders.delete("set-cookie");
        for (const cookie of cookies) responseHeaders.append("set-cookie", cookie);
      }
    }
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch {
    return json({ ok: false, error: { code: "auth_unavailable" } }, 503);
  }
}

function normaliseSessionPayload(payload) {
  if (payload && typeof payload === "object" && payload.data && typeof payload.data === "object") {
    return payload.data;
  }
  return payload;
}

export async function authenticateRequest(request, env, fetchImpl = fetch) {
  const cookie = request.headers.get("cookie");
  if (!cookie) return failure(401, "authentication_required");

  const base = resolveAuthBaseUrl(env);
  if (!base) return failure(503, "auth_unavailable");
  const sessionUrl = new URL(`${base.pathname}/get-session`, base.origin);

  let response;
  try {
    response = await fetchImpl(sessionUrl, {
      method: "GET",
      headers: { accept: "application/json", cookie, "cache-control": "no-store" },
      redirect: "manual",
    });
  } catch {
    return failure(503, "auth_unavailable");
  }

  if (!response.ok) {
    return response.status === 401 || response.status === 403
      ? failure(401, "authentication_required")
      : failure(503, "auth_unavailable");
  }

  let payload;
  try {
    payload = normaliseSessionPayload(await response.json());
  } catch {
    return failure(503, "auth_unavailable");
  }

  const session = payload?.session || null;
  const rawUser = payload?.user || session?.user || null;
  const userId = typeof rawUser?.id === "string" ? rawUser.id.trim() : "";
  if (!session || !UUID_PATTERN.test(userId)) return failure(401, "authentication_required");

  const expiresAt = session.expiresAt ?? session.expires_at ?? null;
  if (expiresAt) {
    const expiry = new Date(expiresAt).getTime();
    if (!Number.isFinite(expiry) || expiry <= Date.now()) return failure(401, "session_expired");
  }

  return {
    ok: true,
    status: 200,
    session,
    user: {
      id: userId,
      email: typeof rawUser.email === "string" ? rawUser.email : null,
      name: typeof rawUser.name === "string" ? rawUser.name : null,
    },
  };
}

async function sha256Hex(value) {
  const data = new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sessionFingerprint(identity, request) {
  const sessionId = identity?.session?.id ?? identity?.session?.token ?? null;
  if (!sessionId || !request) return null;
  return {
    hash: await sha256Hex(sessionId),
    deviceLabel: request.headers.get("x-device-label")?.slice(0, 120) || null,
    userAgent: request.headers.get("user-agent")?.slice(0, 500) || null,
    ipHint: request.headers.get("cf-connecting-ip")?.slice(0, 120) || null,
    expiresAt: identity.session.expiresAt ?? identity.session.expires_at ?? null,
  };
}

async function runOwnerScopedTransaction(
  identity,
  request,
  env,
  ownerUserId,
  capability,
  operation,
  { ClientClass = Client } = {},
) {
  const ownerId = ownerUserId || identity.user.id;
  if (!UUID_PATTERN.test(ownerId) || !OWNER_CAPABILITIES.has(capability)) {
    return failure(400, "invalid_owner_scope");
  }

  const connectionString = env?.HYPERDRIVE?.connectionString;
  if (!connectionString) return failure(503, "database_unavailable");

  const client = new ClientClass({
    connectionString,
    connectionTimeoutMillis: 3000,
    query_timeout: 3000,
    statement_timeout: 3000,
  });

  const isSupport = identity.user.id !== ownerId;
  const actorType = isSupport ? "support" : "user";
  let transactionOpen = false;

  try {
    await client.connect();
    await client.query("BEGIN");
    transactionOpen = true;

    await client.query(
      `SELECT
         set_config('app.user_id', $1, true) AS app_user_id,
         set_config('app.owner_user_id', $2, true) AS app_owner_user_id,
         set_config('app.actor_type', $3, true) AS actor_type`,
      [identity.user.id, ownerId, actorType],
    );

    const active = await client.query(
      `SELECT
         public.application_user_is_active($1) AS actor_active,
         public.application_user_is_active($2) AS owner_active`,
      [identity.user.id, ownerId],
    );

    if (!active?.rows?.[0]?.actor_active || !active?.rows?.[0]?.owner_active) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      return failure(403, "application_user_unavailable");
    }

    // Managed Auth proves the browser session is valid. The local registry then
    // enforces application-level device revocation without storing the raw token.
    const fingerprint = await sessionFingerprint(identity, request);
    if (!fingerprint) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      return failure(401, "authentication_required");
    }

    const sessionState = await client.query(
      `SELECT id, revoked_at
       FROM public.user_sessions
       WHERE user_id = $1 AND auth_session_hash = $2
       LIMIT 1`,
      [identity.user.id, fingerprint.hash],
    );
    const existingSession = sessionState?.rows?.[0] || null;
    if (existingSession?.revoked_at) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      return failure(401, "session_revoked");
    }

    if (!existingSession) {
      await client.query(
        `SELECT public.register_current_session($1, $2, $3, $4, $5::timestamptz) AS session_id`,
        [fingerprint.hash, fingerprint.deviceLabel, fingerprint.userAgent, fingerprint.ipHint, fingerprint.expiresAt],
      );
    }

    if (isSupport) {
      const authority = await client.query(
        `SELECT public.trusted_support_can($1, $2, $3) AS allowed`,
        [ownerId, identity.user.id, capability],
      );
      if (authority?.rows?.[0]?.allowed !== true) {
        await client.query("ROLLBACK");
        transactionOpen = false;
        return failure(403, "support_authority_required");
      }
    }

    const data = await operation(client, {
      actor: { id: identity.user.id, email: identity.user.email, type: actorType },
      ownerUserId: ownerId,
      capability,
      session: identity.session,
    });

    await client.query("COMMIT");
    transactionOpen = false;
    return { ok: true, status: 200, data };
  } catch (error) {
    if (transactionOpen) {
      try { await client.query("ROLLBACK"); } catch {}
    }
    if (EXPLICIT_PERMISSION_FAILURES.has(error?.code)) {
      return failure(403, error.code);
    }
    return failure(503, "database_unavailable");
  } finally {
    try { await client.end(); } catch {}
  }
}

export async function withAuthenticatedUserTransaction(
  request,
  env,
  operation,
  { ClientClass = Client, fetchImpl = fetch } = {},
) {
  const identity = await authenticateRequest(request, env, fetchImpl);
  if (!identity.ok) return identity;
  return runOwnerScopedTransaction(identity, request, env, identity.user.id, "read", operation, { ClientClass });
}

export async function withAuthorizedOwnerTransaction(
  request,
  env,
  ownerUserId,
  capability,
  operation,
  { ClientClass = Client, fetchImpl = fetch } = {},
) {
  const identity = await authenticateRequest(request, env, fetchImpl);
  if (!identity.ok) return identity;
  return runOwnerScopedTransaction(identity, request, env, ownerUserId, capability, operation, { ClientClass });
}

async function withProfessionalWorkspaceTransaction(request, env, workspaceId, capability, operation) {
  if (!UUID_PATTERN.test(workspaceId) || !PROFESSIONAL_CAPABILITIES.has(capability)) {
    return failure(400, "invalid_workspace_scope");
  }
  return withAuthenticatedUserTransaction(request, env, async (client, context) => {
    const authority = await client.query(
      `SELECT public.professional_role_can($1, $2, $3) AS allowed`,
      [workspaceId, context.actor.id, capability],
    );
    if (authority?.rows?.[0]?.allowed !== true) {
      const error = new Error("professional_authority_required");
      error.code = "professional_authority_required";
      throw error;
    }
    return operation(client, context);
  });
}

async function getIdentity(request, env) {
  return withAuthenticatedUserTransaction(request, env, async (client, context) => {
    const result = await client.query(
      `SELECT u.id, u.email, e.product_mode, e.status AS entitlement_status
       FROM public.users u
       LEFT JOIN public.user_entitlements e ON e.user_id = u.id
       WHERE u.id = $1 AND u.id = public.current_app_user_id()
       LIMIT 1`,
      [context.actor.id],
    );
    const row = result?.rows?.[0];
    if (!row) throw new Error("identity unavailable");
    const productMode = row.product_mode === "professional" ? "professional" : "personal";
    const status = row.entitlement_status || "active";
    return {
      user: { id: row.id, email: row.email ?? null },
      entitlement: {
        productMode,
        status,
        effectiveMode: status === "active" && productMode === "professional" ? "professional" : "personal",
      },
    };
  });
}

async function getSessions(request, env) {
  return withAuthenticatedUserTransaction(request, env, async (client) => {
    const result = await client.query(
      `SELECT id, device_label, user_agent, created_at, last_seen_at, expires_at, revoked_at
       FROM public.user_sessions
       WHERE user_id = public.current_app_user_id()
       ORDER BY last_seen_at DESC`,
    );
    return { sessions: result.rows || [] };
  });
}

async function revokeSession(request, env) {
  const body = await readJson(request);
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
  if (!UUID_PATTERN.test(sessionId)) return failure(400, "invalid_session_id");
  return withAuthenticatedUserTransaction(request, env, async (client) => {
    const result = await client.query(`SELECT public.revoke_current_session($1) AS revoked`, [sessionId]);
    return { revoked: result?.rows?.[0]?.revoked === true };
  });
}

async function exportAccountData(request, env) {
  return withAuthenticatedUserTransaction(request, env, async (client, context) => {
    const exportData = {};

    const user = await client.query(
      `SELECT * FROM public.users
       WHERE id = $1 AND id = public.current_app_user_id()`,
      [context.actor.id],
    );
    exportData.users = user.rows || [];

    const tables = [
      "profiles", "financial_settings", "transaction_categories", "accounts", "transactions",
      "incomes", "bills", "bill_provisions", "subscriptions", "savings_goals", "debts", "alerts",
      "verified_savings", "user_entitlements", "user_sessions",
    ];
    for (const table of tables) {
      const result = await client.query(`SELECT * FROM public.${table} WHERE user_id = $1`, [context.actor.id]);
      exportData[table] = result.rows || [];
    }

    const supportGrants = await client.query(
      `SELECT * FROM public.trusted_support_grants
       WHERE owner_user_id = $1 OR support_user_id = $1
       ORDER BY created_at`,
      [context.actor.id],
    );
    exportData.trusted_support_grants = supportGrants.rows || [];

    const ownedWorkspaces = await client.query(
      `SELECT * FROM public.professional_workspaces WHERE owner_user_id = $1`,
      [context.actor.id],
    );
    const memberships = await client.query(
      `SELECT * FROM public.professional_memberships WHERE user_id = $1`,
      [context.actor.id],
    );
    exportData.professional_workspaces = ownedWorkspaces.rows || [];
    exportData.professional_memberships = memberships.rows || [];

    // Record the export before reading the audit ledger so the export event is
    // included in the returned account history.
    await client.query(`SELECT public.record_data_export('json')`);
    const auditEvents = await client.query(
      `SELECT * FROM public.audit_events
       WHERE user_id = $1
       ORDER BY occurred_at, id`,
      [context.actor.id],
    );
    exportData.audit_events = auditEvents.rows || [];

    return {
      exportedAt: new Date().toISOString(),
      format: "json",
      userId: context.actor.id,
      data: exportData,
    };
  });
}

async function deleteAccount(request, env) {
  const body = await readJson(request);
  if (body?.confirm !== "DELETE") return failure(400, "deletion_confirmation_required");
  return withAuthenticatedUserTransaction(request, env, async (client) => {
    const result = await client.query(`SELECT public.delete_current_account() AS deleted`);
    if (result?.rows?.[0]?.deleted !== true) throw new Error("account deletion failed");
    return { deleted: true, financialRecordsPreserved: true };
  });
}

async function createProfessionalWorkspace(request, env) {
  const body = await readJson(request);
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 200) : "";
  if (!name) return failure(400, "workspace_name_required");
  return withAuthenticatedUserTransaction(request, env, async (client, context) => {
    const entitlement = await client.query(
      `SELECT product_mode, status FROM public.user_entitlements WHERE user_id = $1`,
      [context.actor.id],
    );
    const row = entitlement?.rows?.[0];
    if (row?.product_mode !== "professional" || row?.status !== "active") {
      const error = new Error("professional_entitlement_required");
      error.code = "professional_entitlement_required";
      throw error;
    }
    const result = await client.query(
      `INSERT INTO public.professional_workspaces (owner_user_id, name)
       VALUES ($1, $2)
       RETURNING id, owner_user_id, name, status, created_at`,
      [context.actor.id, name],
    );
    return { workspace: result.rows[0] };
  });
}

async function listProfessionalMembers(request, env, workspaceId) {
  return withProfessionalWorkspaceTransaction(request, env, workspaceId, "read", async (client) => {
    const result = await client.query(
      `SELECT id, workspace_id, user_id, role, status, created_at, updated_at, revoked_at
       FROM public.professional_memberships
       WHERE workspace_id = $1 ORDER BY created_at`,
      [workspaceId],
    );
    return { memberships: result.rows || [] };
  });
}

async function upsertProfessionalMember(request, env, workspaceId) {
  const body = await readJson(request);
  const userId = typeof body?.userId === "string" ? body.userId : "";
  const role = typeof body?.role === "string" ? body.role : "";
  if (!UUID_PATTERN.test(userId) || !PROFESSIONAL_ROLES.has(role) || role === "owner") {
    return failure(400, "invalid_professional_member");
  }
  return withProfessionalWorkspaceTransaction(request, env, workspaceId, "manage_members", async (client) => {
    const result = await client.query(
      `INSERT INTO public.professional_memberships (workspace_id, user_id, role, status)
       VALUES ($1, $2, $3, 'active')
       ON CONFLICT (workspace_id, user_id) DO UPDATE
       SET role = EXCLUDED.role, status = 'active', revoked_at = NULL
       RETURNING id, workspace_id, user_id, role, status`,
      [workspaceId, userId, role],
    );
    return { membership: result.rows[0] };
  });
}

export async function checkDatabase(env, ClientClass = Client) {
  const connectionString = env?.HYPERDRIVE?.connectionString;
  if (!connectionString) return { ok: false, migration: null };
  const client = new ClientClass({ connectionString, connectionTimeoutMillis: 3000, query_timeout: 3000, statement_timeout: 3000 });
  try {
    await client.connect();
    const result = await client.query(`
      SELECT current_database() AS database_name,
        EXISTS (SELECT 1 FROM public.schema_migrations WHERE version = $1) AS migration_ready
    `, [EXPECTED_MIGRATION]);
    const row = result?.rows?.[0];
    const ok = row?.database_name === EXPECTED_DATABASE && row?.migration_ready === true;
    return { ok, migration: ok ? EXPECTED_MIGRATION : null };
  } catch {
    return { ok: false, migration: null };
  } finally {
    try { await client.end(); } catch {}
  }
}

export async function checkReadiness(env, ClientClass = Client) {
  const assetsReady = Boolean(env?.ASSETS && typeof env.ASSETS.fetch === "function");
  const database = await checkDatabase(env, ClientClass);
  const ready = assetsReady && database.ok;
  return {
    status: ready ? 200 : 503,
    payload: {
      ok: ready,
      service: "genevieve-budget",
      phase: CURRENT_PHASE,
      assets: assetsReady ? "ready" : "unavailable",
      database: database.ok ? "ready" : "unavailable",
      migration: database.ok ? database.migration : null,
    },
  };
}

function apiResult(result) {
  if (!result.ok) return json({ ok: false, error: { code: result.code } }, result.status);
  return json({ ok: true, ...result.data });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return json({ ok: true, service: "genevieve-budget", phase: CURRENT_PHASE, runtime: "cloudflare-workers" });
    }
    if (url.pathname === "/ready") {
      const readiness = await checkReadiness(env);
      return json(readiness.payload, readiness.status);
    }
    if (url.pathname === "/auth" || url.pathname.startsWith("/auth/")) {
      return proxyAuthRequest(request, env);
    }
    if (url.pathname === "/api/identity" && request.method === "GET") {
      return apiResult(await getIdentity(request, env));
    }
    if (url.pathname === "/api/sessions" && request.method === "GET") {
      return apiResult(await getSessions(request, env));
    }
    if (url.pathname === "/api/sessions/revoke" && request.method === "POST") {
      return apiResult(await revokeSession(request, env));
    }
    if (url.pathname === "/api/account/export" && request.method === "GET") {
      return apiResult(await exportAccountData(request, env));
    }
    if (url.pathname === "/api/account" && request.method === "DELETE") {
      return apiResult(await deleteAccount(request, env));
    }
    if (url.pathname === "/api/professional/workspaces" && request.method === "POST") {
      return apiResult(await createProfessionalWorkspace(request, env));
    }
    const membersMatch = url.pathname.match(/^\/api\/professional\/workspaces\/([0-9a-f-]+)\/members$/i);
    if (membersMatch && request.method === "GET") {
      return apiResult(await listProfessionalMembers(request, env, membersMatch[1]));
    }
    if (membersMatch && request.method === "POST") {
      return apiResult(await upsertProfessionalMember(request, env, membersMatch[1]));
    }
    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      return json({ ok: false, error: { code: "not_found" } }, 404);
    }
    return env.ASSETS.fetch(request);
  },
};
