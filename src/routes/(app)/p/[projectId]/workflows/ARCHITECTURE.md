# Workflow System Architecture Overview

## Table of Contents

1. [Purpose](#purpose)
2. [Software Design](#software-design)
3. [Suggestions for Improvement](#suggestions-for-improvement)

---

## Purpose

The Workflow System is a visual, drag-and-drop workflow builder designed specifically for **Commercial Real Estate (CRE) analysis**. It enables users to create automated data processing pipelines by connecting specialized nodes together.

### Primary Use Cases

1. **Automated Analysis Pipelines**: Users can chain together data inputs, calculations, and AI-powered analysis nodes to create repeatable analysis workflows
2. **Financial Modeling**: Calculate key CRE metrics like NOI (Net Operating Income), Cap Rates, DSCR (Debt Service Coverage Ratio), and Cash Flow
3. **AI-Enhanced Analysis**: Integrate AI-powered analysis nodes for property analysis, market research, risk assessment, investment recommendations, and other CRE-specific evaluations
4. **Data Transformation**: Transform raw property data, financial metrics, and market data through processing nodes
5. **Workflow Reusability**: Save and share workflow configurations via JSON export/import

### Key Benefits

- **Visual Interface**: No-code/low-code approach to building analysis workflows
- **Domain-Specific**: Pre-built nodes tailored for commercial real estate analysis
- **Extensibility**: Create custom AI analysis nodes with configurable prompts
- **Real-Time Execution**: Immediate feedback on workflow execution results
- **Integration**: Connects to external data sources (Document Knowledge Base, MCP Server, US Census) and AI services (OpenAI)

---

## Software Design

### Architecture Overview

The system is currently in a **transitional state** from a monolithic architecture to a component-based architecture. The original implementation was a single-component architecture in a monolithic Svelte component (`+page.svelte`, ~4,768 lines). As of the refactoring effort, significant portions have been extracted into separate modules:

**Current Architecture (Refactored)**:
- **Components**: 8 extracted Svelte components (WorkflowCanvas, WorkflowSidebar, WorkflowNode, etc.)
- **Services**: Business logic extracted to service modules (execution, serialization, connection, custom nodes)
- **Types**: All type definitions extracted to separate type files
- **Utils**: Utility functions extracted (styling, ID generation)

**Remaining Monolithic Elements**:
- `elementTypes` array (2400+ lines) still in `+page.svelte` (extraction pending)
- Main component orchestration still in `+page.svelte`

The architecture can be broken down into several key layers:

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│  (UI Components, Canvas Rendering, User Interactions)        │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│                    State Management Layer                    │
│  (Svelte Runes: $state, $derived, reactive state)           │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│                    Execution Engine                          │
│  (Topological Sort, Dependency Resolution, Node Execution)   │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│                    Node Library                              │
│  (Element Types: Input, Process, Output, AI)                 │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│                    External Services                         │
│  (OpenAI API, LocalStorage, JSON Export/Import)              │
└─────────────────────────────────────────────────────────────┘
```

### Core Components

#### 1. Type System

```typescript
// Node type definition
type ElementType = {
	id: string;
	type: 'input' | 'process' | 'output' | 'ai';
	label: string;
	icon: string;
	execute: (input: any, customData?: any) => any | Promise<any>;
	defaultAIQueryData?: AIQueryData; // For custom AI nodes
};

// Grid element (node instance on canvas)
type GridElement = {
	id: string;
	type: ElementType;
	x: number;
	y: number;
	width: number;
	height: number;
	output?: any;
	aiQueryData?: AIQueryData;
};

// Connection between nodes
type Connection = {
	id: string;
	from: string; // element id
	to: string; // element id
	fromSide: 'top' | 'right' | 'bottom' | 'left';
	toSide: 'top' | 'right' | 'bottom' | 'left';
};
```

#### 2. Node Types

**Input Nodes**:

- Document Knowledge Base: Property data input
- MCP Server: External data source
- US Census: Market data input

**Process Nodes**:

- Calculate NOI (Net Operating Income)
- Calculate Cap Rate
- Calculate DSCR (Debt Service Coverage Ratio)
- Calculate Cash Flow

**AI Nodes** (20+ pre-built):

- Property Analysis
- Market Analysis
- Risk Assessment
- Investment Recommendation
- Tenant Analysis
- Capital Expenditure Analysis
- Comparable Sales Analysis
- Financial Modeling
- Location Analysis
- Lease Structure Analysis
- Zoning Compliance
- Environmental Assessment
- Debt Structure Analysis
- Tax Analysis
- Competition Analysis
- Exit Strategy
- Due Diligence Checklist
- Rent Roll Analysis
- Asset Management
- Portfolio Analysis
- Valuation Analysis
- Lease Negotiation
- Property Management
- And more...

**Output Nodes**:

- Display results from the workflow execution

#### 3. Execution Engine

The execution engine uses a **recursive dependency resolution** approach (similar to topological sort):

```typescript
async function executeWorkflow() {
	const processed = new Set<string>();
	const results = new Map<string, any>();

	async function executeElement(elementId: string): Promise<any> {
		// Memoization: skip if already processed
		if (processed.has(elementId)) {
			return results.get(elementId);
		}

		const element = gridElements.find((el) => el.id === elementId);
		if (!element) return null;

		// Resolve dependencies: execute all upstream nodes
		const inputConnections = connections.filter((conn) => conn.to === elementId);
		let input = null;

		if (inputConnections.length > 0) {
			const inputs = await Promise.all(inputConnections.map((conn) => executeElement(conn.from)));
			input = inputs.length === 1 ? inputs[0] : inputs;
		}

		// Execute the node (supports both sync and async)
		const outputPromise = element.type.execute(input, element.aiQueryData);
		const output = await Promise.resolve(outputPromise);

		// Cache result
		element.output = output;
		results.set(elementId, output);
		processed.add(elementId);

		return output;
	}

	// Execute all output nodes (triggers upstream execution)
	const outputElements = gridElements.filter((el) => el.type.type === 'output');
	await Promise.all(outputElements.map((el) => executeElement(el.id)));
}
```

**Key Features**:

- **Memoization**: Prevents re-execution of already-processed nodes
- **Dependency Resolution**: Automatically resolves node dependencies
- **Parallel Execution**: Uses `Promise.all` for parallel upstream execution
- **Async Support**: Handles both synchronous and asynchronous node execution

#### 4. Visual Canvas

The canvas is implemented using:

- **SVG-based rendering** for connections between nodes
- **HTML/CSS positioning** for node elements
- **Zoom and Pan** support for navigation
- **Drag-and-drop** for node placement and movement
- **Connection system** with clickable connection points on node sides

#### 5. State Management

Uses Svelte 5 runes for reactive state:

```typescript
let gridElements = $state<GridElement[]>([]);
let connections = $state<Connection[]>([]);
let workflowResults = $state<any[]>([]);
let zoomLevel = $state(1);
let panX = $state(0);
let panY = $state(0);
let darkMode = $derived.by(() => darkModeStore.darkMode);
let allElementTypes = $derived([...elementTypes, ...customAINodes]);
```

#### 6. Persistence

- **LocalStorage**: Custom AI nodes are persisted in browser localStorage
- **JSON Export/Import**: Full workflow configuration can be exported/imported as JSON
- **No Backend Persistence**: Workflows are not persisted to a backend database

#### 7. External Integrations

- **OpenAI API**: AI nodes make HTTP requests to `/api/openai-responses` endpoint
- **Dark Mode**: Integrated with global dark mode store
- **Browser APIs**: Uses Clipboard API, File API for export functionality

### Design Patterns

1. **Node Pattern**: Each workflow element is a self-contained node with input/output capabilities
2. **Strategy Pattern**: Different node types implement different execution strategies
3. **Observer Pattern**: Svelte reactivity system observes state changes
4. **Factory Pattern**: Custom AI nodes can be created dynamically
5. **Memoization**: Execution results are cached to prevent redundant computations

### Technology Stack

- **Framework**: Svelte 5 (with runes)
- **Language**: TypeScript
- **Rendering**: SVG + HTML/CSS
- **State Management**: Svelte reactive state
- **Styling**: Tailwind CSS
- **Storage**: Browser LocalStorage
- **API Integration**: Fetch API for OpenAI requests

---

## Suggestions for Improvement

### 1. Code Organization & Maintainability

**Original Issue**: The entire system was implemented in a single ~4,768 line Svelte file, making it difficult to maintain, test, and extend.

**Status**: ✅ **Significant Progress Made** - Major refactoring effort completed

**Completed Extractions**:

- ✅ **Component Extraction**: Split into 8 focused components:
  - `WorkflowCanvas.svelte` - Canvas rendering and interaction
  - `WorkflowSidebar.svelte` - Node library sidebar
  - `WorkflowNode.svelte` - Individual node component
  - `WorkflowConnection.svelte` - Connection line component
  - `WorkflowConnectionPreview.svelte` - Temporary connection preview
  - `WorkflowResultsPanel.svelte` - Results display
  - `WorkflowToolbar.svelte` - Toolbar with zoom/pan/export controls
  - `AIQueryEditor.svelte` - AI node configuration modal

- ✅ **Service Layer Extraction**: Business logic moved to service files:
  - `workflowExecutionService.ts` - Execution engine logic with topological sort
  - `workflowSerializationService.ts` - JSON export/import functionality
  - `connectionService.ts` - Connection point position calculations
  - `nodeLibraryService.ts` - Node library management functions
  - `customNodeService.ts` - Custom AI node localStorage management and creation
  - `nodeDefinitions.ts` - Element type definitions (structure created, full extraction pending)

- ✅ **Type Definitions**: All types extracted to separate files:
  - `types/workflow.ts` - Core workflow types (GridElement, WorkflowResult, WorkflowJSON)
  - `types/node.ts` - Node-related types (ElementType, AIQueryData, NodeType)
  - `types/connection.ts` - Connection types (Connection, ConnectionPoint, ConnectionSide)
  - `types/index.ts` - Barrel export for easy importing

- ✅ **Utility Functions**: Extracted to utility modules:
  - `utils/nodeStyling.ts` - Color and theme utility functions for nodes
  - `utils/idGenerator.ts` - Unique ID generation function

**Remaining Work**:
- ⚠️ **elementTypes Array**: The massive `elementTypes` array (2400+ lines) needs to be fully extracted from `+page.svelte` to `services/nodes/nodeDefinitions.ts`
- 🔄 **Main Component Refactoring**: `+page.svelte` needs to be refactored to import and use all extracted components and services, removing duplicate code while maintaining functionality

### 2. Type Safety Improvements

**Current Issues**:

- Heavy use of `any` types reduces type safety
- No validation of node input/output types
- Weak typing for AI query data

**Recommendations**:

- **Strong Typing**: Replace `any` with specific types:

  ```typescript
  type NodeInput = PropertyData | FinancialMetrics | MarketData | CalculationResult;
  type NodeOutput = CalculationResult | AIAnalysisResult | TransformedData;

  type ElementType<TInput = unknown, TOutput = unknown> = {
  	execute: (input: TInput, customData?: AIQueryData) => TOutput | Promise<TOutput>;
  	// ...
  };
  ```

- **Input/Output Validation**: Add runtime validation for node inputs/outputs
- **Schema Validation**: Use libraries like Zod for runtime type validation

### 3. Error Handling & Resilience

**Current Issues**:

- Limited error handling in execution engine
- No error recovery mechanisms
- Errors in one node can break entire workflow
- No user-friendly error messages

**Recommendations**:

- **Error Boundaries**: Implement error boundaries for individual nodes
- **Error Handling Strategy**:

  ```typescript
  type ExecutionResult<T> = {
  	success: boolean;
  	data?: T;
  	error?: ExecutionError;
  	nodeId: string;
  };
  ```

- **Error Recovery**: Provide options for error handling (skip, retry, fail-fast)
- **User Feedback**: Display clear error messages with node context
- **Validation**: Pre-execution validation of workflow structure (cycles, disconnected nodes, etc.)

### 4. Testing

**Current State**: No visible test coverage

**Recommendations**:

- **Unit Tests**: Test individual node execution functions
- **Integration Tests**: Test workflow execution with multiple connected nodes
- **Component Tests**: Test Svelte components in isolation
- **E2E Tests**: Test full user workflows (drag, connect, execute)
- **Test Framework**: Use Vitest for unit/integration tests, Playwright for E2E

### 5. Performance Optimizations

**Current Issues**:

- Re-renders entire canvas on state changes
- No virtualization for large workflows
- Execution results not optimized for large datasets

**Recommendations**:

- **Memoization**: Memoize expensive computations (connection path calculations, node rendering)
- **Virtual Scrolling**: Implement virtual scrolling for large node lists
- **Lazy Loading**: Lazy load AI node results
- **Debouncing**: Debounce workflow execution triggers
- **Canvas Optimization**: Use Canvas API or WebGL for better rendering performance with many nodes
- **Result Streaming**: Stream large AI responses instead of waiting for complete response

### 6. Backend Integration & Persistence

**Current State**: Workflows only persist in localStorage

**Recommendations**:

- **Backend API**: Create REST/GraphQL API for workflow persistence
- **Database Schema**: Design database schema for workflows, nodes, connections
- **User Accounts**: Associate workflows with user accounts
- **Version Control**: Implement workflow versioning
- **Sharing & Collaboration**: Allow workflow sharing between users
- **Cloud Sync**: Sync workflows across devices

### 7. User Experience Enhancements

**Recommendations**:

- **Undo/Redo**: Implement command pattern for undo/redo functionality
- **Keyboard Shortcuts**: Add keyboard shortcuts for common actions
- **Node Templates**: Pre-built workflow templates for common scenarios
- **Node Search**: Search/filter nodes in sidebar
- **Connection Validation**: Visual feedback for invalid connections
- **Execution Visualization**: Animate node execution with progress indicators
- **Result Formatting**: Better formatting for complex result types (tables, charts, etc.)
- **Workflow Debugging**: Step-through execution mode for debugging
- **Node Grouping**: Group related nodes visually
- **Minimap**: Add minimap for navigation in large workflows

### 8. Execution Engine Improvements

**Recommendations**:

- **Parallel Execution**: Better parallelization of independent nodes
- **Conditional Execution**: Support conditional branches in workflows
- **Loops**: Support iterative/looping execution patterns
- **Sub-workflows**: Allow workflows to call other workflows
- **Execution History**: Track and display execution history
- **Performance Metrics**: Display execution time per node
- **Caching Strategy**: Configurable caching for expensive operations
- **Incremental Execution**: Only re-execute changed nodes and their dependencies

### 9. Node Library Enhancements

**Recommendations**:

- **Node Marketplace**: Community-contributed nodes
- **Node Versioning**: Version nodes and support updates
- **Node Documentation**: Inline documentation for each node
- **Node Parameters**: More configurable parameters for process nodes
- **Data Transformation Nodes**: More built-in data transformation nodes (filter, map, reduce, etc.)
- **Conditional Nodes**: Add conditional/branching nodes
- **Delay/Timing Nodes**: Add timing control nodes

### 10. Security & Compliance

**Recommendations**:

- **Input Sanitization**: Sanitize user inputs in AI prompts
- **API Key Management**: Secure storage of API keys (never in localStorage)
- **Rate Limiting**: Implement rate limiting for API calls
- **Data Privacy**: Handle sensitive property data appropriately
- **Audit Logging**: Log workflow executions for compliance

### 11. Accessibility

**Recommendations**:

- **Keyboard Navigation**: Full keyboard support for workflow building
- **Screen Reader Support**: ARIA labels and semantic HTML
- **Color Contrast**: Ensure sufficient color contrast in dark/light modes
- **Focus Management**: Proper focus management for modals and interactions

### 12. Documentation

**Recommendations**:

- **API Documentation**: Document node execution APIs
- **User Guide**: Create comprehensive user documentation
- **Developer Guide**: Document architecture and extension points
- **Video Tutorials**: Create video tutorials for common workflows
- **Example Workflows**: Provide example workflows for different use cases

---

## Summary

The Workflow System provides a powerful, domain-specific solution for building commercial real estate analysis workflows. The visual interface and node-based architecture make it accessible to non-technical users while providing flexibility for complex analysis pipelines.

The current single-file architecture, while functional, presents challenges for maintainability and scalability. The suggested improvements focus on code organization, type safety, error handling, testing, performance, and user experience enhancements that would transform this into a production-grade system.

Priority improvements should focus on:

1. ✅ **Code organization** (breaking into smaller components) - **IN PROGRESS**: Major components, services, types, and utilities extracted. Remaining: elementTypes array extraction and main component refactoring
2. **Error handling** (making the system more resilient) - **PENDING**
3. **Backend integration** (enabling persistence and collaboration) - **PENDING**
4. **Testing** (ensuring reliability and preventing regressions) - **PENDING**
