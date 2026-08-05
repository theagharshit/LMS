import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@utils': path.resolve(__dirname, './src/utils'),
      '@db': path.resolve(__dirname, './src/db'),
      '@middlewares': path.resolve(__dirname, './src/middlewares'),
      '@types': path.resolve(__dirname, './src/types'),
      '@': path.resolve(__dirname, './'),
    },
  },
});
