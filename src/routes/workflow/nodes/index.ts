import { documentKnowledgeBaseNode } from './tools/documentKnowledgeBase';
import { mcpServerNode } from './tools/mcpServer';
import { usCensusNode } from './tools/usCensus';
import { eventNode } from './inputs/event';
import { onDocumentUploadNode } from './inputs/onDocumentUpload';
import { onImageNode } from './inputs/onImage';
import { onTextNode } from './inputs/onText';
import { onTableNode } from './inputs/onTable';
// Process Nodes - Financial Performance
import { calculateNoiNode } from './processes/calculateNoi';
import { calculateCapRateNode } from './processes/calculateCapRate';
import { calculateGrmNode } from './processes/calculateGrm';
import { calculateOerNode } from './processes/calculateOer';
import { calculateNoiMarginNode } from './processes/calculateNoiMargin';
import { calculateBreakEvenOccupancyNode } from './processes/calculateBreakEvenOccupancy';
// Process Nodes - Return & Yield
import { calculateCashOnCashNode } from './processes/calculateCashOnCash';
import { calculateEquityMultipleNode } from './processes/calculateEquityMultiple';
import { calculateYieldOnCostNode } from './processes/calculateYieldOnCost';
import { calculateSimpleIrrNode } from './processes/calculateSimpleIrr';
// Process Nodes - Debt & Leverage
import { calculateDscrNode } from './processes/calculateDscr';
import { calculateLtvNode } from './processes/calculateLtv';
import { calculateDebtYieldNode } from './processes/calculateDebtYield';
import { calculateIcrNode } from './processes/calculateIcr';
import { calculateMinDscrNode } from './processes/calculateMinDscr';
// Process Nodes - Per-Unit & Efficiency
import { calculatePricePerSqftNode } from './processes/calculatePricePerSqft';
import { calculateRentPerSqftNode } from './processes/calculateRentPerSqft';
import { calculateNoiPerSqftNode } from './processes/calculateNoiPerSqft';
import { calculatePricePerUnitNode } from './processes/calculatePricePerUnit';
import { calculateRentPerUnitNode } from './processes/calculateRentPerUnit';
// Process Nodes - Occupancy & Vacancy
import { calculateEgiNode } from './processes/calculateEgi';
import { calculateVacancyRateNode } from './processes/calculateVacancyRate';
import { calculateOccupancyRateNode } from './processes/calculateOccupancyRate';
// Process Nodes - Expense Analysis
import { calculateExpenseRatioNode } from './processes/calculateExpenseRatio';
import { calculateMaintenanceRatioNode } from './processes/calculateMaintenanceRatio';
import { calculateManagementFeeNode } from './processes/calculateManagementFee';
// Process Nodes - Time-Based & Projection
import { calculateCashFlowNode } from './processes/calculateCashFlow';
import { calculatePaybackPeriodNode } from './processes/calculatePaybackPeriod';
import { calculateAnnualAppreciationNode } from './processes/calculateAnnualAppreciation';
import { calculateTotalReturnNode } from './processes/calculateTotalReturn';
// Process Nodes - Advanced
import { calculateAdjustedNoiNode } from './processes/calculateAdjustedNoi';
import { calculateNetCashFlowAfterTaxNode } from './processes/calculateNetCashFlowAfterTax';
import { calculateCapRateSpreadNode } from './processes/calculateCapRateSpread';
import { calculateValueAddPotentialNode } from './processes/calculateValueAddPotential';
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
	// Process Nodes - Financial Performance Metrics
	calculateNoiNode,
	calculateCapRateNode,
	calculateGrmNode,
	calculateOerNode,
	calculateNoiMarginNode,
	calculateBreakEvenOccupancyNode,
	// Process Nodes - Return & Yield Metrics
	calculateCashOnCashNode,
	calculateEquityMultipleNode,
	calculateYieldOnCostNode,
	calculateSimpleIrrNode,
	// Process Nodes - Debt & Leverage Metrics
	calculateDscrNode,
	calculateLtvNode,
	calculateDebtYieldNode,
	calculateIcrNode,
	calculateMinDscrNode,
	// Process Nodes - Per-Unit & Efficiency Metrics
	calculatePricePerSqftNode,
	calculateRentPerSqftNode,
	calculateNoiPerSqftNode,
	calculatePricePerUnitNode,
	calculateRentPerUnitNode,
	// Process Nodes - Occupancy & Vacancy Metrics
	calculateEgiNode,
	calculateVacancyRateNode,
	calculateOccupancyRateNode,
	// Process Nodes - Expense Analysis
	calculateExpenseRatioNode,
	calculateMaintenanceRatioNode,
	calculateManagementFeeNode,
	// Process Nodes - Time-Based & Projection Metrics
	calculateCashFlowNode,
	calculatePaybackPeriodNode,
	calculateAnnualAppreciationNode,
	calculateTotalReturnNode,
	// Process Nodes - Advanced Calculations
	calculateAdjustedNoiNode,
	calculateNetCashFlowAfterTaxNode,
	calculateCapRateSpreadNode,
	calculateValueAddPotentialNode,
	// AI Nodes
	aiQueryNode,
	// Output Nodes
	investmentReportNode,
	financialSummaryNode,
	analysisReportNode
];
