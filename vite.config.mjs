import { defineConfig } from "vite";
import { copyFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const PRESERVED_RUNTIME_ASSETS = [
  "app.js",
  "styles.css",
  "service-worker.js",
  "manifest.webmanifest",
];

export default defineConfig({
  plugins: [
    {
      name: "phase2-preserve-subscriber-runtime",
      async closeBundle() {
        const outputDir = resolve(process.cwd(), "dist");
        await mkdir(outputDir, { recursive: true });
        await Promise.all(
          PRESERVED_RUNTIME_ASSETS.map((asset) =>
            copyFile(resolve(process.cwd(), asset), resolve(outputDir, asset))
          )
        );
      },
    },
  ],
});
