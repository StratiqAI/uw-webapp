import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { searchForWorkspaceRoot } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ command }) => ({
	plugins: [tailwindcss(), sveltekit()],
	preview: {
		port: 5173
	},
	...(command === 'serve'
		? {
				resolve: {
					// Compile workspace packages from `src/lib` so HMR works without
					// `svelte-package --watch`. Production builds use `dist/` via package.json.
					alias: {
						'@stratiqai/dashboard-widget-sdk': path.resolve(__dirname, 'packages/dashboard-widget-sdk/src/lib'),
						'@stratiqai/widget-metric': path.resolve(__dirname, 'packages/widget-metric/src/lib')
					}
				}
			}
		: {}),
	server: {
		fs: {
			allow: [searchForWorkspaceRoot(process.cwd()), 'packages']
		}
	},
	ssr: {
		noExternal: ['@stratiqai/dashboard-widget-sdk', '@stratiqai/widget-metric']
	}
}));
