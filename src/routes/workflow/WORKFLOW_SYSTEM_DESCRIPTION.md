# Workflow System - Comprehensive Software Description

## Executive Summary

The Workflow System is a visual, drag-and-drop workflow builder specifically designed for **Commercial Real Estate (CRE) analysis**. It enables users to create automated data processing pipelines by connecting specialized nodes together in a no-code/low-code interface. The system allows users to chain together data inputs, calculations, and AI-powered analysis nodes to create repeatable, reusable analysis workflows for real estate investment decision-making.

---

## Purpose and Use Cases

### Primary Use Cases

1. **Automated Analysis Pipelines**: Chain together data inputs, calculations, and AI-powered analysis nodes to create repeatable analysis workflows
2. **Financial Modeling**: Calculate key CRE metrics like NOI (Net Operating Income), Cap Rates, DSCR (Debt Service Coverage Ratio), and Cash Flow
3. **AI-Enhanced Analysis**: Integrate AI-powered analysis nodes for property analysis, market research, risk assessment, investment recommendations, and other CRE-specific evaluations
4. **Data Transformation**: Transform raw property data, financial metrics, and market data through processing nodes
5. **Workflow Reusability**: Save and share workflow configurations via JSON export/import

### Target Users

- Commercial real estate analysts and investment professionals
- Real estate developers and asset managers
- Financial analysts working with CRE investments
- Users who need to perform repeatable analysis workflows without extensive programming knowledge

### Key Benefits

- **Visual Interface**: No-code/low-code approach to building analysis workflows
- **Domain-Specific**: Pre-built nodes tailored for commercial real estate analysis
- **Extensibility**: Create custom AI analysis nodes with configurable prompts
- **Real-Time Execution**: Immediate feedback on workflow execution results
- **Integration**: Connects to external data sources (Document Knowledge Base, MCP Server, US Census) and AI services (OpenAI)

---

## Current Architecture

### Architecture State

The system is currently in a **transitional state** from a monolithic architecture to a component-based architecture:

- **Original**: Single monolithic Svelte component (~4,768 lines)
- **Current**: Partially refactored with extracted components, services, types, and utilities
- **Status**: 8 components extracted, 6 services created, types extracted, utilities extracted. Main component (`+page.svelte`) still contains the `elementTypes` array (2400+ lines) and orchestrates workflow functionality.

### Architectural Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│  (UI Components, Canvas Rendering, User Interactions)        │
│  - 8 Svelte components (WorkflowCanvas, WorkflowSidebar,    │
│    WorkflowNode, WorkflowConnection, etc.)                   │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│                    State Management Layer                    │
│  (Svelte 5 Runes: $state, $derived, reactive state)        │
│  - Grid elements, connections, workflow state                │
│  - Zoom/pan state, UI state (modals, editing, etc.)         │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│                    Execution Engine                          │
│  (Topological Sort, Dependency Resolution, Node Execution)   │
│  - Recursive dependency resolution                           │
│  - Memoization for performance                               │
│  - Parallel execution support                                │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│                    Node Library                              │
│  (Element Types: Input, Process, Output, AI)                 │
│  - 3+ Input nodes                                            │
│  - 4+ Process nodes (calculations)                           │
│  - 20+ AI nodes (analysis types)                             │
│  - 3+ Output nodes                                           │
│  - Support for custom AI nodes                               │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│                    External Services                         │
│  (OpenAI API, LocalStorage, JSON Export/Import)              │
│  - OpenAI API integration via /api/openai-responses          │
│  - Browser LocalStorage for custom nodes                     │
│  - JSON serialization for workflow export/import             │
└─────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

- **Framework**: Svelte 5 (using runes for reactivity: `$state`, `$derived`, `$effect`, `$props`, `$bindable`)
- **Language**: TypeScript
- **Rendering**: SVG (for connections) + HTML/CSS (for nodes)
- **State Management**: Svelte reactive state (runes)
- **Styling**: Tailwind CSS
- **Storage**: Browser LocalStorage (for custom AI nodes)
- **API Integration**: Fetch API for OpenAI requests
- **Build Tool**: Vite (SvelteKit project)

---

## Core Data Models

### ElementType

Represents a node type definition (the "blueprint" for nodes):

```typescript
type NodeType = 'input' | 'process' | 'output' | 'ai';

type AIQueryData = {
    prompt: string;
    model: string;
    systemPrompt?: string;
};

type ElementType = {
    id: string;                    // Unique identifier (e.g., 'ai-property-analysis')
    type: NodeType;                // Category: input, process, output, or ai
    label: string;                 // Display name (e.g., 'Property Analysis')
    icon: string;                  // Emoji or text icon (e.g., 'AI', '🏢')
    execute: (input: any, customData?: AIQueryData) => any | Promise<any>;
    defaultAIQueryData?: AIQueryData;  // For custom AI nodes
};
```

### GridElement

Represents an instance of a node placed on the canvas:

```typescript
type GridElement = {
    id: string;                    // Unique instance ID (e.g., 'el-1234567890-abc123')
    type: ElementType;             // Reference to the ElementType
    x: number;                     // Canvas X position
    y: number;                     // Canvas Y position
    width: number;                 // Node width
    height: number;                // Node height
    output?: any;                  // Execution result (cached)
    aiQueryData?: AIQueryData;     // Custom AI query data (if AI node)
};
```

### Connection

Represents a connection between two nodes:

```typescript
type ConnectionSide = 'top' | 'right' | 'bottom' | 'left';

type Connection = {
    id: string;                    // Unique connection ID
    from: string;                  // Source GridElement ID
    to: string;                    // Target GridElement ID
    fromSide: ConnectionSide;      // Which side of source node
    toSide: ConnectionSide;        // Which side of target node
};
```

### WorkflowResult

Execution result for workflow runs:

```typescript
type WorkflowResult = {
    nodeId: string;
    nodeLabel: string;
    output: any;
    timestamp: number;
};
```

---

## Node Types and Library

### Input Nodes

Data source nodes that provide input to the workflow:

- **Document Knowledge Base** (`input-property-data`): Property data input
- **MCP Server** (`input-financial-metrics`): External data source for financial metrics
- **US Census** (`input-market-data`): Market data input
- **Event** (`input-event`): AWS EventBridge event configuration input

**Characteristics**:
- Execute functions typically return default data structures
- No input dependencies (start of workflow)
- Output feeds into process or AI nodes

### Process Nodes

Calculation and transformation nodes:

- **Calculate NOI** (`process-calculate-noi`): Net Operating Income calculation
- **Calculate Cap Rate** (`process-calculate-cap-rate`): Capitalization rate calculation
- **Calculate DSCR** (`process-calculate-dscr`): Debt Service Coverage Ratio
- **Calculate Cash Flow** (`process-calculate-cash-flow`): Cash flow calculation

**Characteristics**:
- Synchronous execution functions
- Transform input data using business logic
- Typically take financial data and produce calculated metrics

### AI Nodes (20+ pre-built)

AI-powered analysis nodes that make API calls to OpenAI:

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
- Development Feasibility
- Refinancing Analysis
- 1031 Exchange
- Market Timing
- Tenant Retention
- Value-Add Opportunities
- Legal Compliance
- Operating Expense Analysis
- Cap Rate Analysis
- Demographic Analysis
- Construction Cost Estimation
- Property Condition Assessment
- Income Approach Valuation
- Lease Abstract
- Property Repositioning
- Acquisition Underwriting
- Market Forecasting
- Tenant Improvement Analysis

**Characteristics**:
- Asynchronous execution functions
- Make HTTP POST requests to `/api/openai-responses`
- Support custom prompts, models (default: gpt-4o), and system prompts
- Handle various OpenAI API response formats
- Can be customized by users (custom AI nodes stored in LocalStorage)

### Output Nodes

Display and export results:

- **Investment Report** (`output-investment-report`)
- **Financial Summary** (`output-financial-summary`)
- **Analysis Report** (`output-analysis-report`)

**Characteristics**:
- Simple pass-through execution (returns input)
- Triggers workflow execution when present
- Results displayed in WorkflowResultsPanel component

---

## Execution Engine

### Execution Flow

1. **Trigger**: User clicks "Execute Workflow" button
2. **Identify Output Nodes**: Find all GridElements with `type.type === 'output'`
3. **Recursive Execution**: For each output node, execute recursively:
   - Resolve dependencies (execute all upstream nodes first)
   - Check memoization cache (skip if already processed)
   - Execute node's `execute` function
   - Cache result in GridElement.output and results Map
   - Return result to downstream nodes
4. **Parallel Execution**: Uses `Promise.all` for parallel upstream execution
5. **Result Collection**: Results displayed in WorkflowResultsPanel

### Key Features

- **Memoization**: Prevents re-execution of already-processed nodes
- **Dependency Resolution**: Automatically resolves node dependencies using connections
- **Parallel Execution**: Independent upstream nodes execute in parallel
- **Async Support**: Handles both synchronous and asynchronous node execution
- **Error Handling**: Basic error handling (errors logged to console)

### Execution Algorithm

The execution uses a recursive approach similar to topological sort:

```typescript
async function executeWorkflow() {
    const processed = new Set<string>();
    const results = new Map<string, any>();

    async function executeElement(elementId: string): Promise<any> {
        // Memoization check
        if (processed.has(elementId)) {
            return results.get(elementId);
        }

        const element = gridElements.find(el => el.id === elementId);
        if (!element) return null;

        // Resolve dependencies
        const inputConnections = connections.filter(conn => conn.to === elementId);
        let input = null;

        if (inputConnections.length > 0) {
            const inputs = await Promise.all(
                inputConnections.map(conn => executeElement(conn.from))
            );
            input = inputs.length === 1 ? inputs[0] : inputs;
        }

        // Execute node
        const outputPromise = element.type.execute(input, element.aiQueryData);
        const output = await Promise.resolve(outputPromise);

        // Cache result
        element.output = output;
        results.set(elementId, output);
        processed.add(elementId);

        return output;
    }

    // Execute all output nodes
    const outputElements = gridElements.filter(el => el.type.type === 'output');
    await Promise.all(outputElements.map(el => executeElement(el.id)));
}
```

---

## Visual Canvas System

### Canvas Implementation

- **SVG-based rendering**: Connections drawn as SVG paths
- **HTML/CSS positioning**: Nodes positioned using absolute positioning
- **Zoom and Pan**: Full zoom/pan support with mouse wheel and drag
- **Drag-and-drop**: Nodes can be dragged from sidebar and repositioned on canvas
- **Connection System**: Clickable connection points on node sides (top, right, bottom, left)

### User Interactions

1. **Node Placement**: Drag node from sidebar → drop on canvas
2. **Node Movement**: Drag placed node to new position
3. **Connection Creation**: Click connection point → drag to target connection point
4. **Connection Deletion**: Select connection → press Delete key or click delete button
5. **Node Deletion**: Click delete button on node
6. **Node Configuration**: Double-click AI node → opens AIQueryEditor modal
7. **Zoom**: Mouse wheel or zoom controls in toolbar
8. **Pan**: Middle mouse button drag or spacebar + drag
9. **Canvas Navigation**: Click empty canvas to deselect

### Connection Points

Each node has 4 connection points (one per side):
- **Top**: Input connection point (receives data from upstream nodes)
- **Right**: Output connection point (sends data to downstream nodes)
- **Bottom**: Output connection point (alternative output)
- **Left**: Input connection point (alternative input)

Connection logic prevents invalid connections (e.g., output to output, input to input).

---

## Component Architecture (Current Refactored State)

### Extracted Components

1. **WorkflowCanvas.svelte**
   - Main canvas container with zoom/pan
   - SVG overlay for connections
   - Grid element container
   - Handles canvas-level interactions (pan, zoom, click)

2. **WorkflowNode.svelte**
   - Individual node rendering
   - Connection point indicators
   - Node delete button
   - Double-click handling for AI nodes
   - Output display

3. **WorkflowConnection.svelte**
   - SVG path rendering for connections
   - Connection selection and deletion
   - Visual styling (stroke, hover effects)

4. **WorkflowConnectionPreview.svelte**
   - Temporary connection line while connecting
   - Follows mouse cursor
   - Visual feedback during connection creation

5. **WorkflowSidebar.svelte**
   - Node library display
   - Node filtering/search
   - Node category sections (Input, Process, AI, Output)
   - Gallery modal triggers
   - Execute workflow button

6. **WorkflowToolbar.svelte**
   - Zoom controls (in, out, reset)
   - Export JSON button
   - Clear workflow button
   - Dark mode toggle

7. **WorkflowResultsPanel.svelte**
   - Execution results display
   - Result formatting
   - Clear results button

8. **AIQueryEditor.svelte**
   - Modal for configuring AI nodes
   - Prompt editor (textarea)
   - Model selection dropdown
   - System prompt editor (optional)
   - Save/Cancel buttons

### Service Modules

1. **workflowExecutionService.ts**
   - `executeWorkflow()` function
   - Topological sort and dependency resolution
   - Memoization logic

2. **workflowSerializationService.ts**
   - `generateWorkflowJSON()` - Export workflow to JSON
   - `importWorkflowJSON()` - Import workflow from JSON
   - `copyWorkflowJSON()` - Copy JSON to clipboard
   - `downloadWorkflowJSON()` - Download JSON file

3. **connectionService.ts**
   - `getConnectionPointPos()` - Calculate connection point positions
   - Connection point coordinate calculations

4. **nodeLibraryService.ts**
   - `getElementTypes()` - Get all element types
   - `getAllElementTypes()` - Get element types including custom nodes
   - `getElementTypeById()` - Find element type by ID

5. **customNodeService.ts**
   - `loadCustomAINodes()` - Load custom nodes from LocalStorage
   - `saveCustomAINodes()` - Save custom nodes to LocalStorage
   - `createCustomAINode()` - Create new custom AI node

6. **nodeDefinitions.ts** (structure created, full array pending)
   - `elementTypes` array export (currently stub, needs full 2400+ line array)

### Type Definitions

- **types/node.ts**: ElementType, AIQueryData, NodeType
- **types/connection.ts**: Connection, ConnectionPoint, ConnectionSide
- **types/workflow.ts**: GridElement, WorkflowResult, WorkflowJSON
- **types/index.ts**: Barrel exports

### Utilities

- **utils/nodeStyling.ts**: Color and theme utility functions for nodes
  - `getElementColor()`, `getElementBorderColor()`, `getNodeIconBgColor()`, etc.
- **utils/idGenerator.ts**: `generateId()` - Creates unique IDs for workflow elements

---

## State Management

### State Variables (Svelte 5 Runes)

**Workflow State**:
- `gridElements: $state<GridElement[]>([])` - All nodes on canvas
- `connections: $state<Connection[]>([])` - All connections between nodes
- `workflowResults: $state<WorkflowResult[]>([])` - Execution results

**UI State**:
- `zoomLevel: $state(1)` - Current zoom level
- `panX: $state(0)`, `panY: $state(0)` - Canvas pan offset
- `darkMode: $derived.by(() => darkModeStore.darkMode)` - Dark mode state
- `showingWorkflowJSON: $state(false)` - JSON export modal visibility
- `editingAIQuery: $state<GridElement | null>(null)` - Currently editing AI node

**Interaction State**:
- `draggedGridElement: $state<GridElement | null>(null)` - Node being dragged
- `connectingFrom: $state<ConnectionPoint | null>(null)` - Connection in progress
- `isPanning: $state(false)` - Canvas panning state
- `currentMousePos: $state({ x: 0, y: 0 })` - Current mouse position

**Custom Nodes State**:
- `customAINodes: $state<ElementType[]>([])` - User-created custom AI nodes
- `customAINodeLabel: $state('')` - Form state for creating custom nodes
- `customAINodePrompt: $state('')` - Form state
- `customAINodeModel: $state('gpt-4o')` - Form state
- `customAINodeSystemPrompt: $state('')` - Form state

**Derived State**:
- `allElementTypes: $derived([...elementTypes, ...customAINodes])` - Combined node library

---

## External Integrations

### OpenAI API

- **Endpoint**: `/api/openai-responses`
- **Method**: POST
- **Request Format**:
  ```json
  {
    "model": "gpt-4o",
    "input": [
      { "role": "system", "content": "..." },
      { "role": "user", "content": "..." }
    ]
  }
  ```
- **Response Handling**: Supports multiple response formats (result.data.output, result.data.content, etc.)
- **Error Handling**: Catches errors and returns user-friendly error messages

### Browser LocalStorage

- **Key**: `'workflow-custom-ai-nodes'`
- **Purpose**: Persist user-created custom AI nodes
- **Format**: JSON array (execute functions excluded, recreated on load)
- **Lifecycle**: Loaded on component mount, saved when custom nodes created/deleted

### Dark Mode Store

- **Integration**: `$lib/stores/darkMode.svelte`
- **Usage**: Global dark mode state for consistent theming

### File System (Export)

- **Export**: JSON file download via browser File API
- **Import**: JSON file upload via file input (import functionality)

### Clipboard API

- **Usage**: Copy workflow JSON to clipboard
- **Feedback**: Visual feedback when copied

---

## Data Flow

### Workflow Execution Data Flow

1. **Input Nodes** → Execute with no input, return default data
2. **Process Nodes** → Receive input from upstream, transform, return result
3. **AI Nodes** → Receive input from upstream, format prompt, call OpenAI API, return response
4. **Output Nodes** → Receive input, pass through, trigger result display

### Connection-Based Data Flow

- Connections define data flow direction: `from` → `to`
- Multiple connections to same node: Inputs combined into array
- Single connection: Input passed directly
- No connections: Node receives `null` input

### State Update Flow

1. User interaction (drag, click, connect)
2. State update (`$state` variables updated)
3. Svelte reactivity triggers re-render
4. Components update to reflect new state
5. Canvas re-renders nodes and connections

---

## Persistence and Serialization

### Workflow JSON Format

```typescript
type WorkflowJSON = {
    elements: Array<{
        id: string;
        typeId: string;        // ElementType.id
        x: number;
        y: number;
        width: number;
        height: number;
        aiQueryData?: AIQueryData;
    }>;
    connections: Array<{
        id: string;
        from: string;
        to: string;
        fromSide: ConnectionSide;
        toSide: ConnectionSide;
    }>;
};
```

### Export/Import

- **Export**: Generate JSON from current workflow state, download as file or copy to clipboard
- **Import**: Load JSON file, recreate GridElements and Connections
- **Limitations**: Custom AI nodes not included in export (stored separately in LocalStorage)

### Custom Node Persistence

- **Storage**: Browser LocalStorage
- **Scope**: User's browser only (not shared across devices)
- **Lifetime**: Persists until cleared by user or browser
- **Format**: JSON array of ElementType (without execute functions)

---

## Design Patterns

1. **Node Pattern**: Each workflow element is a self-contained node with input/output capabilities
2. **Strategy Pattern**: Different node types implement different execution strategies
3. **Observer Pattern**: Svelte reactivity system observes state changes
4. **Factory Pattern**: Custom AI nodes can be created dynamically
5. **Memoization Pattern**: Execution results are cached to prevent redundant computations
6. **Component Composition**: Large UI broken into smaller, composable components

---

## Current Limitations and Technical Debt

### Known Limitations

1. **No Backend Persistence**: Workflows only persist in LocalStorage and JSON export
2. **No User Accounts**: No user authentication or workflow ownership
3. **No Version Control**: No workflow versioning or history
4. **No Collaboration**: Workflows cannot be shared between users
5. **Limited Error Handling**: Basic error handling, no error recovery mechanisms
6. **No Input Validation**: No validation of node inputs/outputs
7. **No Type Safety**: Heavy use of `any` types reduces type safety
8. **No Testing**: No visible test coverage
9. **Performance**: Re-renders entire canvas on state changes, no virtualization
10. **No Undo/Redo**: No command pattern for undo/redo functionality
11. **Limited Keyboard Support**: Minimal keyboard shortcuts
12. **No Workflow Validation**: No pre-execution validation (cycles, disconnected nodes, etc.)

### Technical Debt

1. **Monolithic Component**: Main `+page.svelte` still contains large portions of code
2. **elementTypes Array**: 2400+ line array still in main component (extraction pending)
3. **Type Safety**: Heavy use of `any` types
4. **Code Duplication**: Some logic duplicated between components
5. **No Error Boundaries**: Errors in one node can break entire workflow
6. **No Performance Optimization**: No memoization for expensive computations
7. **Limited Accessibility**: Minimal ARIA labels, keyboard navigation support

---

## Refactoring Status

### Completed ✅

- **Components**: 8 components extracted (WorkflowCanvas, WorkflowSidebar, WorkflowNode, etc.)
- **Services**: 6 service modules created (execution, serialization, connection, custom nodes, node library)
- **Types**: All types extracted to separate files
- **Utilities**: Styling and ID generation utilities extracted
- **Svelte 5 Migration**: All extracted components use Svelte 5 runes

### In Progress ⚠️

- **elementTypes Array**: File structure created, but 2400+ line array still needs to be extracted from `+page.svelte` to `services/nodeDefinitions.ts`
- **Main Component Refactoring**: `+page.svelte` needs to be refactored to use all extracted components and services

### Pending 🔄

- Main component orchestration refactoring
- Integration testing
- Performance optimization
- Error handling improvements
- Type safety improvements

---

## User Workflows

### Creating a Workflow

1. User opens workflow page
2. Drag input node from sidebar to canvas
3. Drag process/AI nodes from sidebar to canvas
4. Connect nodes by clicking connection points
5. (Optional) Double-click AI nodes to configure prompts
6. Drag output node to canvas
7. Connect final node to output
8. Click "Execute Workflow" button
9. View results in results panel

### Creating Custom AI Nodes

1. Click "Create Custom AI Node" button
2. Enter node label
3. Enter prompt (supports {input} placeholder)
4. Select model (default: gpt-4o)
5. (Optional) Enter system prompt
6. Click "Create"
7. Custom node appears in AI node library
8. Can be used like any other AI node

### Exporting/Importing Workflows

1. **Export**: Click "Export JSON" button → Download file or copy to clipboard
2. **Import**: Click "Import" button → Select JSON file → Workflow loaded onto canvas

---

## Future Evolution Considerations

### High Priority

1. **Backend Integration**: REST/GraphQL API for workflow persistence
2. **User Accounts**: Authentication and workflow ownership
3. **Error Handling**: Comprehensive error handling and recovery
4. **Testing**: Unit, integration, and E2E tests
5. **Type Safety**: Replace `any` with specific types

### Medium Priority

1. **Performance**: Virtualization, memoization, canvas optimization
2. **Undo/Redo**: Command pattern implementation
3. **Workflow Validation**: Pre-execution validation (cycles, types, etc.)
4. **Node Marketplace**: Community-contributed nodes
5. **Workflow Templates**: Pre-built workflow templates

### Low Priority

1. **Collaboration**: Real-time collaboration features
2. **Version Control**: Workflow versioning and history
3. **Advanced Execution**: Conditional branches, loops, sub-workflows
4. **Execution Visualization**: Animated execution with progress indicators
5. **Advanced UI**: Minimap, node grouping, better keyboard shortcuts

---

## Key Design Decisions

1. **Svelte 5 Runes**: Migrated to Svelte 5 runes for modern reactivity
2. **SVG for Connections**: SVG chosen for connection rendering (scalable, easy to manipulate)
3. **HTML/CSS for Nodes**: Nodes use HTML/CSS for flexibility and styling
4. **LocalStorage for Custom Nodes**: Browser-only persistence for simplicity
5. **JSON Export/Import**: Simple serialization format for workflow sharing
6. **Recursive Execution**: Recursive dependency resolution for simplicity
7. **Memoization**: Caching prevents redundant node executions
8. **Component Extraction**: Breaking monolithic component into smaller pieces

---

## API Contracts

### Node Execute Function Signature

```typescript
execute: (input: any, customData?: AIQueryData) => any | Promise<any>
```

- **input**: Data from upstream nodes (can be any type)
- **customData**: Optional AI query configuration (for AI nodes)
- **Return**: Synchronous value or Promise (supports both sync and async)

### OpenAI API Contract

**Request**:
```json
{
  "model": "gpt-4o",
  "input": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." }
  ]
}
```

**Response Formats Supported**:
- `result.data.output[0].content`
- `result.data.content`
- `result.data` (string)
- Fallback: `JSON.stringify(result.data)`

---

## Performance Characteristics

### Current Performance

- **Canvas Rendering**: Re-renders all nodes/connections on state changes
- **Execution**: Parallel execution of independent nodes (via Promise.all)
- **Memoization**: Cached results prevent redundant executions
- **No Virtualization**: All nodes rendered even if off-screen
- **No Debouncing**: No debouncing on workflow execution triggers

### Scalability Considerations

- **Large Workflows**: Performance may degrade with 100+ nodes
- **Many Connections**: SVG path calculations for many connections
- **AI Node Execution**: Sequential API calls (could be optimized)
- **State Updates**: Frequent state updates trigger re-renders

---

## Security Considerations

### Current Security

- **Input Sanitization**: Limited (user prompts sent directly to OpenAI)
- **API Keys**: Not stored in LocalStorage (handled by backend `/api/openai-responses`)
- **Data Privacy**: Sensitive property data handled in browser only
- **XSS Protection**: Svelte provides basic XSS protection via text interpolation

### Security Gaps

- **No Input Validation**: User inputs not validated before sending to API
- **No Rate Limiting**: No client-side rate limiting for API calls
- **No Audit Logging**: No logging of workflow executions
- **LocalStorage Security**: Custom nodes stored in plain text in LocalStorage

---

## Accessibility

### Current Accessibility

- **Keyboard Support**: Limited (basic navigation, Delete key for connections)
- **Screen Readers**: Minimal ARIA labels
- **Color Contrast**: Uses Tailwind CSS default colors (may need verification)
- **Focus Management**: Basic focus management for modals

### Accessibility Gaps

- **Full Keyboard Navigation**: Not all interactions accessible via keyboard
- **ARIA Labels**: Missing many ARIA labels for screen readers
- **Focus Indicators**: May need improved focus indicators
- **Color Blindness**: No alternative indicators beyond color

---

## Development Workflow

### File Organization

```
workflow/
├── +page.svelte (main component)
├── components/ (8 Svelte components)
├── services/ (6 service modules)
├── types/ (type definitions)
├── utils/ (utility functions)
├── ARCHITECTURE.md (architecture documentation)
├── REFACTORING_STATUS.md (refactoring progress)
└── WORKFLOW_SYSTEM_DESCRIPTION.md (this file)
```

### Code Style

- TypeScript strict mode
- Svelte 5 runes for reactivity
- Tailwind CSS for styling
- Barrel exports (index.ts files) for clean imports
- Component-based architecture (target state)

---

This document provides comprehensive context about the Workflow System for making informed software development decisions about future features and evolution. It covers architecture, design patterns, current state, limitations, and areas for improvement.
