<script lang="ts">
	import { tourStore } from '../tourStore.svelte';
	import { getAllTours } from '../tourRegistry';
	import { isCompleted, resetTour } from '../persistence';

	interface Props {
		darkMode?: boolean;
		collapsed?: boolean;
	}

	let { darkMode = false, collapsed = false }: Props = $props();

	let menuOpen = $state(false);
	let menuRef = $state<HTMLDivElement | null>(null);

	let tours = $derived(
		getAllTours().map((t) => ({
			...t,
			completed: isCompleted(t.id)
		}))
	);

	function handleStart(tourId: string) {
		resetTour(tourId);
		tourStore.start(tourId);
		menuOpen = false;
	}

	function toggleMenu() {
		menuOpen = !menuOpen;
	}

	$effect(() => {
		if (!menuOpen) return;
		const onClick = (e: MouseEvent) => {
			if (menuRef && !menuRef.contains(e.target as Node)) {
				menuOpen = false;
			}
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') menuOpen = false;
		};
		document.addEventListener('click', onClick, true);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('click', onClick, true);
			document.removeEventListener('keydown', onKey);
		};
	});
</script>

<div class="relative" bind:this={menuRef}>
	<button
		type="button"
		onclick={toggleMenu}
		class="flex items-center justify-center rounded-lg transition-all duration-150
			{collapsed ? 'w-9 h-9' : 'w-full gap-2 px-3 py-2 text-sm font-medium'}
			{darkMode
			? 'text-slate-400 hover:text-indigo-400 hover:bg-slate-700/80'
			: 'text-slate-500 hover:text-indigo-600 hover:bg-slate-100'}"
		title={collapsed ? 'Guided Tours' : ''}
		aria-label="Guided Tours"
		aria-haspopup="true"
		aria-expanded={menuOpen}
	>
		<svg
			class={collapsed ? 'h-4 w-4' : 'h-4 w-4'}
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
			viewBox="0 0 24 24"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"
			/>
		</svg>
		{#if !collapsed}
			<span>Guided Tours</span>
		{/if}
	</button>

	{#if menuOpen}
		<div
			class="absolute {collapsed ? 'left-full ml-2 bottom-0' : 'left-0 right-0 bottom-full mb-2'} rounded-lg border shadow-lg z-100
				{darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}"
			role="menu"
		>
			<div class="px-3 py-2 border-b {darkMode ? 'border-slate-700' : 'border-slate-200'}">
				<p class="text-xs font-semibold uppercase tracking-wider {darkMode ? 'text-slate-400' : 'text-slate-500'}">
					Available Tours
				</p>
			</div>
			<div class="py-1">
				{#each tours as tour}
					<button
						type="button"
						onclick={() => handleStart(tour.id)}
						class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors
							{darkMode
							? 'text-slate-300 hover:bg-slate-700 hover:text-white'
							: 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'}"
						role="menuitem"
					>
						<div class="flex-1 min-w-0">
							<p class="font-medium truncate">{tour.name}</p>
							{#if tour.description}
								<p class="text-xs truncate {darkMode ? 'text-slate-500' : 'text-slate-400'}">
									{tour.description}
								</p>
							{/if}
						</div>
						{#if tour.completed}
							<svg
								class="h-4 w-4 shrink-0 {darkMode ? 'text-emerald-400' : 'text-emerald-500'}"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								viewBox="0 0 24 24"
							>
								<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						{/if}
					</button>
				{/each}

				{#if tours.length === 0}
					<p class="px-3 py-2 text-xs {darkMode ? 'text-slate-500' : 'text-slate-400'}">
						No tours available.
					</p>
				{/if}
			</div>
		</div>
	{/if}
</div>
