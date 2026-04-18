import { describe, expect, it } from 'vitest';

export interface ParserContractImplementations {
	DocumentMetadataParser: new () => {
		toNumber(value: unknown): number | null;
		asBoundingBox(value: unknown): {
			xMin: number;
			xMax: number;
			yMin: number;
			yMax: number;
		} | null;
	};
	StructuredVisionAnswerParser: new () => {
		parseStructuredAnswer(raw: string): { answer: string; relevantTexts: string[] };
	};
}

/** Parser expectations aligned with `packages/sveltekit-agent-demo` baseline. */
export function runParserContractTests(impl: ParserContractImplementations): void {
	describe('DocumentMetadataParser', () => {
		const parser = new impl.DocumentMetadataParser();

		it('parses numeric strings', () => {
			expect(parser.toNumber('42')).toBe(42);
			expect(parser.toNumber('')).toBe(0);
			expect(parser.toNumber('x')).toBe(null);
		});

		it('parses bounding boxes from objects', () => {
			expect(parser.asBoundingBox({ xMin: 0, xMax: 10, yMin: 5, yMax: 15 })).toEqual({
				xMin: 0,
				xMax: 10,
				yMin: 5,
				yMax: 15
			});
		});

		it('parses bounding boxes from x/y/width/height', () => {
			expect(parser.asBoundingBox({ x: 1, y: 2, w: 3, h: 4 })).toEqual({
				xMin: 1,
				xMax: 4,
				yMin: 2,
				yMax: 6
			});
		});
	});

	describe('StructuredVisionAnswerParser', () => {
		const parser = new impl.StructuredVisionAnswerParser();

		it('extracts JSON fenced blocks', () => {
			const raw = 'Prefix\n```json\n{"answer":"ok","relevantTexts":["a"]}\n```';
			expect(parser.parseStructuredAnswer(raw)).toEqual({
				answer: 'ok',
				relevantTexts: ['a']
			});
		});

		it('falls back to raw text when JSON is invalid', () => {
			const raw = '```json\nnot json\n```';
			expect(parser.parseStructuredAnswer(raw)).toEqual({ answer: raw, relevantTexts: [] });
		});
	});
}
