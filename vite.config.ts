import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'PulsoidSocket',
      fileName: (format) => `index.${format}.js`,
      formats: ['es', 'cjs', 'umd'],
    },
    outDir: 'dist',
    sourcemap: true,
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  server: {
    open: true,
  },
  test: {
    globals: true,
    setupFiles: ['./vitest-setup.ts'],
  },
});
