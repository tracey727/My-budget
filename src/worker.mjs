import { Client } from "pg";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

// Keep the public readiness contract at the last fully promoted phase until
// Phase 6 is completely verified, promoted and archived.
const CURRENT_PHASE = 5;
const EXPECTED_DATABASE = "neondb";
const EXPECTED_MIGRATION = "007";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

function authFailure(status, code) {
  return { ok: false, status, code };
}

function safeAuthUser(user) {
  if (!user || typeof user !== "object") return null;
  const id = typeof user.id === "string" ? user.id.trim() : "";
  if (!UUID_PATTERN.test(id)) return null;
  return {
    id,
    email: typeof user.email === "string" ? user.email : null,
    name: typeof user.name === "string" ? user.name : null,
  };
}

function normaliseAuthPayload(payload) {
  if (payload && typeof payload === "object" && payload.data && typeof payload.data === "object") {
    return payload.data;
  }
  return payload;
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

function copyResponseHeaders(upstreamHeaders) {
  const headers = new Headers(upstreamHeaders);
  headers.set("cache-control", "no-store");

  // Preserve multiple authentication cookies when the runtime exposes them.
  if (typeof upstreamHeaders?.getSetCookie === "function") {
    const cookies = upstreamHeaders.getSetCookie();
    if (cookies.length) {
      headers.delete("set-cookie");
      for (const cookie of cookies) headers.append("set-cookie", cookie);
    }
  }
  return headers;
}

export async function proxyAuthRequest(request, env, fetchImpl = fetch) {
  const upstreamUrl = authUpstreamUrl(request.url, env);
  if (!upstreamUrl) {
    return json({ ok: false, error: { code: "auth_unavailable", message: "Authentication service unavailable." } }, 503);
  }

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");
  headers.set("cache-control", "no-store");

  const method = request.method.toUpperCase();
  const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();

  let upstreamResponse;
  try {
    upstreamResponse = await fetchImpl(upstreamUrl, {
      method,
      headers,
      body,
      redirect: "manual",
    });
  } catch {
    return json({ ok: false, error: { code: "auth_unavailable", message: "Authentication service unavailable." } }, 503);
  }

  const responseHeaders = copyResponseHeaders(upstreamResponse.headers);
  const location = responseHeaders.get("location");
  const authBase = resolveAuthBaseUrl(env);
  if (location && authBase) {
    try {
      const target = new URL(location, authBase);
      if (target.origin === authBase.origin && target.pathname.startsWith(authBase.pathname)) {
        const appOrigin = new URL(request.url).origin;
        const suffix = target.pathname.slice(authBase.pathname.length);
        responseHeaders.set("location", `${appOrigin}/auth${suffix}${target.search}${target.hash}`);
      }
    } catch {
      // Keep the upstream location if it cannot be safely parsed.
    }
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
}

export async function authenticateRequest(request, env, fetchImpl = fetch) {
  const cookie = request.headers.get("cookie");
  if (!cookie) return authFailure(401, "authentication_required");

  const base = resolveAuthBaseUrl(env);
  if (!base) return authFailure(503, "auth_unavailable");

  const sessionUrl = new URL(`${base.pathname}/get-session`, base.origin);
  let response;
  try {
    response = await fetchImpl(sessionUrl, {
      method: "GET",
      headers: {
        accept: "application/json",
        cookie,
        "cache-control": "no-store",
        "user-agent": request.headers.get("user-agent") || "genevieve-budget-worker",
      },
      redirect: "manual",
    });
  } catch {
    return authFailure(503, "auth_unavailable");
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      return authFailure(401, "authentication_required");
    }
    return authFailure(503, "auth_unavailable");
  }

  let payload;
  try {
    payload = normaliseAuthPayload(await response.json());
  } catch {
    return authFailure(503, "auth_unavailable");
  }

  const session = payload?.session || null;
  const user = safeAuthUser(payload?.user || session?.user || null);
  if (!session || !user) return authFailure(401, "authentication_required");

  const expiresAt = session.expiresAt ?? session.expires_at ?? null;
  if (expiresAt) {
    const expiry = new Date(expiresAt).getTime();
    if (!Number.isFinite(expiry) || expiry <= Date.now()) {
      return authFailure(401, "session_expired");
    }
  }

  return { ok: true, status: 200, user, session };
}

function newDatabaseClient(env, ClientClass) {
  const connectionString = env?.HYPERDRIVE?.connectionString;
  if (!connectionString) return null;
  return new ClientClass({
    connectionString,
    connectionTimeoutMillis: 3000,
    query_timeout: 3000,
    statement_timeout: 3000,
  });
}

export async function withAuthenticatedUserTransaction(
  request,
  env,
  operation,
  { ClientClass = Client, fetchImpl = fetch } = {},
) {
  const identity = await authenticateRequest(request, env, fetchImpl);
  if (!identity.ok) return identity;

  const client = newDatabaseClient(env, ClientClass);
  if (!client) return authFailure(503, "database_unavailable");

  let transactionOpen = false;
  try {
    await client.connect();
    await client.query("BEGIN");
    transactionOpen = true;

    // This MUST be the first database statement after BEGIN. The third
    // argument to set_config is true, making all three settings LOCAL to this
    // transaction and preventing pooled Hyperdrive connections leaking identity.
    await client.query(
      `SELECT
         set_config('app.user_id', $1, true) AS app_user_id,
         set_config('app.owner_user_id', $1, true) AS owner_user_id,
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
      return authFailure(403, "application_user_unavailable");
    }

    const data = await operation(client, {
      user: {
        id: identity.user.id,
        email: activeUser.rows[0].email ?? identity.user.email ?? null,
        name: identity.user.name,
      },
      session: identity.session,
    });

    await client.query("COMMIT");
    transactionOpen = false;
    return { ok: true, status: 200, user: identity.user, data };
  } catch {
    if (transactionOpen) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Fail closed; database error details are never returned to the client.
      }
    }
    return authFailure(503, "database_unavailable");
  } finally {
    try {
      await client.end();
    } catch {
      // Connection cleanup must not expose driver or credential details.
    }
  }
}

async function identityPayload(request, env) {
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
    if (!row) throw new Error("identity row unavailable");

    const productMode = row.product_mode === "professional" ? "professional" : "personal";
    const entitlementStatus = row.entitlement_status || "active";
    const effectiveMode = entitlementStatus === "active" && productMode === "professional"
      ? "professional"
      : "personal";

    return {
      user: { id: row.id, email: row.email ?? null },
      entitlement: {
        productMode,
        status: entitlementStatus,
        effectiveMode,
      },
    };
  });
}

export async function checkDatabase(env, ClientClass = Client) {
  const connectionString = env?.HYPERDRIVE?.connectionString;
  if (!connectionString) {
    return { ok: false, migration: null };
  }

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
    return {
      ok,
      migration: ok ? EXPECTED_MIGRATION : null,
    };
  } catch {
    return { ok: false, migration: null };
  } finally {
    try {
      await client.end();
    } catch {
      // Readiness remains fail-closed; never expose connection details or driver errors.
    }
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
      return json({
        ok: true,
        service: "genevieve-budget",
        phase: CURRENT_PHASE,
        runtime: "cloudflare-workers",
      });
    }

    if (url.pathname === "/ready") {
      const readiness = await checkReadiness(env);
      return json(readiness.payload, readiness.status);
    }

    if (url.pathname === "/auth" || url.pathname.startsWith("/auth/")) {
      return proxyAuthRequest(request, env);
    }

    if (url.pathname === "/api/identity" && request.method === "GET") {
      const result = await identityPayload(request, env);
      if (!result.ok) return json({ ok: false, error: { code: result.code } }, result.status);
      return json({ ok: true, ...result.data });
    }

    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      return json({ ok: false, error: { code: "not_found" } }, 404);
    }

    if (!env?.ASSETS || typeof env.ASSETS.fetch !== "function") {
      return json({ ok: false, error: { code: "assets_unavailable" } }, 503);
    }
    return env.ASSETS.fetch(request);
  },
};
