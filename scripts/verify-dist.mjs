import { access, readFile, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";

const required = [
  "index.html",
  "app.js",
  "phase2-data-runtime.js",
  "styles.css",
  "service-worker.js",
  "manifest.webmanifest",
];

const dist = resolve(process.cwd(), "dist");
const entries = await readdir(dist, { withFileTypes: true });
console.log("dist entries:", entries.map((entry) => entry.name).sort().join(", "));

for (const file of required) {
  const target = resolve(dist, file);
  try {
    await access(target, constants.R_OK);
    console.log(`artifact present: ${file}`);
  } catch {
    throw new Error(`required subscriber artifact missing: ${file}`);
  }
}

const [index, runtime, worker] = await Promise.all([
  readFile(resolve(dist, "index.html"), "utf8"),
  readFile(resolve(dist, "phase2-data-runtime.js"), "utf8"),
  readFile(resolve(dist, "service-worker.js"), "utf8"),
]);

const dataRuntime = index.indexOf("/phase2-data-runtime.js");
const appRuntime = index.indexOf("/app.js");
if (dataRuntime < 0) throw new Error("built index.html no longer references /phase2-data-runtime.js");
if (appRuntime < 0) throw new Error("built index.html no longer references the supported /app.js subscriber entry");
if (dataRuntime > appRuntime) throw new Error("Phase 2 data runtime must load before app.js");

for (const fragment of ["transactionUserResponse", "transactionRecurringStatus", "transactionProfessionalProjectLink", "billDialog", "bnpl"]) {
  if (!runtime.includes(fragment)) throw new Error(`built Phase 2 data runtime missing contract fragment: ${fragment}`);
}
if (!worker.includes("/phase2-data-runtime.js")) {
  throw new Error("service worker no longer covers /phase2-data-runtime.js");
}

console.log("Subscriber production artifact verification passed, including Phase 2 data runtime linkage.");