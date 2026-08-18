import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Matches the backend's default CORS_ORIGINS (http://localhost:8080).
  server: {
    port: 8080,
  },
})
