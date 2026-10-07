import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  configFile: false,
  build: {
    ssr: resolve(projectRoot, 'server/index.ts'),
    target: 'node22',
    outDir: resolve(projectRoot, 'server-dist'),
    emptyOutDir: true,
    rollupOptions: {
      external: ['node:crypto', 'node:http', 'node:sqlite', 'node:fs/promises', 'node:path'],
      output: { format: 'es', entryFileNames: 'server.js' },
    },
  },
})
