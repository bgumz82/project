import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    hmr: {
      overlay: false,
    },
    watch: {
      usePolling: false,
      interval: 1000,
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom", "@tanstack/react-query"],
    exclude: ["fsevents"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          utils: ["@tanstack/react-query"],
        },
      },
    },
  },
});
