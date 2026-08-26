import { Client } from "pg";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

// Keep readiness at the last fully promoted stage until all of Phase 6 is complete.
const CURRENT_PHASE = 5;
const EXPECTED_DATABASE = "neondb";
const EXPECTED_MIGRATION = "007";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

function failure(status, code) {
  return { ok: false, status, code };
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
  if (!upstreamUrl) {
    return json({ ok: false, error: { code: "auth_unavailable" } }, 503);
  }

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
      headers: {
        accept: "application/json",
        cookie,
        "cache-control": "no-store",
      },
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

export async function withAuthenticatedUserTransaction(
  request,
  env,
  operation,
  { ClientClass = Client, fetchImpl = fetch } = {},
) {
  const identity = await authenticateRequest(request, env, fetchImpl);
  if (!identity.ok) return identity;

  const connectionString = env?.HYPERDRIVE?.connectionString;
  if (!connectionString) return failure(503, "database_unavailable");

  const client = new ClientClass({
    connectionString,
    connectionTimeoutMillis: 3000,
    query_timeout: 3000,
    statement_timeout: 3000,
  });

  let transactionOpen = false;
  try {
    await client.connect();
    await client.query("BEGIN");
    transactionOpen = true;

    // Identity is LOCAL to this PostgreSQL transaction. This is deliberately
    // the first database statement after BEGIN so no user-owned query can run
    // before Phase 5 RLS sees the authenticated user.
    await client.query(
      `SELECT
         set_config('app.user_id', $1, true) AS app_user_id,
         set_config('app.actor_type', 'user', true) AS actor_type`,
      [identity.user.id],
    );

    const activeUser = await client.query(
      `SELECT id, email
       FROM public.users
       WHERE id = $1
         AND status = 'active'
         AND deleted_at IS NULL
         AND id = public.current_app_user_id()
       LIMIT 1`,
      [identity.user.id],
    );

    if (!activeUser?.rows?.[0]) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      return failure(403, "application_user_unavailable");
    }

    const data = await operation(client, {
      user: {
        id: identity.user.id,
        email: activeUser.rows[0].email ?? identity.user.email ?? null,
      },
      session: identity.session,
    });

    await client.query("COMMIT");
    transactionOpen = false;
    return { ok: true, status: 200, data };
  } catch {
    if (transactionOpen) {
      try { await client.query("ROLLBACK"); } catch {}
    }
    return failure(503, "database_unavailable");
  } finally {
    try { await client.end(); } catch {}
  }
}

async function getIdentity(request, env) {
  return withAuthenticatedUserTransaction(request, env, async (client, identity) => {
    const result = await client.query(
      `SELECT
         u.id,
         u.email,
         e.product_mode,
         e.status AS entitlement_status
       FROM public.users u
       LEFT JOIN public.user_entitlements e ON e.user_id = u.id
       WHERE u.id = $1
         AND u.id = public.current_app_user_id()
       LIMIT 1`,
      [identity.user.id],
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

export async function checkDatabase(env, ClientClass = Client) {
  const connectionString = env?.HYPERDRIVE?.connectionString;
  if (!connectionString) return { ok: false, migration: null };

  const client = new ClientClass({
    connectionString,
    connectionTimeoutMillis: 3000,
    query_timeout: 3000,
    statement_timeout: 3000,
  });

  try {
    await client.connect();
    const result = await client.query(`
      SELECT
        current_database() AS database_name,
        EXISTS (
          SELECT 1
          FROM public.schema_migrations
          WHERE version = $1
        ) AS migration_ready
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
      const result = await getIdentity(request, env);
      if (!result.ok) return json({ ok: false, error: { code: result.code } }, result.status);
      return json({ ok: true, ...result.data });
    }

    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      return json({ ok: false, error: { code: "not_found" } }, 404);
    }

    return env.ASSETS.fetch(request);
  },
};
