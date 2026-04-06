<script lang="ts">
	import { onMount } from 'svelte';
	import { v4 as uuid } from 'uuid';
	import { marked } from 'marked';
	import type { ChatMessage, AIAction } from '$lib/types/chat';
	import { parseActionsFromReply } from '$lib/types/chat';
	import { ui } from '$lib/stores/ui.svelte';
	import { aiService } from '$lib/services/ai';
	import type { UsageContext } from '$lib/services/ai';
	import { authStore } from '$lib/stores/auth.svelte';

	let { model: initialModel }: { onActions?: (actions: AIAction[]) => void; model?: string } =
		$props();
	// Initial-only default; user changes are local until parent passes a new `model`
	// svelte-ignore state_referenced_locally
	let model = $state(initialModel ?? 'gpt-4o-mini');

	// --- demo state ---
	type Task = { id: string; title: string; status: 'todo' | 'doing' | 'done' };
	let tasks = $state<Task[]>([
		{ id: uuid(), title: 'Sketch dashboard layout', status: 'todo' },
		{ id: uuid(), title: 'Integrate billing', status: 'doing' },
		{ id: uuid(), title: 'Write release notes', status: 'done' }
	]);

	// --- action handlers from AI ---
	function onActions(actions: AIAction[]) {
		for (const a of actions) {
			switch (a.type) {
				case 'add_task': {
					const id = uuid();
					tasks = [...tasks, { id, title: a.payload.title, status: a.payload.status ?? 'todo' }];
					break;
				}
				case 'update_task': {
					tasks = tasks.map((t) =>
						t.id === a.payload.id
							? {
									...t,
									...('title' in a.payload ? { title: a.payload.title! } : {}),
									...('status' in a.payload ? { status: a.payload.status! } : {})
								}
							: t
					);
					break;
				}
				case 'delete_task': {
					tasks = tasks.filter((t) => t.id !== a.payload.id);
					break;
				}
				case 'move_task': {
					tasks = tasks.map((t) => (t.id === a.payload.id ? { ...t, status: a.payload.to } : t));
					break;
				}
			}
		}
	}

	// --- helpers ---
	const columns: { key: Task['status']; title: string }[] = [
		{ key: 'todo', title: 'To do' },
		{ key: 'doing', title: 'In progress' },
		{ key: 'done', title: 'Done' },
		{ key: 'todo', title: 'To do' },
		{ key: 'doing', title: 'In progress' },
		{ key: 'done', title: 'Done' }
	];

	// Configure marked for synchronous parsing
	marked.setOptions({
		async: false
	});

	function renderMarkdown(content: string): string {
		return marked.parse(content) as string;
	}

	let quickTaskModalOpen = $state(false);
	let quickTaskStatus = $state<Task['status']>('todo');
	let quickTaskTitle = $state('');

	function addQuick(status: Task['status']) {
		quickTaskStatus = status;
		quickTaskTitle = '';
		quickTaskModalOpen = true;
	}

	function submitQuickTask() {
		const title = quickTaskTitle.trim();
		if (!title) return;
		tasks = [...tasks, { id: uuid(), title, status: quickTaskStatus }];
		quickTaskModalOpen = false;
	}

	let loading = $state(false);
	let messages = $state<ChatMessage[]>([
		{
			id: uuid(),
			role: 'assistant',
			content:
				'Hi! I can help and also control the app. Try: “What is the population and income like around the property at address 907-1015 S WW White Road, San Antonio, TX 78220?”',
			ts: new Date().toISOString()
		}
	]);
	let input = $state('');

	function push(role: ChatMessage['role'], content: string) {
		messages = [...messages, { id: uuid(), role, content, ts: new Date().toISOString() }];
		queueMicrotask(() =>
			document.getElementById('chat-end')?.scrollIntoView({ behavior: 'smooth' })
		);
		try {
			localStorage.setItem('drawer.messages', JSON.stringify(messages.slice(-200)));
		} catch {}
	}

	onMount(() => {
		try {
			const saved = localStorage.getItem('drawer.messages');
			if (saved) {
				const parsedMessages = JSON.parse(saved);
				messages = parsedMessages.filter(
					(msg: any) => msg.role === 'system' || msg.role === 'user' || msg.role === 'assistant'
				);
			}
		} catch {}
	});

	async function send() {
		const text = input.trim();
		if (!text || loading) return;
		input = '';
		push('user', text);

		loading = true;
		try {
			const usage: UsageContext = {
				tenantId: authStore.currentUser?.tenant ?? 'default',
				ownerId: authStore.currentUser?.sub ?? '',
				featureSource: 'chat'
			};

			const response = await aiService.query(
				{
					model,
					messages: messages.map(({ role, content }) => ({ role: role as 'user' | 'assistant' | 'system', content }))
				},
				usage
			);

			const reply = response.content ?? '';
			push('assistant', reply);

			const actions = parseActionsFromReply(reply);
			if (actions.length) onActions?.(actions);
		} catch (e: any) {
			push('assistant', `Error: ${e?.message ?? e}`);
		} finally {
			loading = false;
		}
	}

	function key(e: KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') send();
	}

	function toggle() {
		ui.setOpen(!ui.sidebarOpen);
	}

	function clearMessages() {
		try {
			localStorage.removeItem('drawer.messages');
			messages = [
				{
					id: uuid(),
					role: 'assistant',
					content:
						'Hi! I can help and also control the app. Try: "Add a task to email the pipeline investors today."',
					ts: new Date().toISOString()
				}
			];
		} catch {}
	}

	// --- Drag-resize logic ---
	let startX = 0;
	let startWidth = 0;
	let resizing = $state(false);

	function beginResize(e: PointerEvent) {
		if (e.button !== 0) return;
		resizing = true;
		startX = e.clientX;
		startWidth = ui.sidebarWidth;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		document.documentElement.classList.add('select-none'); // prevent text selection while dragging
	}

	function onResizeMove(e: PointerEvent) {
		if (!resizing) return;
		// Handle is on the LEFT edge of the drawer. Moving pointer LEFT increases width.
		const delta = startX - e.clientX;
		ui.setWidth(startWidth + delta);
	}

	function endResize(e: PointerEvent) {
		if (!resizing) return;
		resizing = false;
		try {
			(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
		} catch {}
		document.documentElement.classList.remove('select-none');
	}
</script>

<!-- Drawer Shell (fixed overlay on the right) -->
<div
	class="fixed inset-y-0 right-0 z-40 flex flex-col border-l border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
	class:hidden={!ui.sidebarOpen}
	style={`width:${ui.sidebarWidth}px`}
>
	<!-- Left-edge drag handle -->
	<div
		title="Drag to resize"
		onpointerdown={beginResize}
		onpointermove={onResizeMove}
		onpointerup={endResize}
		onpointercancel={endResize}
		class="group absolute left-0 top-0 h-full w-1 cursor-col-resize"
	>
		<!-- a slightly easier-to-grab invisible area -->
		<div class="absolute -left-1 top-0 h-full w-3"></div>
		<!-- visual affordance (thin line) -->
		<div
			class="h-full w-px bg-gray-300 opacity-0 transition-opacity group-hover:opacity-100 dark:bg-gray-700"
		></div>
	</div>

	<!-- Header -->
	<div
		class="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800"
	>
		<div class="flex items-center gap-2">
			<!-- <div class="w-9 h-9 rounded-2xl bg-blue-600 text-white grid place-items-center font-semibold">AI</div> -->
			<div>
				<div class="text-sm font-semibold text-gray-900 dark:text-gray-100">StratiqAI</div>
				<div class="text-xs text-gray-500 dark:text-gray-400">Ctrl/⌘+Enter to send</div>
			</div>
		</div>

		<div class="flex items-center gap-2">
			<!-- <select
				bind:value={model}
				class="rounded-xl border border-gray-300 px-2 py-1 pr-6 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
			>
				<option value="gpt-4o-mini">gpt-4o-mini</option>
				<option value="gpt-4o">gpt-4o</option>
				<option value="gpt-4">gpt-4</option>
				<option value="gpt-4-turbo">gpt-4-turbo</option>
				<option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
				<option value="gpt-3.5">gpt-3.5</option>
			</select> -->

			<button
				type="button"
				onclick={toggle}
				class="rounded-lg border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
			>
				Close
			</button>

			<button
				type="button"
				onclick={clearMessages}
				class="rounded-lg border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-200 dark:hover:bg-red-800"
			>
				Clear
			</button>
		</div>
	</div>

	<!-- Messages -->
	<div
		class="flex-1 space-y-3 overflow-auto px-4 py-3"
		style={resizing ? 'cursor: col-resize;' : ''}
	>
		{#each messages as m (m.id)}
			<div class="flex {m.role === 'user' ? 'justify-end' : 'justify-start'}">
				<div
					class="{m.role === 'user'
						? 'bg-blue-600 text-white'
						: 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'} max-w-[85%] rounded-2xl px-4 py-2"
				>
					<div class="mb-1 text-[11px] opacity-70">
						{m.role} · {m.ts ? new Date(m.ts).toLocaleTimeString() : ''}
					</div>
					<div class="prose prose-sm max-w-none text-sm dark:prose-invert">{@html renderMarkdown(m.content)}</div>
				</div>
			</div>
		{/each}
		{#if loading}
			<div class="text-xs text-gray-500 dark:text-gray-400">StratiqAI is typing…</div>
		{/if}
		<div id="chat-end"></div>
	</div>

	<!-- Composer -->
	<div class="border-t border-gray-200 p-3 dark:border-gray-800">
		<div class="flex gap-2">
			<textarea 
			aria-label="Chat input"
				bind:value={input}
				rows="1"
				onkeydown={key}
				placeholder="Ask the AI to help…"
				class="w-full flex-1 resize-none rounded-2xl border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
				disabled={loading}
			></textarea>
			<button
				aria-label="Send message"
				onclick={send}
				disabled={loading}
				class="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
			>
				Send
			</button>
		</div>
	</div>
</div>

{#if quickTaskModalOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="quick-task-title"
	>
		<button
			type="button"
			class="absolute inset-0 cursor-default"
			aria-label="Close"
			onclick={() => (quickTaskModalOpen = false)}
		></button>
		<div
			class="relative z-10 w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-gray-900"
		>
			<h2 id="quick-task-title" class="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
				New task
			</h2>
			<input
				type="text"
				bind:value={quickTaskTitle}
				placeholder="Task title"
				class="mb-4 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
				onkeydown={(e) => {
					if (e.key === 'Enter') {
						e.preventDefault();
						submitQuickTask();
					}
					if (e.key === 'Escape') quickTaskModalOpen = false;
				}}
			/>
			<div class="flex justify-end gap-2">
				<button
					type="button"
					class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
					onclick={() => (quickTaskModalOpen = false)}
				>
					Cancel
				</button>
				<button
					type="button"
					class="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
					onclick={submitQuickTask}
				>
					Add
				</button>
			</div>
		</div>
	</div>
{/if}
