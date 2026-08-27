import { Client } from 'pg';

const EXPECTED_DATABASE = 'neondb';
const EXPECTED_MIGRATION = '015';

export async function checkPhase7Database(env, ClientClass = Client) {
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

export async function checkPhase7Readiness(env, ClientClass = Client) {
  const assetsReady = Boolean(env?.ASSETS && typeof env.ASSETS.fetch === 'function');
  const database = await checkPhase7Database(env, ClientClass);
  const ready = assetsReady && database.ok;
  return {
    status: ready ? 200 : 503,
    payload: {
      ok: ready,
      service: 'genevieve-budget',
      phase: 7,
      assets: assetsReady ? 'ready' : 'unavailable',
      database: database.ok ? 'ready' : 'unavailable',
      migration: database.ok ? database.migration : null,
    },
  };
}
