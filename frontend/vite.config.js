import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// VITE_BASE: set to "/<repo-name>/" when publishing to GitHub Pages.
// API_PROXY: where the dev server forwards /api (the FastAPI backend).
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true,
    proxy: { '/api': process.env.API_PROXY || 'http://localhost:8000' },
    fs: { allow: ['..'] },
  },
  // build:single inlines every asset (the street photo too) so the page is one file.
  build: { assetsInlineLimit: process.env.SINGLE_FILE ? 100_000_000 : 4096 },
  test: { environment: 'node' },
})
