import { documentKnowledgeBaseNode } from './inputs/documentKnowledgeBase';
import { mcpServerNode } from './inputs/mcpServer';
import { usCensusNode } from './inputs/usCensus';
import { eventNode } from './inputs/event';
import { onDocumentUploadNode } from './inputs/onDocumentUpload';
import { onImageNode } from './inputs/onImage';
import { onTextNode } from './inputs/onText';
import { calculateNoiNode } from './processes/calculateNoi';
import { calculateCapRateNode } from './processes/calculateCapRate';
import { calculateDscrNode } from './processes/calculateDscr';
import { calculateCashFlowNode } from './processes/calculateCashFlow';
import { propertyAnalysisNode } from './ai/propertyAnalysis';
import { marketAnalysisNode } from './ai/marketAnalysis';
import { riskAssessmentNode } from './ai/riskAssessment';
import { investmentRecommendationNode } from './ai/investmentRecommendation';
import { tenantAnalysisNode } from './ai/tenantAnalysis';
import { capitalExpenditureAnalysisNode } from './ai/capitalExpenditureAnalysis';
import { comparableSalesAnalysisNode } from './ai/comparableSalesAnalysis';
import { financialModelingNode } from './ai/financialModeling';
import { locationAnalysisNode } from './ai/locationAnalysis';
import { leaseStructureAnalysisNode } from './ai/leaseStructureAnalysis';
import { zoningComplianceNode } from './ai/zoningCompliance';
import { environmentalAssessmentNode } from './ai/environmentalAssessment';
import { debtStructureAnalysisNode } from './ai/debtStructureAnalysis';
import { taxAnalysisNode } from './ai/taxAnalysis';
import { competitionAnalysisNode } from './ai/competitionAnalysis';
import { exitStrategyNode } from './ai/exitStrategy';
import { dueDiligenceChecklistNode } from './ai/dueDiligenceChecklist';
import { rentRollAnalysisNode } from './ai/rentRollAnalysis';
import { assetManagementNode } from './ai/assetManagement';
import { portfolioAnalysisNode } from './ai/portfolioAnalysis';
import { valuationAnalysisNode } from './ai/valuationAnalysis';
import { leaseNegotiationNode } from './ai/leaseNegotiation';
import { propertyManagementNode } from './ai/propertyManagement';
import { developmentFeasibilityNode } from './ai/developmentFeasibility';
import { refinancingAnalysisNode } from './ai/refinancingAnalysis';
import { exchange1031Node } from './ai/exchange1031';
import { marketTimingNode } from './ai/marketTiming';
import { tenantRetentionNode } from './ai/tenantRetention';
import { valueAddOpportunitiesNode } from './ai/valueAddOpportunities';
import { legalComplianceNode } from './ai/legalCompliance';
import { operatingExpenseAnalysisNode } from './ai/operatingExpenseAnalysis';
import { capRateAnalysisNode } from './ai/capRateAnalysis';
import { demographicAnalysisNode } from './ai/demographicAnalysis';
import { constructionCostEstimationNode } from './ai/constructionCostEstimation';
import { propertyConditionAssessmentNode } from './ai/propertyConditionAssessment';
import { incomeApproachValuationNode } from './ai/incomeApproachValuation';
import { leaseAbstractNode } from './ai/leaseAbstract';
import { propertyRepositioningNode } from './ai/propertyRepositioning';
import { acquisitionUnderwritingNode } from './ai/acquisitionUnderwriting';
import { marketForecastingNode } from './ai/marketForecasting';
import { tenantImprovementAnalysisNode } from './ai/tenantImprovementAnalysis';
import { investmentReportNode } from './outputs/investmentReport';
import { financialSummaryNode } from './outputs/financialSummary';
import { analysisReportNode } from './outputs/analysisReport';

export const elementTypes = [
	// Input Nodes
	documentKnowledgeBaseNode,
	mcpServerNode,
	usCensusNode,
	eventNode,
	onDocumentUploadNode,
	onImageNode,
	onTextNode,
	// Process Nodes
	calculateNoiNode,
	calculateCapRateNode,
	calculateDscrNode,
	calculateCashFlowNode,
	// AI Nodes
	propertyAnalysisNode,
	marketAnalysisNode,
	riskAssessmentNode,
	investmentRecommendationNode,
	tenantAnalysisNode,
	capitalExpenditureAnalysisNode,
	comparableSalesAnalysisNode,
	financialModelingNode,
	locationAnalysisNode,
	leaseStructureAnalysisNode,
	zoningComplianceNode,
	environmentalAssessmentNode,
	debtStructureAnalysisNode,
	taxAnalysisNode,
	competitionAnalysisNode,
	exitStrategyNode,
	dueDiligenceChecklistNode,
	rentRollAnalysisNode,
	assetManagementNode,
	portfolioAnalysisNode,
	valuationAnalysisNode,
	leaseNegotiationNode,
	propertyManagementNode,
	developmentFeasibilityNode,
	refinancingAnalysisNode,
	exchange1031Node,
	marketTimingNode,
	tenantRetentionNode,
	valueAddOpportunitiesNode,
	legalComplianceNode,
	operatingExpenseAnalysisNode,
	capRateAnalysisNode,
	demographicAnalysisNode,
	constructionCostEstimationNode,
	propertyConditionAssessmentNode,
	incomeApproachValuationNode,
	leaseAbstractNode,
	propertyRepositioningNode,
	acquisitionUnderwritingNode,
	marketForecastingNode,
	tenantImprovementAnalysisNode,
	// Output Nodes
	investmentReportNode,
	financialSummaryNode,
	analysisReportNode
];
