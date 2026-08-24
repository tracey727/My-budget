import { copyFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const assets = [
  "app.js",
  "styles.css",
  "service-worker.js",
  "manifest.webmanifest",
];

const dist = resolve(process.cwd(), "dist");
await mkdir(dist, { recursive: true });
for (const asset of assets) {
  await copyFile(resolve(process.cwd(), asset), resolve(dist, asset));
  console.log(`copied subscriber asset: ${asset}`);
}
