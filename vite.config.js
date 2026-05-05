import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? '/value-stock-screener/' : '/',
  // Force Vite to pre-bundle supabase-js so Rolldown doesn't hit TDZ issues
  optimizeDeps: {
    include: ['@supabase/supabase-js'],
  },
})
