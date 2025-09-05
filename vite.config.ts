import { defineConfig } from 'vite';
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
    rollupOptions: {
      external: ['isomorphic-ws', 'ws'],
      output: {
        globals: {
          'isomorphic-ws': 'WebSocket',
          ws: 'WebSocket',
        },
      },
    },
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  server: {
    open: true,
  },
});
