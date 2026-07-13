import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/client/',
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    css: true,
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
          'vendor-payments': ['@stripe/stripe-js', '@stripe/react-stripe-js', '@paypal/react-paypal-js'],
        },
      },
    },
    sourcemap: false,
  },
})
