<script lang="ts">
	import { listQuestions, createQuestion } from '$lib/dealRoom/dealRoomService';
	import { dealRoomSampleStore } from '$lib/dealRoom/stores/dealRoomSampleStore.svelte';
	import type { Question } from '$lib/dealRoom/types';
	import { authStore } from '$lib/stores/auth.svelte';

	interface Props {
		projectId: string;
		idToken: string;
		darkMode: boolean;
	}

	let { projectId, idToken, darkMode }: Props = $props();

	let questions = $state<Question[]>([]);
	let loading = $state(true);
	let fromFallback = $state(false);
	let newTitle = $state('');
	let newBody = $state('');
	let creating = $state(false);

	const useSample = $derived(dealRoomSampleStore.isActive(projectId));
	const userId = $derived(authStore.currentUser?.sub ?? '');

	function load() {
		if (useSample && dealRoomSampleStore.data) {
			questions = dealRoomSampleStore.data.questions ?? [];
			fromFallback = true;
			loading = false;
			return;
		}
		if (!projectId || !idToken) return;
		loading = true;
		listQuestions(projectId, idToken).then((res) => {
			questions = res.data ?? [];
			fromFallback = res.fromFallback;
			loading = false;
		});
	}

	$effect(() => {
		if (useSample && dealRoomSampleStore.data) {
			questions = dealRoomSampleStore.data.questions ?? [];
			fromFallback = true;
			loading = false;
			return;
		}
		if (projectId && idToken) load();
	});

	async function handleCreate() {
		const text = [newTitle.trim(), newBody.trim()].filter(Boolean).join('\n\n');
		if (!idToken || !text) return;
		creating = true;
		await createQuestion(
			{ parentId: projectId, authorId: userId || undefined, questionText: text, isPublic: true },
			idToken
		);
		creating = false;
		newTitle = '';
		newBody = '';
		load();
	}
</script>

<div class="space-y-6">
	<div class="rounded-xl p-6 {darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'} shadow-sm">
		<h2 class="text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-4">Q&amp;A</h2>

		<div class="mb-6 space-y-3">
			<input
				type="text"
				bind:value={newTitle}
				placeholder="Question title"
				class="w-full rounded-lg border px-3 py-2 text-sm {darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900'}"
			/>
			<textarea
				bind:value={newBody}
				placeholder="Question details"
				rows="3"
				class="w-full rounded-lg border px-3 py-2 text-sm {darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900'}"
			></textarea>
			<button
				onclick={handleCreate}
				disabled={creating}
				class="rounded-lg px-4 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
			>
				{creating ? 'Posting…' : 'Post question'}
			</button>
		</div>

		{#if loading}
			<div class="flex justify-center py-6">
				<div class="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
			</div>
		{:else}
			<ul class="space-y-4">
				{#each questions as q}
					<li class="rounded-lg p-4 {darkMode ? 'bg-slate-700/50 border border-slate-600' : 'bg-slate-50 border border-slate-200'}">
						<div class="font-medium whitespace-pre-wrap {darkMode ? 'text-slate-200' : 'text-slate-900'}">{q.questionText ?? 'No text'}</div>
						<div class="mt-2 text-xs {darkMode ? 'text-slate-500' : 'text-slate-400'}">
							{#if q.createdAt}
								{new Date(q.createdAt).toLocaleDateString()}
							{/if}
							{#if q.isPublic}
								<span class="ml-2">Public</span>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
			{#if questions.length === 0 && !loading}
				<p class="py-4 text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">No questions yet.</p>
			{/if}
		{/if}

		{#if fromFallback}
			<p class="mt-3 text-sm {darkMode ? 'text-amber-400' : 'text-amber-600'}">Demo content. Connect backend for real Q&amp;A.</p>
		{/if}
	</div>
</div>
