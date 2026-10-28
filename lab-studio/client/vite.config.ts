import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5190,
    proxy: {
      "/api": {
        target: "http://localhost:5180",
        changeOrigin: true,
      },
    },
  },
});
