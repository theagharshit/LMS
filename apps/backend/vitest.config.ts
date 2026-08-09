import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    fileParallelism: false,
    globalSetup: ['./tests/globalSetup.ts'],
  },
  resolve: {
    alias: {
      '@utils': path.resolve(__dirname, './src/utils'),
      '@controllers': path.resolve(__dirname, './src/controllers'),
      '@routes': path.resolve(__dirname, './src/routes'),
      '@db': path.resolve(__dirname, './src/db'),
      '@middlewares': path.resolve(__dirname, './src/middlewares'),
      '@types': path.resolve(__dirname, './src/types'),
      '@': path.resolve(__dirname, './'),
    },
  },
});
