import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteCompression from 'vite-plugin-compression'

export default defineConfig({
  plugins: [
    react(),
    viteCompression({
      algorithm: 'brotliCompress', // or 'gzip'
      ext: '.br',                  // file extension for compressed assets
      threshold: 10240,             // only compress files > 10kb
      deleteOriginFile: false       // keep original uncompressed files
    })
  ],
  server: {
    allowedHosts: [
      'gabrielle-unshedding-unsymmetrically.ngrok-free.dev'
    ]
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          ui: ['@mui/material', 'tailwindcss'],
          supabase: ['@supabase/supabase-js'],
          // add validation libs here if needed
        }
      }
    }
  }
})
