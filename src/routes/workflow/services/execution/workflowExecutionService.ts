import type { GridElement, WorkflowResult } from '../../types/workflow';
import type { Connection } from '../../types/connection';

export async function executeWorkflow(
	gridElements: GridElement[],
	connections: Connection[]
): Promise<WorkflowResult[]> {
	// Build execution order (topological sort)
	const processed = new Set<string>();
	const results = new Map<string, any>();

	async function executeElement(elementId: string): Promise<any> {
		if (processed.has(elementId)) {
			return results.get(elementId);
		}

		const element = gridElements.find((el) => el.id === elementId);
		if (!element) return null;

		// Get inputs from connected elements
		const inputConnections = connections.filter((conn) => conn.to === elementId);
		let input = null;

		if (inputConnections.length > 0) {
			const inputs = await Promise.all(
				inputConnections.map((conn) => executeElement(conn.from))
			);
			input = inputs.length === 1 ? inputs[0] : inputs;
		}

		// Execute element (handle both sync and async)
		const outputPromise = element.type.execute(input, element.aiQueryData);
		const output = await Promise.resolve(outputPromise);
		element.output = output;
		results.set(elementId, output);
		processed.add(elementId);

		return output;
	}

	// Execute all output elements (they will trigger upstream execution)
	const outputElements = gridElements.filter((el) => el.type.type === 'output');
	await Promise.all(outputElements.map((el) => executeElement(el.id)));

	// Collect results
	return Array.from(results.entries()).map(([id, value]) => {
		const element = gridElements.find((el) => el.id === id);
		return {
			elementId: id,
			label: element?.type.label || '',
			value
		};
	});
}
