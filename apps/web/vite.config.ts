import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "../..", "");
  const apiUrl = env.API_URL || "http://localhost:8787";

  return {
    plugins: [react()],
    server: {
      port: Number(env.WEB_PORT || 5173),
      // The SPA talks to /api/* on its own origin; Vite forwards to the Hono API.
      // Keeps cookies first-party in development, so auth sessions just work.
      proxy: {
        "/api": {
          target: apiUrl,
          changeOrigin: false,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test-setup.ts"],
    },
  };
});
