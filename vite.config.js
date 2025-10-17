// vite.config.js
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ""); // loader .env ind i Node-processen
  return defineConfig({
    plugins: [react()],
    server: {
      proxy: {
        "/api-football": {
          target: "https://v3.football.api-sports.io",
          changeOrigin: true,
          secure: true,
          rewrite: (p) => p.replace(/^\/api-football/, ""),
          // VIGTIGT: nøglen kommer fra .env her
          headers: {
            "x-rapidapi-host": "v3.football.api-sports.io",
            "x-rapidapi-key": env.VITE_API_KEY || "",
          },
        },
      },
    },
  });
};
