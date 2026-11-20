import { defineConfig } from 'vitest/config';

// Local config so Vitest ignores the parent project's Vite/PostCSS setup.
export default defineConfig({
  root: import.meta.dirname,
  css: { postcss: {} },
  test: { include: ['src/**/*.test.ts'] },
});
