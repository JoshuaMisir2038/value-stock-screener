import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? '/value-stock-screener/' : '/',
  // Supabase is loaded from a CDN script tag in index.html.
  // Mark it external so Rolldown doesn't bundle it (bundling causes TDZ crash).
  build: {
    rollupOptions: {
      external: ['@supabase/supabase-js'],
      output: {
        globals: { '@supabase/supabase-js': 'supabase' },
      },
    },
  },
})
