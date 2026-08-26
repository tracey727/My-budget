import test from "node:test";
import assert from "node:assert/strict";
import { checkDatabase, checkReadiness } from "./src/worker.mjs";

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
    assert.deepEqual(params, ["004"]);
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

test("database readiness succeeds only for neondb at migration 004", async () => {
  const result = await checkDatabase({ HYPERDRIVE: { connectionString: "postgres://hyperdrive" } }, ReadyClient);
  assert.deepEqual(result, { ok: true, migration: "004" });
});

test("missing Hyperdrive binding fails closed", async () => {
  const result = await checkDatabase({}, ReadyClient);
  assert.deepEqual(result, { ok: false, migration: null });
});

test("wrong database fails closed", async () => {
  const result = await checkDatabase({ HYPERDRIVE: { connectionString: "postgres://hyperdrive" } }, WrongDatabaseClient);
  assert.deepEqual(result, { ok: false, migration: null });
});

test("missing migration 004 fails closed", async () => {
  const result = await checkDatabase({ HYPERDRIVE: { connectionString: "postgres://hyperdrive" } }, MissingMigrationClient);
  assert.deepEqual(result, { ok: false, migration: null });
});

test("connection failure returns unavailable without leaking error details", async () => {
  const readiness = await checkReadiness({ ASSETS: assets, HYPERDRIVE: { connectionString: "postgres://secret-value" } }, FailingClient);
  assert.equal(readiness.status, 503);
  assert.deepEqual(readiness.payload, {
    ok: false,
    service: "genevieve-budget",
    phase: 4,
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
    phase: 4,
    assets: "ready",
    database: "ready",
    migration: "004",
  });

  const noAssets = await checkReadiness({ HYPERDRIVE: { connectionString: "postgres://hyperdrive" } }, ReadyClient);
  assert.equal(noAssets.status, 503);
  assert.equal(noAssets.payload.assets, "unavailable");
  assert.equal(noAssets.payload.database, "ready");
});
