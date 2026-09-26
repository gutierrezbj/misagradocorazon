import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // En desarrollo, /api va a la API local (apps/api).
    proxy: { "/api": { target: process.env.VITE_API_PROXY ?? "http://localhost:8001", changeOrigin: true } },
  },
});
