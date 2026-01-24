<!-- Redirect page - will redirect via server load -->
<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// If we have projects, navigate to the first one
	$effect(() => {
		if (data.projects && data.projects.length > 0) {
			goto(`/workflow/${data.projects[0].id}`, { replaceState: true });
		}
	});
</script>

<div class="flex items-center justify-center h-screen">
	<p class="text-slate-600">Loading workflow...</p>
</div>
