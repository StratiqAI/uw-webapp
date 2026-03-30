/**
 * Utilities for the admin Knowledge Map page.
 * Schema-to-field conversion, topic counting, and pattern matching.
 */

export interface FieldDescriptor {
	name: string;
	path: string;
	type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'enum' | 'unknown';
	required: boolean;
	description?: string;
	enumValues?: (string | number)[];
	minimum?: number;
	maximum?: number;
	minLength?: number;
	maxLength?: number;
	pattern?: string;
	default?: unknown;
	nullable: boolean;
	children?: FieldDescriptor[];
	itemSchema?: Record<string, unknown>;
}

export function schemaToFields(
	schema: Record<string, unknown>,
	parentPath = '',
	requiredSet?: Set<string>
): FieldDescriptor[] {
	const properties = schema.properties as Record<string, Record<string, unknown>> | undefined;
	if (!properties) return [];

	const required = requiredSet ?? new Set<string>(schema.required as string[] ?? []);
	const fields: FieldDescriptor[] = [];

	for (const [name, prop] of Object.entries(properties)) {
		const path = parentPath ? `${parentPath}.${name}` : name;
		const field = propToField(name, path, prop, required.has(name));
		fields.push(field);
	}

	return fields;
}

function resolveType(prop: Record<string, unknown>): { type: string; nullable: boolean; resolved: Record<string, unknown> } {
	if (prop.anyOf || prop.oneOf) {
		const variants = (prop.anyOf ?? prop.oneOf) as Record<string, unknown>[];
		const nonNull = variants.filter((v) => v.type !== 'null');
		const nullable = variants.some((v) => v.type === 'null');
		const primary = nonNull[0] ?? {};
		return { type: (primary.type as string) ?? 'unknown', nullable, resolved: { ...prop, ...primary } };
	}
	if (Array.isArray(prop.type)) {
		const types = prop.type as string[];
		const nullable = types.includes('null');
		const primary = types.find((t) => t !== 'null') ?? 'unknown';
		return { type: primary, nullable, resolved: prop };
	}
	return { type: (prop.type as string) ?? 'unknown', nullable: false, resolved: prop };
}

function propToField(name: string, path: string, prop: Record<string, unknown>, isRequired: boolean): FieldDescriptor {
	const { type, nullable, resolved } = resolveType(prop);

	if (resolved.enum) {
		return {
			name, path, type: 'enum', required: isRequired, nullable,
			description: resolved.description as string | undefined,
			enumValues: resolved.enum as (string | number)[],
			default: resolved.default
		};
	}

	const base: FieldDescriptor = {
		name, path, required: isRequired, nullable,
		type: (['string', 'number', 'integer', 'boolean', 'array', 'object'].includes(type)
			? type : 'unknown') as FieldDescriptor['type'],
		description: resolved.description as string | undefined,
		minimum: resolved.minimum as number | undefined,
		maximum: resolved.maximum as number | undefined,
		minLength: resolved.minLength as number | undefined,
		maxLength: resolved.maxLength as number | undefined,
		pattern: resolved.pattern as string | undefined,
		default: resolved.default
	};

	if (type === 'object' && resolved.properties) {
		base.children = schemaToFields(resolved as Record<string, unknown>, path);
	}

	if (type === 'array' && resolved.items) {
		base.itemSchema = resolved.items as Record<string, unknown>;
		if ((resolved.items as Record<string, unknown>).properties) {
			base.children = schemaToFields(resolved.items as Record<string, unknown>, `${path}[]`);
		}
	}

	return base;
}

export function countTopics(tree: Record<string, unknown>, prefix = ''): { total: number; paths: string[] } {
	let total = 0;
	const paths: string[] = [];

	for (const [key, value] of Object.entries(tree)) {
		const path = prefix ? `${prefix}/${key}` : key;
		if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
			const sub = countTopics(value as Record<string, unknown>, path);
			total += sub.total;
			paths.push(...sub.paths);
		} else {
			total++;
			paths.push(path);
		}
	}

	return { total, paths };
}

export function collectAllPaths(tree: Record<string, unknown>, prefix = ''): string[] {
	const paths: string[] = [];
	for (const [key, value] of Object.entries(tree)) {
		const path = prefix ? `${prefix}/${key}` : key;
		paths.push(path);
		if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
			paths.push(...collectAllPaths(value as Record<string, unknown>, path));
		}
	}
	return paths;
}

export function findMatchingTopics(
	tree: Record<string, unknown>,
	pattern: string,
	prefix = ''
): string[] {
	const regexSource = pattern
		.replace(/[.?^${}()|[\]\\]/g, '\\$&')
		.replace(/\+/g, '[^/]+')
		.replace(/#/g, '.*');
	const regex = new RegExp(`^${regexSource}$`);
	const all = collectAllPaths(tree, prefix);
	return all.filter((p) => regex.test(p));
}

export function getValueType(value: unknown): string {
	if (value === null) return 'null';
	if (value === undefined) return 'undefined';
	if (Array.isArray(value)) return 'array';
	return typeof value;
}

export function formatJson(value: unknown): string {
	try {
		return JSON.stringify(value, null, 2);
	} catch {
		return String(value);
	}
}
