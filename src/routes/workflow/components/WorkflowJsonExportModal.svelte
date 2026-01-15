<script lang="ts">
	import type { Connection, GridElement } from '../types';
	import WorkflowModal from './WorkflowModal.svelte';

	let {
		darkMode = false,
		gridElements = [],
		connections = [],
		onClose
	}: {
		darkMode?: boolean;
		gridElements?: GridElement[];
		connections?: Connection[];
		onClose?: () => void;
	} = $props();

	let copiedToClipboard = $state(false);

	function generateWorkflowJSON() {
		const workflow = {
			elements: gridElements.map((el) => ({
				id: el.id,
				type: el.type.id,
				typeLabel: el.type.label,
				x: el.x,
				y: el.y,
				width: el.width,
				height: el.height,
				...(el.aiQueryData && { aiQueryData: el.aiQueryData }),
				...(el.output !== undefined && { output: el.output }),
				...(el.nodeOptions !== undefined && { nodeOptions: el.nodeOptions }),
				...(el.commentText && { commentText: el.commentText })
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

	const workflowJSON = $derived(generateWorkflowJSON());

	$effect(() => {
		workflowJSON;
		copiedToClipboard = false;
	});

	async function copyWorkflowJSON() {
		try {
			await navigator.clipboard.writeText(workflowJSON);
			copiedToClipboard = true;
			setTimeout(() => {
				copiedToClipboard = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}

	function downloadWorkflowJSON() {
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
</script>

<WorkflowModal {darkMode} labelledBy="json-modal-title" maxWidthClass="max-w-4xl" maxHeightClass="max-h-[90vh]" containerClass="overflow-hidden flex flex-col" {onClose}>
	<div class="p-6 border-b {darkMode ? 'border-slate-700' : 'border-slate-200'} flex items-center justify-between">
		<div class="flex items-center gap-3">
			<div class="w-10 h-10 {darkMode ? 'bg-indigo-900' : 'bg-indigo-100'} rounded-lg flex items-center justify-center">
				<svg class="w-5 h-5 {darkMode ? 'text-indigo-300' : 'text-indigo-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
				</svg>
			</div>
			<div>
				<h2 id="json-modal-title" class="text-xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
					Workflow JSON Export
				</h2>
				<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-0.5">Copy or download the JSON representation of your workflow</p>
			</div>
		</div>
		<div class="flex items-center gap-2">
			<button
				onclick={copyWorkflowJSON}
				class="px-3 py-1.5 text-sm font-medium {darkMode ? 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/20' : 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50'} rounded transition-colors flex items-center gap-1.5"
			>
				{#if copiedToClipboard}
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
					</svg>
					Copied!
				{:else}
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
					</svg>
					Copy
				{/if}
			</button>
			<button
				onclick={downloadWorkflowJSON}
				class="px-3 py-1.5 text-sm font-medium {darkMode ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'} rounded transition-colors flex items-center gap-1.5"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
				</svg>
				Download
			</button>
			<button
				onclick={onClose}
				class="p-1.5 {darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'} rounded transition-colors"
				aria-label="Close modal"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
				</svg>
			</button>
		</div>
	</div>

	<div class="flex-1 overflow-y-auto p-6">
		<pre class="{darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'} rounded-lg p-4 overflow-x-auto text-sm font-mono border {darkMode ? 'border-slate-700' : 'border-slate-200'}"><code>{workflowJSON}</code></pre>
	</div>
</WorkflowModal>
