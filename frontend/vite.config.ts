import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const backend = "http://127.0.0.1:8765";

export default defineConfig({
  plugins: [react()],
  // The 3D assistant lives outside frontend/ (3d/conversational-assistant): resolve its bare
  // imports from frontend/node_modules and let the dev server read that folder.
  resolve: { dedupe: ["three", "react", "react-dom"] },
  server: { proxy: { "/api": backend, "/health": backend }, fs: { allow: [".."] } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
  },
});
