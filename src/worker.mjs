import { Client } from "pg";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

const CURRENT_PHASE = 5;
const EXPECTED_DATABASE = "neondb";
const EXPECTED_MIGRATION = "007";

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
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

    return env.ASSETS.fetch(request);
  },
};
