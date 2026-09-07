import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? '/punch-ai/' : '/',
  server: {
    host: '0.0.0.0',
    port: 5173,
    hmr: {
      clientPort: 443,
    },
    // @ts-ignore
    allowedHosts: true,
    headers: {
      'X-Frame-Options': 'ALLOWALL'
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
  }
}))
