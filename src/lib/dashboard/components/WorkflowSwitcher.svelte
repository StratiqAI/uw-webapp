<script lang="ts">
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import { toastStore } from '$lib/stores/toastStore.svelte';

	// Workflow type - defined locally since it may not be exported from types-simple
	type Workflow = {
		id: string;
		name: string;
		definition: any;
		[key: string]: any;
	};

	interface Props {
		workflows: Workflow[];
		selectedWorkflowId: string | null;
		darkMode: boolean;
		onWorkflowChange: (workflowId: string | null) => void;
		onRename?: (workflowId: string, newName: string) => Promise<void>;
		onDelete?: (workflowId: string) => Promise<void>;
	}

	let { workflows, selectedWorkflowId, darkMode, onWorkflowChange, onRename, onDelete }: Props = $props();
	let isOpen = $state(false);
	let deleteConfirmOpen = $state(false);
	let deleteConfirmWorkflow = $state<Workflow | null>(null);
	let editingWorkflowId = $state<string | null>(null);
	let editingName = $state('');
	let renameInputRef: HTMLInputElement | null = $state(null);

	const selectedWorkflow = $derived(
		selectedWorkflowId ? workflows.find((w) => w.id === selectedWorkflowId) : null
	);

	function handleSelect(workflowId: string | null) {
		onWorkflowChange(workflowId);
		isOpen = false;
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.workflow-switcher')) {
			isOpen = false;
			cancelEdit();
		}
	}

	function startEdit(workflow: Workflow, event: MouseEvent) {
		event.stopPropagation();
		editingWorkflowId = workflow.id;
		editingName = workflow.name || '';
		// Focus the input after it's rendered
		setTimeout(() => {
			renameInputRef?.focus();
			renameInputRef?.select();
		}, 0);
	}

	function cancelEdit() {
		editingWorkflowId = null;
		editingName = '';
	}

	async function saveEdit(workflowId: string) {
		const trimmedName = editingName.trim();
		if (!trimmedName) {
			cancelEdit();
			return;
		}

		if (onRename) {
			try {
				await onRename(workflowId, trimmedName);
				cancelEdit();
			} catch (error) {
				console.error('Failed to rename workflow:', error);
				// Keep editing state on error so user can retry
			}
		} else {
			cancelEdit();
		}
	}

	function handleKeyDown(event: KeyboardEvent, workflowId: string) {
		if (event.key === 'Enter') {
			event.preventDefault();
			saveEdit(workflowId);
		} else if (event.key === 'Escape') {
			event.preventDefault();
			cancelEdit();
		}
	}

	function handleDelete(workflow: Workflow, event: MouseEvent) {
		event.stopPropagation();
		deleteConfirmWorkflow = workflow;
		deleteConfirmOpen = true;
	}

	async function confirmDeleteWorkflow() {
		const workflow = deleteConfirmWorkflow;
		if (!workflow || !onDelete) return;
		try {
			await onDelete(workflow.id);
		} catch (error) {
			console.error('Failed to delete workflow:', error);
			toastStore.error(
				`Error deleting workflow: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	$effect(() => {
		if (!deleteConfirmOpen) deleteConfirmWorkflow = null;
	});

	$effect(() => {
		if (isOpen) {
			document.addEventListener('click', handleClickOutside);
			return () => {
				document.removeEventListener('click', handleClickOutside);
			};
		}
	});
</script>

<div class="workflow-switcher relative">
	<button
		onclick={() => (isOpen = !isOpen)}
		class="flex items-center gap-2 px-3 py-2 {darkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'} rounded-lg transition-colors text-sm font-medium"
		aria-label="Select workflow"
		aria-expanded={isOpen}
		disabled={workflows.length === 0}
	>
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
		</svg>
		<span class="max-w-[200px] truncate">
			{selectedWorkflow ? selectedWorkflow.name || 'Unnamed Workflow' : workflows.length === 0 ? 'No Workflows' : 'Select Workflow'}
		</span>
		<svg
			class="w-4 h-4 transition-transform {isOpen ? 'rotate-180' : ''}"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
		</svg>
	</button>

	{#if isOpen}
		<div
			class="absolute top-full left-0 mt-2 w-64 {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto"
		>
			<div class="p-2">
				{#if workflows.length === 0}
					<div class="px-3 py-2 text-sm {darkMode ? 'text-slate-400' : 'text-slate-600'}">
						No workflows available
					</div>
				{:else}
					<button
						onclick={() => handleSelect(null)}
						class="w-full text-left px-3 py-2 rounded-md text-sm {darkMode ? selectedWorkflowId === null ? 'bg-indigo-900 text-indigo-300' : 'text-slate-300 hover:bg-slate-700' : selectedWorkflowId === null ? 'bg-indigo-100 text-indigo-700' : 'text-slate-700 hover:bg-slate-100'} transition-colors"
					>
						<div class="flex items-center gap-2">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
							</svg>
							<span>New Workflow</span>
						</div>
					</button>
					<div class="h-px {darkMode ? 'bg-slate-700' : 'bg-slate-200'} my-2"></div>
					{#each workflows as workflow}
						<div
							class="group relative flex items-center gap-1 px-3 py-2 rounded-md text-sm {darkMode ? selectedWorkflowId === workflow.id ? 'bg-indigo-900 text-indigo-300' : 'text-slate-300 hover:bg-slate-700' : selectedWorkflowId === workflow.id ? 'bg-indigo-100 text-indigo-700' : 'text-slate-700 hover:bg-slate-100'} transition-colors"
						>
							{#if editingWorkflowId === workflow.id}
								<!-- Inline edit mode -->
								<input
									bind:this={renameInputRef}
									bind:value={editingName}
									onkeydown={(e) => handleKeyDown(e, workflow.id)}
									onblur={() => saveEdit(workflow.id)}
									class="flex-1 px-2 py-1 text-sm {darkMode ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-900 border-slate-300'} rounded border focus:outline-none focus:ring-2 focus:ring-indigo-500"
									placeholder="Workflow name"
								/>
							{:else}
								<!-- Display mode -->
								<button
									onclick={() => handleSelect(workflow.id)}
									class="flex-1 text-left flex items-center gap-2 min-w-0"
								>
									<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
									</svg>
									<span class="truncate">{workflow.name || 'Unnamed Workflow'}</span>
								</button>
								{#if selectedWorkflowId === workflow.id}
									<svg class="w-4 h-4 flex-shrink-0 {darkMode ? 'text-indigo-300' : 'text-indigo-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
									</svg>
								{/if}
								{#if onRename}
									<button
										onclick={(e) => startEdit(workflow, e)}
										class="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity {darkMode ? 'text-slate-400 hover:text-slate-300 hover:bg-slate-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'}"
										title="Rename workflow"
										aria-label="Rename workflow"
									>
										<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
										</svg>
									</button>
								{/if}
								{#if onDelete}
									<button
										onclick={(e) => handleDelete(workflow, e)}
										class="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity {darkMode ? 'text-red-400 hover:text-red-300 hover:bg-slate-600' : 'text-red-500 hover:text-red-600 hover:bg-slate-200'}"
										title="Delete workflow"
										aria-label="Delete workflow"
									>
										<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
										</svg>
									</button>
								{/if}
							{/if}
						</div>
					{/each}
				{/if}
			</div>
		</div>
	{/if}
</div>

<ConfirmModal
	bind:open={deleteConfirmOpen}
	title="Delete workflow?"
	message={deleteConfirmWorkflow
		? `Are you sure you want to delete "${deleteConfirmWorkflow.name || 'Unnamed Workflow'}"? This action cannot be undone.`
		: ''}
	confirmLabel="Delete"
	cancelLabel="Cancel"
	{darkMode}
	onConfirm={confirmDeleteWorkflow}
/>
