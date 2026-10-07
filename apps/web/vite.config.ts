import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const shared = fileURLToPath(new URL("../../packages/shared/src/index.ts", import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@marina/shared": shared,
    },
  },
  // The shared package lives outside this app's folder.
  // PORT is set when a tool picks the port (e.g. the preview runner); otherwise Vite's default.
  server: { port: process.env.PORT ? Number(process.env.PORT) : undefined, fs: { allow: ["../.."] } },
});
