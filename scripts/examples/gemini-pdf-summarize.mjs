/**
 * Summarize a PDF with Gemini (Google AI Studio API key).
 *
 * Usage (from uw-webapp):
 *   GEMINI_API_KEY=... node scripts/examples/gemini-pdf-summarize.mjs
 *   GEMINI_API_KEY=... node scripts/examples/gemini-pdf-summarize.mjs https://example.com/doc.pdf
 *   GEMINI_API_KEY=... node scripts/examples/gemini-pdf-summarize.mjs ./path/to/local.pdf
 *
 * Optional env:
 *   GEMINI_PDF_MODEL — default gemini-3-flash-preview
 */

import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { GoogleGenAI } from '@google/genai';

const DEFAULT_PDF_URL =
	'https://discovery.ucl.ac.uk/id/eprint/10089234/1/343019_3_art_0_py4t4l_convrt.pdf';

async function loadPdfBytes(source) {
	if (!source || source.startsWith('http://') || source.startsWith('https://')) {
		const url = source || DEFAULT_PDF_URL;
		const res = await fetch(url);
		if (!res.ok) {
			throw new Error(`Failed to fetch PDF (${res.status}): ${url}`);
		}
		return new Uint8Array(await res.arrayBuffer());
	}
	return readFile(source);
}

async function main() {
	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) {
		console.error('Set GEMINI_API_KEY (e.g. in .env or the shell) and retry.');
		process.exit(1);
	}

	const model = process.env.GEMINI_PDF_MODEL ?? 'gemini-3-flash-preview';
	const source = process.argv[2];
	const instruction = process.argv[3] ?? 'Summarize this document';

	const pdfBytes = await loadPdfBytes(source);
	const base64 = Buffer.from(pdfBytes).toString('base64');

	const ai = new GoogleGenAI({ apiKey });

	const contents = [
		{ text: instruction },
		{
			inlineData: {
				mimeType: 'application/pdf',
				data: base64
			}
		}
	];

	const response = await ai.models.generateContent({
		model,
		contents
	});

	console.log(response.text ?? '(no text in response)');
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
