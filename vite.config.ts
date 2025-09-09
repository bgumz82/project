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
      "/api/consultar-nfe": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
        timeout: 30000,
        configure: (proxy, options) => {
          proxy.on("error", (err, req, res) => {
            console.log("Erro no proxy NF-e:", err.message);
            // Fallback para fazer requisição direta ao webservice externo
            if (req.method === "POST" && req.url === "/api/consultar-nfe") {
              const chaveNFE = req.body?.chaveNFE;
              if (chaveNFE) {
                const token = "44B4845C-05F4-7E99-2DFF-8EAE5746E9BA";
                const url = `https://www.roveri.inf.br/consultas/nfe.php?token=${token}&chave=${chaveNFE}`;

                // Fazer requisição direta
                fetch(url)
                  .then((response) => response.text())
                  .then((data) => {
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ success: true, data }));
                  })
                  .catch((fetchError) => {
                    res.writeHead(500, { "Content-Type": "application/json" });
                    res.end(
                      JSON.stringify({
                        error: "Erro ao consultar NF-e",
                        details: fetchError.message,
                      }),
                    );
                  });
              }
            }
          });
        },
      },
      "/api/verificar-cliente": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
        timeout: 30000,
      },
      "/api/cadastrar-cliente-nfe": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
        timeout: 30000,
      },
      "/api/cte-documentos": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
        timeout: 30000,
        configure: (proxy, options) => {
          proxy.on("proxyReq", (proxyReq, req, res) => {
            console.log("🔥 Redirecionando CT-e para localhost:", req.url);
          });
        },
      },
      "/api/mdfe-documentos": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
        timeout: 30000,
        configure: (proxy, options) => {
          proxy.on("proxyReq", (proxyReq, req, res) => {
            console.log("🔥 Redirecionando MDF-e para localhost:", req.url);
          });
        },
      },
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
