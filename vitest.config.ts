import { defineConfig } from 'vitest/config';

// Data-layer tests run in Node against an in-memory better-sqlite3 DB — no DOM needed.
// Component/RTL tests (jsdom) arrive with the UI milestones and can be added as a second
// project or environment override then.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
