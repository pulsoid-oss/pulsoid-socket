import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: resolve(__dirname, 'example'),
  base: '/pulsoid-socket/',
  build: {
    outDir: resolve(__dirname, 'demo-dist'),
    emptyOutDir: true,
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
});
