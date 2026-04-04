/**
 * Pure utility functions for detecting, extracting, and parsing
 * markdown tables embedded in text blocks.
 */

export function containsMarkdownTable(text: string): boolean {
	if (!text) return false;
	const separatorPattern = /^\s*\|?\s*[-:]+\s*\|[-:\s|]+\s*$/m;
	return separatorPattern.test(text);
}

export function extractMarkdownTables(text: string): string[] {
	if (!text) return [];

	const lines = text.split('\n');
	const tables: string[] = [];
	let currentTable: string[] = [];
	let inTable = false;
	let foundSeparator = false;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();

		const isTableRow =
			line.includes('|') &&
			(line.startsWith('|') || line.endsWith('|') || line.split('|').length >= 2);

		const isSeparator = /^\|?\s*[-:]+\s*\|[-:\s|]+$/.test(line);

		if (isTableRow) {
			if (!inTable) {
				inTable = true;
				currentTable = [line];
				foundSeparator = false;
			} else {
				currentTable.push(line);
			}

			if (isSeparator) {
				foundSeparator = true;
			}
		} else {
			if (inTable && foundSeparator && currentTable.length >= 3) {
				tables.push(currentTable.join('\n'));
			}
			inTable = false;
			currentTable = [];
			foundSeparator = false;
		}
	}

	if (inTable && foundSeparator && currentTable.length >= 3) {
		tables.push(currentTable.join('\n'));
	}

	return tables;
}

export function parseMarkdownTable(markdown: string): { headers: string[]; rows: string[][] } {
	const lines = markdown.split('\n').filter((line) => line.trim());

	if (lines.length < 2) {
		return { headers: [], rows: [] };
	}

	const headerLine = lines[0];
	const headers = headerLine
		.split('|')
		.map((cell) => cell.trim())
		.filter((cell) => cell !== '');

	const rows: string[][] = [];
	for (let i = 2; i < lines.length; i++) {
		const cells = lines[i]
			.split('|')
			.map((cell) => cell.trim())
			.filter((cell) => cell !== '');

		if (cells.length > 0) {
			rows.push(cells);
		}
	}

	return { headers, rows };
}
