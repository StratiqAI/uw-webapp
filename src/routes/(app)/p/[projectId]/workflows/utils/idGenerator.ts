/**
 * Generate a unique ID for workflow elements
 */
export function generateId(): string {
	return `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
