import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5000,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "https://sistema.systemtruck.com.br",
        changeOrigin: true,
        secure: false,
        timeout: 30000,
        proxyTimeout: 30000,
        rewrite: (path) => path.replace(/^\/api/, "/api"),
        configure: (proxy, options) => {
          proxy.on("error", (err, req, res) => {
            console.log("Erro no proxy:", err.message);
          });
          proxy.on("proxyReq", (proxyReq, req, res) => {
            console.log("Proxy request para:", req.url);
          });
        },
      },
    },
    hmr: {
      overlay: true,
    },
  },
  build: {
    sourcemap: false,
    minify: "terser",
    outDir: "dist",
    assetsDir: "assets",
    emptyOutDir: true,
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "ui-vendor": ["@headlessui/react", "@heroicons/react"],
          "data-vendor": ["@tanstack/react-query"],
          "utils-vendor": ["date-fns", "react-hot-toast"],
          "pdf-vendor": ["jspdf", "jspdf-autotable"],
          "qr-vendor": ["html5-qrcode", "qrcode.react"],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
