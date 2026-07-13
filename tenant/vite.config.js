import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// `command` is 'build' for `vite build` and 'serve' for the dev server, so
// console/debugger are stripped from production bundles only — dev and the
// vitest run (which loads config in serve mode) keep their logging.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: '/tenant/',
  esbuild: {
    drop: command === 'build' ? ['console', 'debugger'] : [],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: true,
  },
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-redux': ['@reduxjs/toolkit', 'react-redux', 'redux-persist'],
          'vendor-charts': ['apexcharts', 'react-apexcharts'],
          'vendor-pdf': ['jspdf', 'jspdf-autotable', 'html2canvas'],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'yup'],
          'vendor-ui': ['react-select', 'react-toastify', 'react-icons'],
        },
      },
    },
  },
}))
