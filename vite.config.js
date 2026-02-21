import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  appType: 'mpa',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        sentiment: resolve(__dirname, 'pages/sentiment/index.html'),
        'image-classify': resolve(__dirname, 'pages/image-classify/index.html'),
      },
    },
  },
  optimizeDeps: {
    exclude: ['@huggingface/transformers'],
  },
});
