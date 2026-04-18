import DOMPurify from 'isomorphic-dompurify';
import { marked } from 'marked';

marked.setOptions({ async: false, gfm: true, breaks: false });

export function renderAssistantMarkdown(content: string): string {
	if (!content.trim()) return '';
	const raw = marked.parse(content) as string;
	return DOMPurify.sanitize(raw);
}
