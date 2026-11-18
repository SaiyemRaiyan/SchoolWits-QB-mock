import { defineConfig } from 'vitest/config';

// Vitest (not Jest) because backend/ is already "type": "module" + NodeNext +
// strict TS — Vitest runs that natively, where Jest would need ts-jest plus
// ESM workarounds to reach the same place.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Pinned, not '.': the Next app at the repo root has its own package.json
    // now, and Vite would otherwise walk up and resolve the workspace there,
    // where vitest is not installed. Tests reach outside backend/ via absolute
    // paths built from import.meta.url, which this does not affect.
    root: import.meta.dirname,
  },
});
