import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'

// Identifies this build. The bundle is stamped with it, and the same value is
// written to dist/version.json, which a running tab polls to learn that a
// newer deploy has landed (see src/hooks/useVersionCheck.js). CI builds use
// the commit; local builds fall back to a timestamp.
const buildVersion =
  (process.env.GITHUB_SHA || '').slice(0, 7) || `local-${Date.now()}`

const versionFile = () => ({
  name: 'version-file',
  apply: 'build',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'version.json',
      source: JSON.stringify({ version: buildVersion }),
    })
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), versionFile()],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(buildVersion),
  },
  base: '/client/',
  test: {
    globals: true,
    environment: 'jsdom',
    testTimeout: 15000,
    setupFiles: './src/setupTests.js',
    css: true,
    // Count every source file, not only the ones a test happens to import.
    // Without this, the denominator moves whenever someone adds an import and
    // the percentage says more about which files were reached than about how
    // well the code is tested.
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/test/**',
        'src/**/*.test.{js,jsx}',
        'src/setupTests.js',
        'src/main.jsx',
      ],
    },
  },
  build: {
    chunkSizeWarningLimit: 500,
    minify: 'terser',
    terserOptions: {
      compress: {
        // terser only runs for `vite build`, so dev and vitest keep logging.
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-redux': ['@reduxjs/toolkit', 'react-redux', 'redux-persist'],
          'vendor-charts': ['apexcharts', 'react-apexcharts'],
          'vendor-pdf': ['jspdf', 'html2canvas'],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'yup'],
          'vendor-ui': ['react-select', 'react-toastify', 'react-icons'],
        },
      },
    },
    sourcemap: false,
  },
})
