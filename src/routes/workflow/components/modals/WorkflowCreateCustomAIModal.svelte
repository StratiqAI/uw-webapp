<script lang="ts">
	import WorkflowModal from './WorkflowModal.svelte';

	let {
		darkMode = false,
		customAINodeLabel = $bindable(''),
		customAINodeModel = $bindable('gemini-3-flash-preview'),
		customAINodeSystemPrompt = $bindable(''),
		customAINodePrompt = $bindable(''),
		onCreate,
		onClose
	}: {
		darkMode?: boolean;
		customAINodeLabel?: string;
		customAINodeModel?: string;
		customAINodeSystemPrompt?: string;
		customAINodePrompt?: string;
		onCreate?: () => void;
		onClose?: () => void;
	} = $props();
</script>

<WorkflowModal
	{darkMode}
	labelledBy="create-modal-title"
	maxWidthClass="max-w-2xl"
	maxHeightClass="max-h-[90vh]"
	containerClass="overflow-y-auto"
	{onClose}
>
	<div class="p-6">
		<div class="flex items-center gap-3 mb-6 pb-4 {darkMode ? 'border-slate-700' : 'border-slate-200'} border-b">
			<div class="w-10 h-10 {darkMode ? 'bg-indigo-900' : 'bg-indigo-100'} rounded-lg flex items-center justify-center">
				<svg class="w-5 h-5 {darkMode ? 'text-indigo-300' : 'text-indigo-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
				</svg>
			</div>
			<div>
				<h2 id="create-modal-title" class="text-xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
					Create Custom AI Node
				</h2>
				<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-0.5">Add a new AI analysis node to your workflow</p>
			</div>
		</div>

		<div class="space-y-5">
			<div>
				<label for="custom-ai-label" class="block text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'} mb-2">
					Node Name <span class="text-red-500">*</span>
				</label>
				<input
					id="custom-ai-label"
					type="text"
					bind:value={customAINodeLabel}
					placeholder="e.g., Tenant Analysis, ROI Calculation"
					class="w-full px-3 py-2.5 {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
				/>
			</div>

			<div>
				<label for="custom-ai-model-select" class="block text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'} mb-2">
					AI Model
				</label>
				<select
					id="custom-ai-model-select"
					bind:value={customAINodeModel}
					class="w-full px-3 py-2.5 {darkMode ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
				>
					<option value="gemini-3-flash-preview">Gemini 3 Flash Preview</option>
					<option value="gemini-3-pro-preview">Gemini 3 Pro Preview</option>
				</select>
			</div>

			<div>
				<label for="custom-ai-system-prompt" class="block text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'} mb-2">
					Context Instructions <span class="{darkMode ? 'text-slate-500' : 'text-slate-400'} font-normal">(Optional)</span>
				</label>
				<textarea
					id="custom-ai-system-prompt"
					bind:value={customAINodeSystemPrompt}
					placeholder="You are an expert commercial real estate analyst..."
					class="w-full px-3 py-2.5 {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm"
					rows="3"
				></textarea>
				<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1.5">Provide context about the AI's role and expertise</p>
			</div>

			<div>
				<label for="custom-ai-user-prompt" class="block text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'} mb-2">
					Analysis Prompt <span class="text-red-500">*</span>
				</label>
				<textarea
					id="custom-ai-user-prompt"
					bind:value={customAINodePrompt}
					placeholder="Analyze the following property data: {'{input}'}"
					class="w-full px-3 py-2.5 {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm"
					rows="5"
				></textarea>
				<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1.5">Use {'{input}'} to insert data from connected nodes</p>
			</div>
		</div>

		<div class="flex gap-3 mt-6">
			<button
				onclick={onCreate}
				disabled={!customAINodeLabel.trim() || !customAINodePrompt.trim()}
				class="flex-1 px-4 py-2.5 {darkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-900 hover:bg-slate-800'} text-white rounded-md transition-colors font-semibold text-sm shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
			>
				Create Node
			</button>
			<button
				onclick={onClose}
				class="flex-1 px-4 py-2.5 {darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'} rounded-md transition-colors font-semibold text-sm border"
			>
				Cancel
			</button>
		</div>
	</div>
</WorkflowModal>
