import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function text(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("Cloudflare config preserves the sealed Phase 3 Workers Static Assets contract", async () => {
  const raw = await text("./wrangler.jsonc");
  const config = JSON.parse(raw);
  assert.equal(config.name, "genevieve-budget");
  assert.equal(config.main, "./src/worker.mjs");
  assert.equal(config.compatibility_date, "2026-08-24");
  assert.equal(config.assets?.directory, "./dist");
  assert.equal(config.assets?.binding, "ASSETS");

  const runWorkerFirst = config.assets?.run_worker_first;
  assert.ok(Array.isArray(runWorkerFirst));
  assert.deepEqual(runWorkerFirst.slice(0, 2), ["/health", "/ready"]);
  assert.equal(new Set(runWorkerFirst).size, runWorkerFirst.length);

  assert.equal(config.d1_databases, undefined);
  assert.equal(config.vars?.DATABASE_URL, undefined);
  assert.doesNotMatch(raw, /postgres(?:ql)?:\/\//i);
});

test("Cloudflare worker preserves health, readiness and static-asset routing for later phases", async () => {
  const worker = await text("./src/worker.mjs");
  assert.match(worker, /\/health/);
  assert.match(worker, /\/ready/);
  assert.match(worker, /service:\s*["']genevieve-budget["']/);
  assert.match(worker, /runtime:\s*["']cloudflare-workers["']/);
  assert.match(worker, /env\.ASSETS\.fetch\(request\)/);
});
