import { documentKnowledgeBaseNode } from './tools/documentKnowledgeBase';
import { mcpServerNode } from './tools/mcpServer';
import { usCensusNode } from './tools/usCensus';
import { eventNode } from './inputs/event';
import { onDocumentUploadNode } from './inputs/onDocumentUpload';
import { onImageNode } from './inputs/onImage';
import { onTextNode } from './inputs/onText';
import { onTableNode } from './inputs/onTable';
import { calculateNoiNode } from './processes/calculateNoi';
import { calculateCapRateNode } from './processes/calculateCapRate';
import { calculateDscrNode } from './processes/calculateDscr';
import { calculateCashFlowNode } from './processes/calculateCashFlow';
import { aiQueryNode } from './ai/aiQueryNode';
import { investmentReportNode } from './outputs/investmentReport';
import { financialSummaryNode } from './outputs/financialSummary';
import { analysisReportNode } from './outputs/analysisReport';

export const elementTypes = [
	// Tool Nodes
	documentKnowledgeBaseNode,
	mcpServerNode,
	usCensusNode,
	// Input Nodes
	eventNode,
	onDocumentUploadNode,
	onImageNode,
	onTextNode,
	onTableNode,
	// Process Nodes
	calculateNoiNode,
	calculateCapRateNode,
	calculateDscrNode,
	calculateCashFlowNode,
	// AI Nodes
	aiQueryNode,
	// Output Nodes
	investmentReportNode,
	financialSummaryNode,
	analysisReportNode
];
