import { PUBLIC_LOG_LEVEL } from '$env/static/public';
import { browser } from '$app/environment';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'off';

export interface Logger {
	debug(...args: unknown[]): void;
	info(...args: unknown[]): void;
	warn(...args: unknown[]): void;
	error(...args: unknown[]): void;
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
	off: 4
};

const NOOP = (..._args: unknown[]): void => {};

const NOOP_LOGGER: Logger = {
	debug: NOOP,
	info: NOOP,
	warn: NOOP,
	error: NOOP
};

let currentLevel: LogLevel = parseLevel(PUBLIC_LOG_LEVEL) ?? 'warn';
let namespaceFilter: string | RegExp | null = null;
const loggers: Set<{ ns: string; refresh: () => void }> = new Set();

function parseLevel(raw: string | undefined): LogLevel | undefined {
	if (!raw) return undefined;
	const lower = raw.toLowerCase().trim() as LogLevel;
	return lower in LEVEL_PRIORITY ? lower : undefined;
}

function isEnabled(msgLevel: LogLevel, ns: string): boolean {
	if (currentLevel === 'off') return false;
	if (LEVEL_PRIORITY[msgLevel] < LEVEL_PRIORITY[currentLevel]) return false;
	if (namespaceFilter !== null) {
		if (typeof namespaceFilter === 'string') {
			if (ns !== namespaceFilter) return false;
		} else {
			if (!namespaceFilter.test(ns)) return false;
		}
	}
	return true;
}

function buildLogger(ns: string): Logger {
	if (!__LOG_ENABLED__) return NOOP_LOGGER;
	if (currentLevel === 'off') return NOOP_LOGGER;

	const prefix = `[${ns}]`;
	return {
		debug: isEnabled('debug', ns)
			? (...args: unknown[]) => console.debug(prefix, ...args)
			: NOOP,
		info: isEnabled('info', ns)
			? (...args: unknown[]) => console.info(prefix, ...args)
			: NOOP,
		warn: isEnabled('warn', ns)
			? (...args: unknown[]) => console.warn(prefix, ...args)
			: NOOP,
		error: isEnabled('error', ns)
			? (...args: unknown[]) => console.error(prefix, ...args)
			: NOOP
	};
}

/**
 * Create a namespaced logger. Each method is a direct no-op when its level
 * is below the current threshold, so there is zero overhead for disabled levels.
 *
 * When the global level or namespace filter changes via `setLogLevel` /
 * `setNamespaceFilter`, all previously created loggers are refreshed.
 */
export function createLogger(namespace: string): Logger {
	if (!__LOG_ENABLED__) return NOOP_LOGGER;

	let current = buildLogger(namespace);
	const proxy: Logger = {
		get debug() { return current.debug; },
		get info() { return current.info; },
		get warn() { return current.warn; },
		get error() { return current.error; }
	};

	const entry = {
		ns: namespace,
		refresh: () => { current = buildLogger(namespace); }
	};
	loggers.add(entry);

	return proxy;
}

function refreshAll(): void {
	for (const entry of loggers) entry.refresh();
}

export function setLogLevel(level: LogLevel): void {
	currentLevel = level;
	refreshAll();
}

export function getLogLevel(): LogLevel {
	return currentLevel;
}

/**
 * Filter log output to namespaces matching the given string or regex.
 * Pass `null` to clear the filter and show all namespaces.
 */
export function setNamespaceFilter(filter: string | RegExp | null): void {
	namespaceFilter = filter;
	refreshAll();
}

if (__LOG_ENABLED__ && browser) {
	(window as any).__setLogLevel = setLogLevel;
	(window as any).__setLogFilter = setNamespaceFilter;
	(window as any).__getLogLevel = getLogLevel;
}
