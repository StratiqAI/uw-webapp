<script lang="ts">
	import { listNDAAgreements, updateNDAAgreement } from '$lib/deal-room/dealRoomService';
	import { dealRoomSampleStore } from '$lib/stores/dealRoomSampleStore.svelte';
	import type { NDAAgreement } from '$lib/deal-room/types';
	import { authStore } from '$lib/stores/auth.svelte';

	interface Props {
		projectId: string;
		idToken: string;
		darkMode: boolean;
	}

	let { projectId, idToken, darkMode }: Props = $props();

	let agreements = $state<NDAAgreement[]>([]);
	let loading = $state(true);
	let fromFallback = $state(false);
	let signing = $state(false);

	const useSample = $derived(dealRoomSampleStore.isActive(projectId));
	const currentUserId = $derived(authStore.currentUser?.sub ?? null);
	const myAgreement = $derived(agreements.find((a) => a.ownerId === currentUserId) ?? null);
	const needsSignature = $derived(myAgreement?.status === 'PENDING');
	const signed = $derived(myAgreement?.status === 'SIGNED');

	function load() {
		if (useSample && dealRoomSampleStore.data) {
			agreements = dealRoomSampleStore.data.ndaAgreements ?? [];
			fromFallback = true;
			loading = false;
			return;
		}
		if (!projectId || !idToken) return;
		loading = true;
		listNDAAgreements(projectId, idToken).then((res) => {
			agreements = res.data ?? [];
			fromFallback = res.fromFallback;
			loading = false;
		});
	}

	$effect(() => {
		if (useSample && dealRoomSampleStore.data) {
			agreements = dealRoomSampleStore.data.ndaAgreements ?? [];
			fromFallback = true;
			loading = false;
			return;
		}
		if (projectId && idToken) load();
	});

	async function handleSign() {
		if (!myAgreement || !idToken) return;
		signing = true;
		const res = await updateNDAAgreement(
			{ id: myAgreement.id, parentId: projectId },
			{ status: 'SIGNED' },
			idToken
		);
		signing = false;
		if (res.data) {
			agreements = agreements.map((a) => (a.id === myAgreement.id ? { ...a, status: 'SIGNED' as const } : a));
		}
		load();
	}
</script>

<div class="space-y-6">
	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
		</div>
	{:else}
		<!-- NDA status card -->
		<div class="rounded-xl p-6 {darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'} shadow-sm">
			<h2 class="text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-4">NDA and Access</h2>

			{#if needsSignature}
				<div class="rounded-lg p-4 {darkMode ? 'bg-amber-900 border border-amber-500' : 'bg-amber-50 border border-amber-200'}">
					<p class="font-medium {darkMode ? 'text-amber-400' : 'text-amber-800'}">NDA required</p>
					<p class="mt-1 text-sm {darkMode ? 'text-amber-200' : 'text-amber-700'}">
						You must accept the NDA to access deal materials. By signing you agree to keep all information confidential.
					</p>
					<button
						onclick={handleSign}
						disabled={signing}
						class="mt-4 px-4 py-2 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
					>
						{signing ? 'Signing...' : 'I agree - Sign NDA'}
					</button>
				</div>
			{/if}

			{#if !needsSignature && signed}
				<div class="rounded-lg p-4 {darkMode ? 'bg-green-900 border border-green-500' : 'bg-green-50 border border-green-200'}">
					<p class="font-medium {darkMode ? 'text-green-400' : 'text-green-800'}">NDA signed</p>
					<p class="mt-1 text-sm {darkMode ? 'text-green-200' : 'text-green-700'}">You have access to this deal room.</p>
				</div>
			{/if}

			{#if !needsSignature && !signed && agreements.length === 0}
				<p class={darkMode ? 'text-slate-400' : 'text-slate-500'}>
					No NDA records yet.
					{fromFallback ? ' Demo mode - backend will show real NDA status.' : ' Create an NDA for this deal from the backend or broker flow.'}
				</p>
			{/if}

			{#if !needsSignature && !signed && agreements.length > 0}
				<p class={darkMode ? 'text-slate-400' : 'text-slate-500'}>
					{agreements.length} NDA record(s). Your status: {myAgreement ? myAgreement.status : 'No agreement for current user.'}
				</p>
			{/if}

			{#if fromFallback}
				<p class="mt-3 text-sm {darkMode ? 'text-amber-400' : 'text-amber-600'}">Showing demo state. Connect backend for real NDA checks.</p>
			{/if}
		</div>
	{/if}
</div>
