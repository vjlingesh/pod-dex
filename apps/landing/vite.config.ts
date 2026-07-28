import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "../..", "");

  return {
    server: {
      port: Number(env.LANDING_PORT || 4321),
      proxy: {
        "/api": {
          target: env.API_URL || "http://localhost:8787",
          changeOrigin: false,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
  };
});
