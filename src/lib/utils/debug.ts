import { createLogger } from './logger';

const legacyLogger = createLogger('legacy');

/**
 * @deprecated Use `createLogger(namespace)` from `$lib/utils/logger` instead.
 *
 * Legacy debug logging function preserved for backward compatibility.
 * Delegates to `createLogger('legacy').debug(...)`.
 */
export function logger(...args: any[]) {
	legacyLogger.debug(...args);
}
