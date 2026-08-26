import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import phase6AuthConfig from './vite.config.mjs'

export default defineConfig({
  plugins: [
    ...(phase6AuthConfig.plugins || []),
    react(),
  ],
})
