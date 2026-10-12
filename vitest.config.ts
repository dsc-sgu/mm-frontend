import { defineConfig } from 'vitest/config';
import path from 'path';

const setup = './src/app/testing/setup.ts';

export default defineConfig({
  resolve: {
    alias: {
      '@/features/course/features/attempt-review/providers/worker-pool':
        path.resolve(
          __dirname,
          './src/app/testing/attempt-review-worker-pool.tsx'
        ),
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/**/*.test.ts'],
          setupFiles: [setup],
        },
      },
      {
        extends: true,
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          include: ['src/**/*.test.tsx'],
          setupFiles: [setup, './src/app/testing/dom-setup.ts'],
        },
      },
    ],
  },
});
