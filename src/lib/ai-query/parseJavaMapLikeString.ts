/**
 * Parse strings like Java Map/List `toString()`:
 * `{brokers=[{phone=206.708.9420, name=Jane Doe, email=a@b.com}]}` → plain objects/arrays
 * (keys unquoted, `=` instead of `:`, arrays use `[` `]`).
 */

const SIMPLE_NUMBER = /^\d+(\.\d+)?$/;

export function parseJavaMapLikeString(raw: string): unknown {
	const input = raw.trim();
	let i = 0;
	const len = input.length;

	const peek = () => input[i];

	function skipWs() {
		while (i < len && /\s/.test(peek())) i++;
	}

	function parseIdent(): string {
		if (i >= len || !/[a-zA-Z_]/.test(peek())) {
			throw new Error('expected identifier');
		}
		const start = i;
		i++;
		while (i < len && /[a-zA-Z0-9_]/.test(peek())) i++;
		return input.slice(start, i);
	}

	function parseScalar(): string | number {
		skipWs();
		const start = i;
		if (i < len && /\d/.test(peek())) {
			while (i < len && /[\d.]/.test(peek())) i++;
			const slice = input.slice(start, i);
			if (SIMPLE_NUMBER.test(slice)) {
				return slice.includes('.') ? parseFloat(slice) : parseInt(slice, 10);
			}
			i = start;
		}
		while (i < len && peek() !== ',' && peek() !== '}' && peek() !== ']') {
			i++;
		}
		return input.slice(start, i).trim();
	}

	function parseValue(): unknown {
		skipWs();
		const c = peek();
		if (c === '{') return parseObject();
		if (c === '[') return parseArray();
		return parseScalar();
	}

	function parseObject(): Record<string, unknown> {
		if (peek() !== '{') throw new Error('expected {');
		i++;
		const obj: Record<string, unknown> = {};
		skipWs();
		while (i < len && peek() !== '}') {
			const key = parseIdent();
			skipWs();
			if (peek() !== '=') throw new Error('expected =');
			i++;
			obj[key] = parseValue();
			skipWs();
			if (peek() === ',') {
				i++;
				skipWs();
			}
		}
		if (peek() !== '}') throw new Error('expected }');
		i++;
		return obj;
	}

	function parseArray(): unknown[] {
		if (peek() !== '[') throw new Error('expected [');
		i++;
		skipWs();
		const arr: unknown[] = [];
		while (i < len && peek() !== ']') {
			arr.push(parseValue());
			skipWs();
			if (peek() === ',') {
				i++;
				skipWs();
			}
		}
		if (peek() !== ']') throw new Error('expected ]');
		i++;
		return arr;
	}

	skipWs();
	const result = parseValue();
	skipWs();
	if (i < len) throw new Error('trailing data');
	return result;
}
