<script lang="ts">
	import { ui } from '$lib/stores/ui.svelte';
	import Button from '$lib/ui/Button.svelte';
	import { DarkMode } from 'flowbite-svelte';

	let { projectName } = $props<{ projectName: string }>();
</script>

<header
	class="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white/70 px-4 py-3 backdrop-blur dark:border-gray-800 dark:bg-gray-900/60"
>
	<div class="flex items-center gap-3">
		<h1 class="text-base font-semibold">{projectName}</h1>
		<p class="hidden text-xs text-gray-500 md:block dark:text-gray-400">
			StratiqAI, Your AI Powered CRE Expert
		</p>
		<div class="flex-1"></div>
	</div>
	<div class="text-xs opacity-70"></div>
	<div class="flex items-center gap-3">
		<DarkMode class="text-primary-500 dark:text-primary-600 border dark:border-gray-800" />
		<Button href="/support" icon>Help & Documentation</Button>

		<Button onclick={() => ui.setOpen(!ui.sidebarOpen)}>
			{ui.sidebarOpen ? 'Hide AI' : 'Show AI'}
		</Button>
	</div>
</header>
