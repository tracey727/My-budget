import { access, readFile, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";

const required = [
  "index.html",
  "app.js",
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

const index = await readFile(resolve(dist, "index.html"), "utf8");
if (!index.includes("/app.js")) {
  throw new Error("built index.html no longer references the supported /app.js subscriber entry");
}

console.log("Subscriber production artifact verification passed.");