# Workflow testing UX – suggestions

## Why "Execute Workflow" doesn’t start the backend

1. **Execute Workflow is in-browser only**  
   It runs `element.type.execute(input, element.aiQueryData)` in the client. Those `execute` functions are **local stubs** (e.g. placeholders). They do **not** call Pinecone, Gemini, or AppSync.

2. **Backend runs are event-driven**  
   Real runs start when:
   - A **Doclink Created** (or other) event matches an input node
   - **workflow-launcher** creates a `WorkflowExecution` and emits **Orchestrator.Start**
   - **workflow-orchestrator** runs the graph (including Pinecone+Gemini for AI nodes)

   There is currently **no** API or UI action that creates an execution and emits `Orchestrator.Start` for a manual “test run”.

3. **Local run used to do nothing for “Input → AI”**  
   Execution only started from **output**-type nodes. Workflows like **On Document Upload → AI** have no output node, so `outputElements` was empty and nothing ran. That is fixed by also using **sink nodes** (no outgoing connections) as roots.

---

## Implemented

### 1. In-browser Execute works without Output nodes

- **Roots:** if there are `output`-type nodes, use those; otherwise use **sink** nodes (no outgoing connections).
- **Input nodes:** when there are no incoming connections, use `element.nodeOptions` if set, otherwise a synthetic `{ _source: 'local-run', doclinkId, documentId, filename }` so `execute` and `{{filename}}` etc. can run.
- **Fully disconnected:** if there are no sinks and no output nodes, run from every node.

So **Execute Workflow** now at least runs the local graph for **Input → AI** and shows something in Run Results (from the client-side `execute` stubs). It still does **not** hit the backend (no Pinecone/Gemini, no persisted execution).

---

## Recommended improvements

### 2. Backend “Test run” (starts real workflow)

**Goal:** One click in the editor to start a **real** run (create `WorkflowExecution`, emit `Orchestrator.Start`), then see it in Executions and Execution details.

**Backend**

- **New mutation**  
  `startWorkflowExecution(input: StartWorkflowInput!): WorkflowExecution`  
  - `StartWorkflowInput`: `workflowId: ID!`, `parentId: ID!`, `inputData: AWSJSON` (optional).
- **Resolver:** Lambda that:
  1. Loads workflow (definition, name).
  2. Derives `triggerNodeId` and `firstNodeIds` from the definition (e.g. first input node and its outgoing connections).
  3. Calls existing `createWorkflowExecution` (or equivalent) with `parentId`, `workflowId`, `triggerEvent`, `inputData`.
  4. Emits **Orchestrator.Start** to EventBridge with the same shape as workflow-launcher:  
     `workflowExecutionId`, `workflowId`, `workflowName`, `definition`, `triggerNodeId`, `firstNodeIds`, `inputData`, and `metadata` (e.g. `projectId`, `userId`).
  5. Returns the created `WorkflowExecution`.

**Synthetic `inputData` for “On Document Upload”**

- **Default:**  
  `{ doclinkId: "test-run", documentId: "test-run", filename: "test-document.pdf" }`  
  so AI prompts with `{{filename}}` work. RAG will run; Pinecone may return no or few matches if the project namespace has no vectors.
- **Optional later:** “Test with document” dropdown to pick a doclink and use its `doclinkId` / `documentId` / `filename`.

**Frontend**

- **“Test run” (or “Run on backend”)** in the sidebar/toolbar that:
  - Requires: project, workflow, and (if you add it) idToken.
  - Calls `startWorkflowExecution` with `workflowId`, `parentId`, and optional `inputData`.
  - On success: refresh executions (or subscribe), switch to **Executions** tab, optionally open the new execution in the Execution details modal; optional toast: “Test run started”.
- **Loading and errors:** disable button while in flight, show a loading state, surface API/network errors (toast or inline).

### 3. Clarify “Execute” vs “Test run” in the UI

- **Execute Workflow**  
  - Tooltip: “Run locally (preview). Uses placeholder data; does not call AI or save results.”
  - Keeps current behavior: local graph only, Run Results from `execute` stubs.
- **Test run** (when implemented)  
  - Tooltip: “Start a real run on the backend. Uses AI, Pinecone, and saves to Executions.”
  - Places the new backend run in Executions and, if you add it, in Execution details.

### 4. Run Results vs Executions

- **Run Results:**  
  - Short subtitle: “Local preview only.”
- **Executions:**  
  - Subtitle: “Backend runs from triggers (e.g. document upload) or Test run.”
- After a **Test run**, auto-select the **Executions** tab and, if possible, the new execution row and open the detail modal.

### 5. Optional: “Test with document”

- In the workflow editor (e.g. near **Test run** or in a small “Test options” panel):  
  - Dropdown: “Use document: [None / test placeholders | doclinks from current project]”.
- If a doclink is chosen, send `inputData: { doclinkId, documentId, filename } }` in `startWorkflowExecution`.
- If None, keep the default synthetic `inputData` above.

### 6. Small UX improvements

- **Execute / Test run**
  - Loading: spinner or “Running…” on the button while a request or local run is in progress.
  - Disable **Execute** when `gridElements.length === 0`; disable **Test run** when no project, no workflow, or no idToken.
- **Keyboard**
  - e.g. `Ctrl+Enter` / `Cmd+Enter` for **Execute** or **Test run** (choose one or both).
- **Empty states**
  - Run Results: “Run the workflow (or use Test run) to see results here.”  
  - Executions: keep or refine “Runs start when this workflow’s trigger (e.g. Doclink Created) fires” and add “or when you use Test run.”

---

## Order of work

1. **Done:** Fix in-browser Execute for Input→AI (sink roots, synthetic input).  
2. **Next:** Implement `startWorkflowExecution` (schema, Lambda, resolver, EventBridge emit).  
3. **Then:** Add **Test run** in the UI, wire to `startWorkflowExecution`, and adjust Run Results / Executions copy and behavior.  
4. **Later:** Optional “Test with document”, keyboard shortcut, and extra loading/empty states.

---

## Schema sketch for `startWorkflowExecution`

```graphql
input StartWorkflowInput {
  workflowId: ID!
  parentId: ID!   # projectId
  inputData: AWSJSON  # optional; default synthetic for On Document Upload
}

# In Mutation:
startWorkflowExecution(input: StartWorkflowInput!): WorkflowExecution
```

The Lambda can implement this by calling the same create logic as `createWorkflowExecution` and then performing `PutEvents` for `Orchestrator.Start`.
