import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Set base to repo name for GitHub Pages deployment
  // Change 'value-stock-screener' if your repo has a different name
  base: process.env.NODE_ENV === 'production' ? '/value-stock-screener/' : '/',
})
