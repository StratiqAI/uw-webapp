<script lang="ts">
	import type { GridElement } from '../types';
	import WorkflowModal from './WorkflowModal.svelte';

	let {
		darkMode = false,
		editingAIQuery = $bindable(null),
		onSave,
		onClose
	}: {
		darkMode?: boolean;
		editingAIQuery?: GridElement | null;
		onSave?: () => void;
		onClose?: () => void;
	} = $props();

	let aiQueryModel = $state('gpt-4o');
	let aiQuerySystemPrompt = $state('');
	let aiQueryPrompt = $state('');

	$effect(() => {
		if (editingAIQuery) {
			const defaults = editingAIQuery.type.defaultAIQueryData;
			aiQueryPrompt = editingAIQuery.aiQueryData?.prompt ?? defaults?.prompt ?? '';
			aiQueryModel = editingAIQuery.aiQueryData?.model ?? defaults?.model ?? 'gpt-4o';
			aiQuerySystemPrompt = editingAIQuery.aiQueryData?.systemPrompt ?? defaults?.systemPrompt ?? '';
		} else {
			aiQueryPrompt = '';
			aiQueryModel = 'gpt-4o';
			aiQuerySystemPrompt = '';
		}
	});

	function saveAIQuery() {
		if (!editingAIQuery) return;

		editingAIQuery.aiQueryData = {
			prompt: aiQueryPrompt,
			model: aiQueryModel,
			systemPrompt: aiQuerySystemPrompt || undefined
		};

		editingAIQuery = null;
		onSave?.();
	}

	function cancelEditAIQuery() {
		editingAIQuery = null;
		onClose?.();
	}
</script>

<WorkflowModal
	{darkMode}
	labelledBy="modal-title"
	maxWidthClass="max-w-2xl"
	maxHeightClass="max-h-[90vh]"
	containerClass="overflow-y-auto"
	{onClose}
>
	<div class="p-6">
		<div class="flex items-center gap-3 mb-6 pb-4 {darkMode ? 'border-slate-700' : 'border-slate-200'} border-b">
			<div class="w-10 h-10 {darkMode ? 'bg-indigo-900' : 'bg-indigo-100'} rounded-lg flex items-center justify-center">
				<span class="{darkMode ? 'text-indigo-300' : 'text-indigo-600'} font-bold text-sm">AI</span>
			</div>
			<div>
				<h2 id="modal-title" class="text-xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
					Configure AI Analysis
				</h2>
				<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-0.5">Set up AI processing parameters</p>
			</div>
		</div>

		<div class="space-y-5">
			<div>
				<label for="ai-model-select" class="block text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'} mb-2">
					AI Model
				</label>
				<select
					id="ai-model-select"
					bind:value={aiQueryModel}
					class="w-full px-3 py-2.5 {darkMode ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
				>
					<option value="gpt-4o">GPT-4o</option>
					<option value="gpt-4o-mini">GPT-4o Mini</option>
					<option value="gpt-4-turbo">GPT-4 Turbo</option>
					<option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
				</select>
			</div>

			<div>
				<label for="ai-system-prompt" class="block text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'} mb-2">
					Context Instructions <span class="{darkMode ? 'text-slate-500' : 'text-slate-400'} font-normal">(Optional)</span>
				</label>
				<textarea
					id="ai-system-prompt"
					bind:value={aiQuerySystemPrompt}
					placeholder="You are an expert commercial real estate analyst..."
					class="w-full px-3 py-2.5 {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm"
					rows="3"
				></textarea>
				<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1.5">Provide context about the AI's role and expertise</p>
			</div>

			<div>
				<label for="ai-user-prompt" class="block text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'} mb-2">
					Analysis Prompt
				</label>
				<textarea
					id="ai-user-prompt"
					bind:value={aiQueryPrompt}
					placeholder="Analyze the following property data: {'{input}'}"
					class="w-full px-3 py-2.5 {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm"
					rows="5"
				></textarea>
				<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1.5">Use {'{input}'} to insert data from connected nodes</p>
			</div>
		</div>

		<div class="flex gap-3 mt-8 pt-6 {darkMode ? 'border-slate-700' : 'border-slate-200'} border-t">
			<button
				onclick={saveAIQuery}
				class="flex-1 px-4 py-2.5 {darkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-900 hover:bg-slate-800'} text-white rounded-md transition-colors font-semibold text-sm shadow-sm hover:shadow"
			>
				Save Configuration
			</button>
			<button
				onclick={cancelEditAIQuery}
				class="flex-1 px-4 py-2.5 {darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'} rounded-md transition-colors font-semibold text-sm border"
			>
				Cancel
			</button>
		</div>
	</div>
</WorkflowModal>
