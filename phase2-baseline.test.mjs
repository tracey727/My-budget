import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function text(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("Phase 2 has one explicit subscriber entry path", async () => {
  const index = await text("./index.html");
  assert.match(index, /<script\s+src=["']\/app\.js["']\s+defer><\/script>/);
  assert.doesNotMatch(index, /src=["']\/main\.jsx["']/);
});

test("legacy subscriber runtime remains complete while React is preserved separately", async () => {
  const app = await text("./app.js");
  const index = await text("./index.html");
  assert.match(index, /data-view=["']dashboard["']/);
  assert.match(index, /data-view=["']transactions["']/);
  assert.match(index, /data-view=["']subscriptions["']/);
  assert.match(index, /data-view=["']accounts["']/);
  assert.match(index, /data-view=["']review["']/);
  assert.match(app, /function\s+backup\s*\(/);
  assert.match(app, /function\s+restore\s*\(/);
  assert.match(app, /function\s+exportCsv\s*\(/);
  assert.match(app, /serviceWorker/);
});

test("service worker caches the supported subscriber runtime", async () => {
  const worker = await text("./service-worker.js");
  for (const asset of ["/", "/index.html", "/styles.css", "/app.js", "/manifest.webmanifest"]) {
    assert.ok(worker.includes(`'${asset}'`) || worker.includes(`\"${asset}\"`), `missing ${asset} from service worker cache`);
  }
});

test("React migration destination remains independently compilable", async () => {
  const preview = await text("./react-preview.html");
  const main = await text("./main.jsx");
  assert.match(preview, /src=["']\/main\.jsx["']/);
  assert.match(main, /import App from ['"]\.\/App\.jsx['"]/);
});

test("reproducible install lock is committed", async () => {
  const lock = JSON.parse(await text("./package-lock.json"));
  assert.equal(lock.lockfileVersion, 3);
  assert.equal(lock.name, "genevieve-budget-compass");
  assert.ok(lock.packages?.[""], "root package entry missing from package-lock.json");
});
