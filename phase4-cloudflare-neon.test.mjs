import test from "node:test";
import assert from "node:assert/strict";
import worker, { checkDatabase, checkReadiness } from "./src/worker.mjs";

const assets = {
  async fetch() {
    return new Response("ok");
  },
};

class ReadyClient {
  constructor(config) {
    this.config = config;
  }
  async connect() {}
  async query(sql, params) {
    assert.match(sql, /public\.schema_migrations/);
    assert.deepEqual(params, ["014"]);
    return { rows: [{ database_name: "neondb", migration_ready: true }] };
  }
  async end() {}
}

class WrongDatabaseClient extends ReadyClient {
  async query() {
    return { rows: [{ database_name: "wrongdb", migration_ready: true }] };
  }
}

class MissingMigrationClient extends ReadyClient {
  async query() {
    return { rows: [{ database_name: "neondb", migration_ready: false }] };
  }
}

class FailingClient extends ReadyClient {
  async connect() {
    throw new Error("connection failed");
  }
}

test("database readiness preserves the Phase 4 Hyperdrive path to neondb at the current Phase 6 migration 014", async () => {
  const result = await checkDatabase({ HYPERDRIVE: { connectionString: "postgres://hyperdrive" } }, ReadyClient);
  assert.deepEqual(result, { ok: true, migration: "014" });
});

test("missing Hyperdrive binding fails closed", async () => {
  const result = await checkDatabase({}, ReadyClient);
  assert.deepEqual(result, { ok: false, migration: null });
});

test("wrong database fails closed", async () => {
  const result = await checkDatabase({ HYPERDRIVE: { connectionString: "postgres://hyperdrive" } }, WrongDatabaseClient);
  assert.deepEqual(result, { ok: false, migration: null });
});

test("missing current migration 014 fails closed", async () => {
  const result = await checkDatabase({ HYPERDRIVE: { connectionString: "postgres://hyperdrive" } }, MissingMigrationClient);
  assert.deepEqual(result, { ok: false, migration: null });
});

test("connection failure returns unavailable without leaking error details", async () => {
  const readiness = await checkReadiness({ ASSETS: assets, HYPERDRIVE: { connectionString: "postgres://secret-value" } }, FailingClient);
  assert.equal(readiness.status, 503);
  assert.deepEqual(readiness.payload, {
    ok: false,
    service: "genevieve-budget",
    phase: 6,
    assets: "ready",
    database: "unavailable",
    migration: null,
  });
  assert.doesNotMatch(JSON.stringify(readiness), /secret-value|connection failed/);
});

test("assets and database must both be ready before HTTP 200", async () => {
  const success = await checkReadiness({ ASSETS: assets, HYPERDRIVE: { connectionString: "postgres://hyperdrive" } }, ReadyClient);
  assert.equal(success.status, 200);
  assert.deepEqual(success.payload, {
    ok: true,
    service: "genevieve-budget",
    phase: 6,
    assets: "ready",
    database: "ready",
    migration: "014",
  });

  const noAssets = await checkReadiness({ HYPERDRIVE: { connectionString: "postgres://hyperdrive" } }, ReadyClient);
  assert.equal(noAssets.status, 503);
  assert.equal(noAssets.payload.assets, "unavailable");
  assert.equal(noAssets.payload.database, "ready");
});

test("endpoint-level failure proof keeps health live while readiness fails closed", async () => {
  const envWithoutDatabase = { ASSETS: assets };
  const health = await worker.fetch(new Request("https://budget.test/health"), envWithoutDatabase);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), {
    ok: true,
    service: "genevieve-budget",
    phase: 7,
    runtime: "cloudflare-workers",
  });

  const ready = await worker.fetch(new Request("https://budget.test/ready"), envWithoutDatabase);
  assert.equal(ready.status, 503);
  assert.deepEqual(await ready.json(), {
    ok: false,
    service: "genevieve-budget",
    phase: 7,
    assets: "ready",
    database: "unavailable",
    migration: null,
  });
});
