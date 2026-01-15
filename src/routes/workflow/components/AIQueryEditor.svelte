<script lang="ts">
	import type { GridElement, AIQueryData } from '../types';

	import type { PromptTemplate } from "@stratiqai/types-simple"
	const {
		element = null,
		darkMode = false,
		prompt = '',
		model = 'gpt-4o',
		systemPrompt = '',
		onSave,
		onCancel
	}: {
		element?: GridElement | null;
		darkMode?: boolean;
		prompt?: string;
		model?: string;
		systemPrompt?: string;
		onSave?: (data: AIQueryData) => void;
		onCancel?: () => void;
	} = $props();

	function handleSave() {
		if (onSave) {
			onSave({
				prompt,
				model,
				systemPrompt: systemPrompt || undefined
			});
		}
	}

	function handleCancel() {
		if (onCancel) {
			onCancel();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			handleCancel();
		}
	}
</script>

{#if element}
	<div
		class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
		onclick={handleCancel}
		onkeydown={handleKeydown}
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
		tabindex="-1"
	>
		<div
			class="{darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4 border"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="presentation"
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
							bind:value={model}
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
							bind:value={systemPrompt}
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
							bind:value={prompt}
							placeholder="Analyze the following property data: {'{input}'}"
							class="w-full px-3 py-2.5 {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm"
							rows="5"
						></textarea>
						<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1.5">Use {'{input}'} to insert data from connected nodes</p>
					</div>
				</div>

				<div class="flex gap-3 mt-8 pt-6 {darkMode ? 'border-slate-700' : 'border-slate-200'} border-t">
					{#if onSave}
						<button
							onclick={handleSave}
							class="flex-1 px-4 py-2.5 {darkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-900 hover:bg-slate-800'} text-white rounded-md transition-colors font-semibold text-sm shadow-sm hover:shadow"
						>
							Save Configuration
						</button>
					{/if}
					{#if onCancel}
						<button
							onclick={handleCancel}
							class="flex-1 px-4 py-2.5 {darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'} rounded-md transition-colors font-semibold text-sm border"
						>
							Cancel
						</button>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}
