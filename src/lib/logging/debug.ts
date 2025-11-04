/**
 * Debug logging function that only logs if PUBLIC_LOG_LEVEL is set to 'DEBUG'.
 * @param args - The arguments to log.
 */
import { PUBLIC_LOG_LEVEL } from '$env/static/public';

export function logger(...args: any[]) {
	if (PUBLIC_LOG_LEVEL === 'DEBUG') {
		console.log(...args);
	}
}