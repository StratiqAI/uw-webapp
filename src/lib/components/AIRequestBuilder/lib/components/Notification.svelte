<!-- src/lib/components/Notification.svelte -->
<script lang="ts">
	import { notification } from '../stores';
	import { fly } from 'svelte/transition';
</script>

{#if $notification}
	<div
		transition:fly={{ y: -30, duration: 300 }}
		class="fixed top-5 right-5 z-50 rounded-md bg-green-500 px-6 py-3 text-white shadow-lg"
	>
		{$notification}
	</div>
{/if}