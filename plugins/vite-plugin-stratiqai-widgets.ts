import fs from 'node:fs';
import path from 'node:path';
import type { Plugin, ResolvedConfig, UserConfig } from 'vite';

const VIRTUAL_MODULE_ID = 'virtual:stratiqai-widgets';
const RESOLVED_VIRTUAL_MODULE_ID = '\0virtual:stratiqai-widgets';
const SDK_PKG_NAME = '@stratiqai/dashboard-widget-sdk';
const SDK_DIR_NAME = 'dashboard-widget-sdk';

interface StratiqaiField {
	widget: boolean;
	manifest: string;
	manifestExport: string;
}

interface DiscoveredWidget {
	packageName: string;
	dirName: string;
	manifestExport: string;
}

interface PluginOptions {
	root?: string;
}

function discoverWidgets(packagesDir: string): DiscoveredWidget[] {
	if (!fs.existsSync(packagesDir)) return [];

	const entries = fs.readdirSync(packagesDir, { withFileTypes: true });
	const widgets: DiscoveredWidget[] = [];

	for (const entry of entries) {
		if (!entry.isDirectory() || !entry.name.startsWith('widget-')) continue;

		const pkgJsonPath = path.join(packagesDir, entry.name, 'package.json');
		if (!fs.existsSync(pkgJsonPath)) continue;

		try {
			const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
			const stratiqai: StratiqaiField | undefined = pkgJson.stratiqai;

			if (!stratiqai?.widget) continue;

			widgets.push({
				packageName: pkgJson.name as string,
				dirName: entry.name,
				manifestExport: stratiqai.manifestExport
			});
		} catch {
			// Skip packages with malformed package.json
		}
	}

	return widgets;
}

function generateVirtualModuleCode(widgets: DiscoveredWidget[]): string {
	if (widgets.length === 0) {
		return 'export const widgets = [];\n';
	}

	const imports = widgets
		.map((w) => `import { ${w.manifestExport} } from '${w.packageName}';`)
		.join('\n');

	const exports = widgets.map((w) => w.manifestExport).join(', ');

	return `${imports}\nexport const widgets = [${exports}];\n`;
}

function buildAliases(
	packagesDir: string,
	widgets: DiscoveredWidget[]
): Record<string, string> {
	const aliases: Record<string, string> = {
		[SDK_PKG_NAME]: path.resolve(packagesDir, SDK_DIR_NAME, 'src', 'lib')
	};

	for (const w of widgets) {
		aliases[w.packageName] = path.resolve(packagesDir, w.dirName, 'src', 'lib');
	}

	return aliases;
}

function buildNoExternalList(widgets: DiscoveredWidget[]): string[] {
	return [SDK_PKG_NAME, ...widgets.map((w) => w.packageName)];
}

export default function stratiqaiWidgets(options?: PluginOptions): Plugin {
	const root = options?.root ?? process.cwd();
	const packagesDir = path.resolve(root, 'packages');

	let resolvedConfig: ResolvedConfig;
	let widgets: DiscoveredWidget[] = [];

	return {
		name: 'stratiqai-widgets',
		enforce: 'pre',

		config(): Partial<UserConfig> {
			widgets = discoverWidgets(packagesDir);
			const aliases = buildAliases(packagesDir, widgets);
			const noExternal = buildNoExternalList(widgets);

			return {
				resolve: {
					alias: aliases
				},
				ssr: {
					noExternal
				}
			};
		},

		configResolved(config) {
			resolvedConfig = config;
		},

		resolveId(id) {
			if (id === VIRTUAL_MODULE_ID) {
				return RESOLVED_VIRTUAL_MODULE_ID;
			}
		},

		load(id) {
			if (id === RESOLVED_VIRTUAL_MODULE_ID) {
				return generateVirtualModuleCode(widgets);
			}
		},

		configureServer(server) {
			const watchPattern = path.join(packagesDir, '*', 'package.json');
			server.watcher.add(watchPattern);

			server.watcher.on('change', (changedPath) => {
				const normalized = changedPath.replace(/\\/g, '/');
				if (!normalized.includes('/packages/') || !normalized.endsWith('package.json')) {
					return;
				}

				const prevCode = generateVirtualModuleCode(widgets);
				widgets = discoverWidgets(packagesDir);
				const nextCode = generateVirtualModuleCode(widgets);

				if (prevCode !== nextCode) {
					const mod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_MODULE_ID);
					if (mod) {
						server.moduleGraph.invalidateModule(mod);
						server.ws.send({ type: 'full-reload', path: '*' });
					}
				}
			});
		}
	};
}
