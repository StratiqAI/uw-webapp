<!-- +page.svelte -->
<script lang="ts">
	import DocumentUpload from '$lib/components/DocumentUpload/DocumentUpload.svelte';
	import { project as projectStore } from '$lib/stores/appStateStore.js';
	import { authStore } from '$lib/stores/auth.svelte';
	import { darkModeStore } from '$lib/stores/darkMode.svelte';
	import { page } from '$app/stores';

	let { data } = $props();

	// Use reactive auth store instead of static data
	const cognitoIdToken = $derived(authStore.idToken);
	const currentUser = $derived(authStore.currentUser);

	// Use reactive project store instead of static data
	let project = $derived($projectStore);
	let isNewProject = $derived(data.isNewProject);
	// Get projectId from route params (more reliable than project store)
	const projectId = $derived($page.params.projectId ?? null);

	// Dark mode support
	let darkMode = $derived.by(() => darkModeStore.darkMode);

	// Construct file metadata for S3 uploads
	const fileMetadata = $derived.by(() => {
		if (!currentUser?.sub || !projectId) return null;
		return {
			tenantId: project?.tenantId || currentUser.tenant || 'default',
			ownerId: currentUser.sub,
			parentId: projectId
		};
	});
</script>

<!-- Main Content Area -->
<div class="w-full">
	<div class="mx-auto max-w-4xl px-6 py-8">
		<!-- Welcome Section -->
		<div class="mb-8">
			<h2 class="text-xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-2">
				Welcome to Your Workspace
			</h2>
			<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-600'}">
				Get started by uploading your first property or document to begin your analysis.
			</p>
		</div>

		<!-- Upload Section -->
		<div class="{darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-lg border shadow-sm">
			<div class="p-6">
				<DocumentUpload idToken={cognitoIdToken} projectId={projectId} metadata={fileMetadata} />
			</div>
		</div>

		<!-- Help Link -->
		<div class="mt-6 text-center">
			<a 
				href="/blog/uploading-your-first-property" 
				class="text-sm {darkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-600 hover:text-slate-900'} hover:underline transition-colors inline-flex items-center gap-1"
			>
				<span>Learn more about uploading documents</span>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
				</svg>
			</a>
		</div>
	</div>
</div>

