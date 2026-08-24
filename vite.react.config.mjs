import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist-react",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(process.cwd(), "react-preview.html"),
    },
  },
});
