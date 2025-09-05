import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'PulsoidSocket',
      fileName: (format) => `index.${format}.js`,
      formats: ['es', 'cjs', 'umd']
    },
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      external: [],
      output: {
        globals: {}
      }
    }
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  server: {
    open: true
  }
})