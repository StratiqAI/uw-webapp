import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		// Use jsdom environment for DOM APIs (needed for Svelte / isomorphic-dompurify)
		environment: 'jsdom',
		include: ['src/**/*.{test,spec}.{js,ts}', 'test/**/*.{test,spec}.{js,ts}'],
		// Setup files
		setupFiles: [],
		// Coverage configuration
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: [
				'node_modules/',
				'src/**/*.d.ts',
				'src/**/*.test.ts',
				'src/**/*.spec.ts'
			]
		},
		// Globals (enable for jest-like API)
		globals: true
	}
});
