import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 30000,
    isolate: true,
    poolOptions: {
      threads: { singleThread: true },
      forks: { singleFork: true }
    },
    coverage: {
      provider: 'v8',
      reporter: ['html', 'lcov', 'text'],
      thresholds: {
        lines: 80,
        branches: 75,
      },
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts']
    }
  }
});
