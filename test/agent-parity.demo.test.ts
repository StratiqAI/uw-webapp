/**
 * Baseline: implementations from vendored `packages/sveltekit-agent-demo`.
 */
import { DocumentMetadataParser, StructuredVisionAnswerParser } from '../packages/sveltekit-agent-demo/src/lib/agent-tools/parsers.js';
import { renderMarkdown } from '../packages/sveltekit-agent-demo/src/lib/renderMarkdown.js';
import { runMarkdownContractTests, runParserContractTests } from './contracts/index.js';

runParserContractTests({
	DocumentMetadataParser,
	StructuredVisionAnswerParser
});
runMarkdownContractTests(renderMarkdown);
