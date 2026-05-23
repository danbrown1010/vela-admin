import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'fs'

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8'))
const buildDate = new Date().toISOString().split('T')[0]

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    define: {
      __APP_VERSION__: JSON.stringify(version),
      __BUILD_DATE__: JSON.stringify(buildDate),
      __ENV_LABEL__: JSON.stringify(env.VITE_ENV_LABEL || ''),
    },
    plugins: [react(), tailwindcss()],
    base: '/',
    server: {
      port: 5174,
      strictPort: true,
    },
  }
})
