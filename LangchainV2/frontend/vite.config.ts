import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: "/smartagent",
  plugins: [react()],
  server: {
    port: 3000,
    allowedHosts: true,
  },
})
