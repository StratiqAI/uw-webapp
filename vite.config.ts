import { fileURLToPath } from 'node:url';
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { searchForWorkspaceRoot } from 'vite';
import stratiqaiWidgets from './plugins/vite-plugin-stratiqai-widgets.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => ({
	plugins: [tailwindcss(), stratiqaiWidgets({ root: __dirname }), sveltekit()],
	define: {
		__LOG_ENABLED__: JSON.stringify(mode !== 'production')
	},
	build: {
		chunkSizeWarningLimit: 2500
	},
	preview: {
		port: 5173
	},
	optimizeDeps: {
		include: [
			'flowbite-svelte',
			'flowbite-svelte-icons',
			'zod',
			'zod-to-json-schema',
			'ajv',
			'ajv-formats',
			'openai/helpers/zod',
			'@stratiqai/types-simple',
			'graphql',
			'graphql-tag',
			'runes-meta-tags',
			'uuid',
			'marked',
			'pdfjs-dist',
			'@supabase/ssr',
			'@flowbite-svelte-plugins/chart',
			'd3'
		]
	},
	server: {
		fs: {
			allow: [searchForWorkspaceRoot(process.cwd()), 'packages']
		}
	},
}));
