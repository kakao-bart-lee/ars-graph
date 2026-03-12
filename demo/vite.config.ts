import { defineConfig } from 'vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const demoDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  root: demoDir,
  resolve: {
    alias: {
      'ars-graph-lib': path.resolve(demoDir, '../src/index.ts'),
    },
  },
  build: {
    outDir: path.resolve(demoDir, 'dist'),
    emptyOutDir: true,
  },
})
