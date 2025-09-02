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
    allowedHosts: ["3f235b19-6883-4b3c-982d-a890f1dfbc20-00-3ewfbg3gbe34w.janeway.replit.dev"],
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
