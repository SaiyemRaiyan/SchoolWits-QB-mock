import { defineConfig } from 'vitest/config';

// Vitest (not Jest) because backend/ is already "type": "module" + NodeNext +
// strict TS — Vitest runs that natively, where Jest would need ts-jest plus
// ESM workarounds to reach the same place.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Integration tests read the real .tex papers from OUTSIDE backend/ (see
    // tests/integration/), so the root has to be the repo, not backend/.
    root: '.',
  },
});
