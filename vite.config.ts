import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // three.js (~1 MB) is lazy-loaded only by the landing page's globe
    chunkSizeWarningLimit: 1200,
    rolldownOptions: {
      output: {
        // Keep the heavy, chapter-specific libraries out of the first paint.
        advancedChunks: {
          groups: [
            { name: 'katex', test: /node_modules[\\/]katex/ },
            { name: 'gsap', test: /node_modules[\\/]gsap/ },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
})
