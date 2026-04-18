import { defineWorkspace } from 'vitest/config';

/** Root app parity tests + optional demo-package Vitest project (may have no tests). */
export default defineWorkspace(['./vitest.config.ts', './packages/sveltekit-agent-demo/vite.config.ts']);
