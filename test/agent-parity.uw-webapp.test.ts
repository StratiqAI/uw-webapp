/**
 * Parity: uw-webapp `src/lib` implementations vs demo baseline contracts.
 */
import { renderAssistantMarkdown } from '$lib/ai/safe-marked.js';
import { DocumentMetadataParser, StructuredVisionAnswerParser } from '$lib/agent-tools/parsers.js';
import { runMarkdownContractTests, runParserContractTests } from './contracts/index.js';

runParserContractTests({
	DocumentMetadataParser,
	StructuredVisionAnswerParser
});
runMarkdownContractTests(renderAssistantMarkdown);
