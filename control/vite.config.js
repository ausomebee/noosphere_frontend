import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/control/',
  test: {
    globals: true,
    environment: 'jsdom',
    testTimeout: 15000,
    setupFiles: './src/test/setup.js',
    css: true,
    fileParallelism: false,
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
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-redux': ['@reduxjs/toolkit', 'react-redux', 'redux-persist'],
          'vendor-charts': ['apexcharts', 'react-apexcharts'],
          'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/accessibility'],
          'vendor-pdf': ['jspdf', 'jspdf-autotable', 'html2canvas'],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'yup'],
          'vendor-ui': ['react-select', 'react-toastify', 'react-icons'],
          'vendor-payments': ['@stripe/stripe-js', '@stripe/react-stripe-js', '@paypal/react-paypal-js'],
          // Only the address forms need this, and they are lazily routed.
          // Left unnamed it gets hoisted into the entry chunk, because three
          // separate lazy chunks import it.
          'vendor-geo': ['country-region-data'],
        },
      },
    },
  },
})
