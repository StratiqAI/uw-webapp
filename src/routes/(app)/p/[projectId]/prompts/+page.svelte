<script lang="ts">
	import type { Project } from '@stratiqai/types-simple';
	import PromptStudioWorkspace from './components/PromptStudioWorkspace.svelte';

	let { data } = $props<{ data: { idToken: string; projects: Project[]; currentUser?: unknown } }>();
</script>

<PromptStudioWorkspace {data} />
