import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    react()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    allowedHosts: ['3f235b19-6883-4b3c-982d-a890f1dfbc20-00-3ewfbg3gbe34w.janeway.replit.dev'],
    proxy: {
      '/api': {
        target: 'https://sistema.systemtruck.com.br:3000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      }
    },
    hmr: {
      overlay: true
    }
  },
  build: {
    sourcemap: false,
    minify: 'terser',
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@headlessui/react', '@heroicons/react'],
          'data-vendor': ['@tanstack/react-query'],
          'utils-vendor': ['date-fns', 'react-hot-toast'],
          'pdf-vendor': ['jspdf', 'jspdf-autotable'],
          'qr-vendor': ['html5-qrcode', 'qrcode.react']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})