import { describe, expect, it } from 'vitest';

/** Markdown expectations aligned with `packages/sveltekit-agent-demo` `renderMarkdown`. */
export function runMarkdownContractTests(render: (markdown: string) => string): void {
	describe('assistant markdown → sanitized HTML', () => {
		it('returns empty string for whitespace-only input', () => {
			expect(render('   \n\t  ')).toBe('');
		});

		it('renders inline markdown to sanitized HTML', () => {
			const html = render('Hello **world**');
			expect(html).toContain('Hello');
			expect(html).toContain('world');
			expect(html).toContain('<strong>');
		});
	});
}
