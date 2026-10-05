import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Банк вопросов живёт в qux/design/questions — единый источник для вёрстки и валидатора.
const questionsDir = path.resolve(import.meta.dirname, '../../design/questions')

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      '@questions': questionsDir,
    },
  },
  server: {
    host: true,
    // Туннель отдаёт случайный хост — пускаем любой в dev.
    allowedHosts: true,
    fs: { allow: [import.meta.dirname, questionsDir] },
  },
})
