import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: [
      "b9a63d21-f873-4924-986e-0408ba8e4014-00-ffzou305w7b0.pike.replit.dev",
    ],
  },
  build: {
    outDir: "dist",
  },
});
