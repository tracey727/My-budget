import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { extname } from "node:path";

const entries = await readdir(new URL("../", import.meta.url), { withFileTypes: true });
const files = entries
  .filter((entry) => entry.isFile() && [".js", ".mjs"].includes(extname(entry.name)))
  .map((entry) => entry.name)
  .sort();

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`Syntax check passed for ${files.length} JavaScript module/runtime files.`);
