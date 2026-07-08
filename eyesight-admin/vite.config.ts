import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs/promises';
import svgr from 'vite-plugin-svgr';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  resolve: {
    alias: {
      src: resolve(__dirname, 'src'),
    },
  },
  esbuild: {
    loader: 'tsx',
    include: /src\/.*\.tsx?$/,
    exclude: [],
    // Drop console/debugger in production for smaller output
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
  build: {
    sourcemap: false,
    // Target modern browsers — avoids unnecessary legacy polyfills
    target: 'es2020',
    // Warn when a chunk exceeds 800KB (default is 500KB, too noisy)
    chunkSizeWarningLimit: 800,
    commonjsOptions: {
      sourceMap: false,
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // UI Framework — split icons from components (icons alone ~3MB)
          'mui-core': ['@mui/material'],
          'mui-icons': ['@mui/icons-material'],
          // Charts (large library)
          'recharts-vendor': ['recharts'],
          // Form handling
          'form-vendor': ['react-hook-form', '@hookform/resolvers', 'yup'],
          // Utils
          'utils-vendor': ['dayjs', 'i18next', 'react-i18next'],
          // Heavy third-party libs — lazy loaded but still benefit from separate chunk caching
          'firebase-vendor': ['firebase/app', 'firebase/messaging'],
          'sentry-vendor': ['@sentry/react'],
          'tabler-icons': ['@tabler/icons-react'],
          'editor-vendor': ['react-quill-new'],
          // Data table
          'datatable-vendor': ['mui-datatables'],
        },
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      plugins: [
        {
          name: 'load-js-files-as-tsx',
          setup(build) {
            build.onLoad({ filter: /src\\.*\.js$/ }, async (args) => ({
              loader: 'tsx',
              contents: await fs.readFile(args.path, 'utf8'),
            }));
          },
        },
      ],
    },
  },

  plugins: [svgr(), react()],

  server: {
    port: 4001,
    strictPort: true,
  },

  // Test configuration
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
  },
});
