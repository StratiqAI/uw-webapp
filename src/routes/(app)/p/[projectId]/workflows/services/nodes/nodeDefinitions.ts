import type { ElementType } from '../../types/node';
import { elementTypes as workflowNodes } from '../../nodes';

/**
 * Default element type definitions for the workflow builder.
 * This array contains all available node types including:
 * - Input nodes (data sources)
 * - Process nodes (calculations and transformations)
 * - AI nodes (AI-powered analysis)
 * - Output nodes (results and reports)
 */
export const elementTypes: ElementType[] = workflowNodes;
