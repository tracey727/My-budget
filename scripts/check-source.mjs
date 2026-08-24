import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { extname, relative, resolve } from "node:path";

const root = resolve(new URL("../", import.meta.url).pathname);
const ignoredDirectories = new Set([".git", "node_modules", "dist", "dist-react"]);
const files = [];

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) await collect(resolve(directory, entry.name));
      continue;
    }
    if (entry.isFile() && [".js", ".mjs"].includes(extname(entry.name))) {
      files.push(resolve(directory, entry.name));
    }
  }
}

await collect(root);
files.sort();

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`Syntax check passed for ${files.length} JavaScript module/runtime files: ${files.map((file) => relative(root, file)).join(", ")}.`);
