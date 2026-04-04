import type { GridElement, WorkflowResult } from '../../types/workflow';
import type { Connection } from '../../types/connection';

/**
 * Run workflow locally (in-browser). Uses output-type nodes as roots when present;
 * otherwise sink nodes (no outgoing connections) so Input→AI runs without an Output node.
 * Does not call the backend; for real runs use triggers or startWorkflowExecution.
 */
export async function executeWorkflow(
	gridElements: GridElement[],
	connections: Connection[]
): Promise<WorkflowResult[]> {
	const processed = new Set<string>();
	const results = new Map<string, any>();

	async function executeElement(elementId: string): Promise<any> {
		if (processed.has(elementId)) return results.get(elementId);

		const element = gridElements.find((el) => el.id === elementId);
		if (!element) return null;

		const inputConnections = connections.filter((conn) => conn.to === elementId);
		let input: any = null;

		if (inputConnections.length > 0) {
			const inputs = await Promise.all(
				inputConnections.map((conn) => executeElement(conn.from))
			);
			input = inputs.length === 1 ? inputs[0] : inputs;
		} else if (element.type.type === 'input') {
			input = (element as any).nodeOptions ?? {};
		}

		const exec = (element.type as any).execute;
		const outputPromise = exec ? exec(input, (element as any).aiQueryData) : null;
		const output = await Promise.resolve(outputPromise);
		(element as any).output = output;
		results.set(elementId, output);
		processed.add(elementId);
		return output;
	}

	// Prioritize Workflow Output node as the single root
	const workflowOutputElement = gridElements.find((el) => el.type.id === 'workflow-output');
	const outputTypeElements = gridElements.filter((el) => el.type.type === 'output' && el.type.id !== 'workflow-output');
	const sinkElements = gridElements.filter((el) => !connections.some((c) => c.from === el.id));
	
	// Use Workflow Output if present, otherwise fall back to other output nodes or sinks
	const roots = workflowOutputElement 
		? [workflowOutputElement]
		: outputTypeElements.length > 0 
			? outputTypeElements 
			: sinkElements;

	if (roots.length === 0) {
		await Promise.all(gridElements.map((el) => executeElement(el.id)));
	} else {
		await Promise.all(roots.map((el) => executeElement(el.id)));
	}

	return Array.from(results.entries()).map(([id, value]) => {
		const element = gridElements.find((el) => el.id === id);
		return {
			elementId: id,
			label: element?.type.label || (element?.type as any)?.id || '',
			value
		};
	});
}
