import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['html', 'lcov', 'text'],
      thresholds: {
        lines: 70
      },
      include: ['src/**/*.{ts,tsx}'],
    }
  }
});
