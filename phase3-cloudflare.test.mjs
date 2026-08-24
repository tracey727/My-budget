import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function text(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("Cloudflare config targets Workers Static Assets and current phase", async () => {
  const raw = await text("./wrangler.jsonc");
  const config = JSON.parse(raw);
  assert.equal(config.name, "genevieve-budget");
  assert.equal(config.main, "./src/worker.mjs");
  assert.equal(config.compatibility_date, "2026-08-24");
  assert.equal(config.assets?.directory, "./dist");
  assert.equal(config.assets?.binding, "ASSETS");
  assert.deepEqual(config.assets?.run_worker_first, ["/health", "/ready"]);
  assert.equal(config.hyperdrive, undefined);
  assert.equal(config.d1_databases, undefined);
});

test("Cloudflare worker exposes health and readiness without Phase 4 database claims", async () => {
  const worker = await text("./src/worker.mjs");
  assert.match(worker, /\/health/);
  assert.match(worker, /\/ready/);
  assert.match(worker, /database:\s*["']not-configured-phase-4["']/);
  assert.match(worker, /env\.ASSETS\.fetch\(request\)/);
});
