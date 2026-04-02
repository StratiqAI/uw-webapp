import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { searchForWorkspaceRoot } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => ({
	plugins: [tailwindcss(), sveltekit()],
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
	resolve: {
		alias: {
			'@stratiqai/dashboard-widget-sdk': path.resolve(__dirname, 'packages/dashboard-widget-sdk/src/lib'),
			'@stratiqai/widget-metric': path.resolve(__dirname, 'packages/widget-metric/src/lib'),
			'@stratiqai/widget-json-viewer': path.resolve(__dirname, 'packages/widget-json-viewer/src/lib'),
			'@stratiqai/widget-broker-card': path.resolve(__dirname, 'packages/widget-broker-card/src/lib'),
			'@stratiqai/widget-lq-analysis': path.resolve(__dirname, 'packages/widget-lq-analysis/src/lib'),
			'@stratiqai/widget-table': path.resolve(__dirname, 'packages/widget-table/src/lib'),
			'@stratiqai/widget-pro-forma-base': path.resolve(__dirname, 'packages/widget-pro-forma-base/src/lib'),
			'@stratiqai/widget-pro-forma-revenue': path.resolve(__dirname, 'packages/widget-pro-forma-revenue/src/lib'),
			'@stratiqai/widget-pro-forma-opex': path.resolve(__dirname, 'packages/widget-pro-forma-opex/src/lib'),
			'@stratiqai/widget-pro-forma-noi': path.resolve(__dirname, 'packages/widget-pro-forma-noi/src/lib'),
			'@stratiqai/widget-pro-forma-unlevered-cf': path.resolve(__dirname, 'packages/widget-pro-forma-unlevered-cf/src/lib'),
			'@stratiqai/widget-pro-forma-levered-cf': path.resolve(__dirname, 'packages/widget-pro-forma-levered-cf/src/lib'),
			'@stratiqai/widget-pro-forma-unlevered-returns': path.resolve(__dirname, 'packages/widget-pro-forma-unlevered-returns/src/lib'),
			'@stratiqai/widget-pro-forma-levered-returns': path.resolve(__dirname, 'packages/widget-pro-forma-levered-returns/src/lib'),
			'@stratiqai/widget-econ-base-multiplier': path.resolve(__dirname, 'packages/widget-econ-base-multiplier/src/lib'),
			'@stratiqai/widget-industry-trend-scorecard': path.resolve(__dirname, 'packages/widget-industry-trend-scorecard/src/lib'),
			'@stratiqai/widget-lfpr-dashboard': path.resolve(__dirname, 'packages/widget-lfpr-dashboard/src/lib'),
			'@stratiqai/widget-mapbox-3d': path.resolve(__dirname, 'packages/widget-mapbox-3d/src/lib')
		}
	},
	server: {
		fs: {
			allow: [searchForWorkspaceRoot(process.cwd()), 'packages']
		}
	},
	ssr: {
		noExternal: [
			'@stratiqai/dashboard-widget-sdk',
			'@stratiqai/widget-metric',
			'@stratiqai/widget-json-viewer',
			'@stratiqai/widget-broker-card',
			'@stratiqai/widget-lq-analysis',
			'@stratiqai/widget-table',
			'@stratiqai/widget-pro-forma-base',
			'@stratiqai/widget-pro-forma-revenue',
			'@stratiqai/widget-pro-forma-opex',
			'@stratiqai/widget-pro-forma-noi',
			'@stratiqai/widget-pro-forma-unlevered-cf',
			'@stratiqai/widget-pro-forma-levered-cf',
			'@stratiqai/widget-pro-forma-unlevered-returns',
			'@stratiqai/widget-pro-forma-levered-returns',
			'@stratiqai/widget-econ-base-multiplier',
			'@stratiqai/widget-industry-trend-scorecard',
			'@stratiqai/widget-lfpr-dashboard',
			'@stratiqai/widget-mapbox-3d'
		]
	}
}));
