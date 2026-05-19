import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const googleClientId = env.VITE_GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID || "";

  return {
    define: {
      "import.meta.env.VITE_GOOGLE_CLIENT_ID": JSON.stringify(googleClientId),
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: `http://localhost:${env.API_PORT || 8787}`,
          changeOrigin: true,
        },
      },
    },
  };
});
