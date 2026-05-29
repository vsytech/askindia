import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],

    // ── Dev Server ─────────────────────────────────────────────
    server: {
      port: parseInt(env.VITE_PORT || '5173'),
      host: env.VITE_NETWORK_EXPOSE === 'true' ? true : 'localhost',
      open: false,
    },

    // ── Preview (vite preview / Vercel preview) ────────────────
    preview: {
      port: 4173,
      host: true,
    },

    // ── Production Build ───────────────────────────────────────
    build: {
      target: 'es2015',
      outDir: 'dist',
      sourcemap: mode !== 'production',   // source maps only in dev/staging
      minify: 'esbuild',
      cssMinify: true,
      chunkSizeWarningLimit: 550,

      rollupOptions: {
        output: {
          // Split vendor dependencies into cacheable chunks
          manualChunks: (id) => {
            // React core
            if (id.includes('node_modules/react/') ||
                id.includes('node_modules/react-dom/') ||
                id.includes('node_modules/scheduler/')) {
              return 'vendor-react';
            }
            // Router
            if (id.includes('node_modules/react-router-dom/') ||
                id.includes('node_modules/@remix-run/') ||
                id.includes('node_modules/react-router/')) {
              return 'vendor-router';
            }
            // Charts (heavy — isolate)
            if (id.includes('node_modules/recharts/') ||
                id.includes('node_modules/d3-') ||
                id.includes('node_modules/victory-')) {
              return 'vendor-charts';
            }
            // State management
            if (id.includes('node_modules/zustand/')) {
              return 'vendor-zustand';
            }
            // UI utilities
            if (id.includes('node_modules/lucide-react/') ||
                id.includes('node_modules/clsx/')) {
              return 'vendor-ui';
            }
            // Admin pages (rarely visited — split out)
            if (id.includes('/pages/admin/')) {
              return 'pages-admin';
            }
            // Agent pages
            if (id.includes('/pages/agent/')) {
              return 'pages-agent';
            }
            // Auth pages
            if (id.includes('/pages/auth/')) {
              return 'pages-auth';
            }
            // Store-owner pages
            if (id.includes('/pages/store-owner/')) {
              return 'pages-store';
            }
            // Service-provider pages
            if (id.includes('/pages/service-provider/')) {
              return 'pages-provider';
            }
            // Customer pages
            if (id.includes('/pages/customer/')) {
              return 'pages-customer';
            }
          },

          // Deterministic file names for long-term caching
          chunkFileNames:  'assets/[name]-[hash].js',
          entryFileNames:  'assets/[name]-[hash].js',
          assetFileNames:  'assets/[name]-[hash].[ext]',
        },
      },
    },

    // ── Optimise Dependencies ──────────────────────────────────
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'zustand',
        'clsx',
        'lucide-react',
      ],
    },

    // ── Define global constants ────────────────────────────────
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '1.0.0'),
    },
  };
});
