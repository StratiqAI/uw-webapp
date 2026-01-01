import type { GridElement, WorkflowJSON } from '../types/workflow';
import type { Connection } from '../types/connection';

export function generateWorkflowJSON(
	gridElements: GridElement[],
	connections: Connection[]
): string {
	const workflow: WorkflowJSON = {
		elements: gridElements.map((el) => ({
			id: el.id,
			type: el.type.id,
			typeLabel: el.type.label,
			x: el.x,
			y: el.y,
			width: el.width,
			height: el.height,
			...(el.aiQueryData && { aiQueryData: el.aiQueryData }),
			...(el.output !== undefined && { output: el.output })
		})),
		connections: connections.map((conn) => ({
			id: conn.id,
			from: conn.from,
			to: conn.to,
			fromSide: conn.fromSide,
			toSide: conn.toSide
		}))
	};
	return JSON.stringify(workflow, null, 2);
}

export async function copyWorkflowJSONToClipboard(workflowJSON: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(workflowJSON);
		return true;
	} catch (err) {
		console.error('Failed to copy:', err);
		return false;
	}
}

export function downloadWorkflowJSON(workflowJSON: string): void {
	const blob = new Blob([workflowJSON], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `workflow-${Date.now()}.json`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}
