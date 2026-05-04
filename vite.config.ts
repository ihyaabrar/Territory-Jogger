/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split heavy libraries into separate chunks for better caching
          'vendor-react': ['react', 'react-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-turf': ['@turf/turf'],
          // Leaflet is already lazy-loaded via dynamic import in MapView
          // so it naturally splits itself
        },
      },
    },
    // Raise warning threshold slightly since we now have proper splitting
    chunkSizeWarningLimit: 400,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/**/*.d.ts', 'src/**/*.test.ts', 'src/**/*.test.tsx', 'src/test/**'],
    },
  },
})
