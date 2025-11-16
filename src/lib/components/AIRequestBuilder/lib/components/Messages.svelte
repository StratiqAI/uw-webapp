<!-- src/lib/components/Messages.svelte -->
<script lang="ts">
	import type { Writable } from 'svelte/store';
	import type { Message } from '../state';

	export let messages: Writable<Message[]>;

	function addMessage() {
		$messages = [
			...$messages,
			{
				role: 'user',
				content: '',
				id: crypto.randomUUID()
			}
		];
	}

	function removeMessage(id: string) {
		$messages = $messages.filter((m) => m.id !== id);
	}
</script>

<div class="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
	<div class="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
		Input Messages
	</div>
	{#each $messages as message (message.id)}
		<div
			class="mb-4 flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-4 transition-all duration-200 hover:border-slate-200 hover:bg-white hover:shadow-sm"
		>
			<select
				bind:value={message.role}
				class="font-inherit w-auto min-w-[140px] shrink-0 rounded-lg border-2 border-slate-200 bg-white px-4 py-2.5 text-[0.9375rem] font-medium text-slate-800 shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
				aria-label="Message role"
			>
				<option value="system">System</option>
				<option value="user">User</option>
			</select>
			<textarea
				bind:value={message.content}
				placeholder="Message content..."
				class="font-inherit min-h-[60px] w-full flex-1 resize-y rounded-lg border-2 border-slate-200 bg-white px-4 py-2.5 text-[0.9375rem] font-medium text-slate-800 shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
				rows="2"
				aria-label="Message content"
			></textarea>
			<button
				type="button"
				onclick={() => removeMessage(message.id)}
				class="flex shrink-0 cursor-pointer items-center justify-center rounded-md border-none bg-transparent p-2 text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-red-600"
				aria-label="Remove message"
				title="Remove"
			>
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
					<path
						d="M4 4L12 12M12 4L4 12"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
					/>
				</svg>
			</button>
		</div>
	{/each}
	<button
		type="button"
		onclick={addMessage}
		class="mt-2 inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white px-5 py-2.5 text-[0.9375rem] font-medium text-slate-600 shadow-sm transition-all duration-200 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-md active:scale-[0.98]"
	>
		<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
			<path d="M8 3V13M3 8H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
		</svg>
		Add Message
	</button>
</div>