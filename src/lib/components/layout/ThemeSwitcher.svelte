<script lang="ts">
	import { themeStore } from '$lib/stores/themeStore.svelte';
	import type { AppTheme } from '$lib/stores/themeStore.svelte';

	let { collapsed = false } = $props<{ collapsed?: boolean }>();

	let currentTheme = $derived(themeStore.theme);
	let isDark = $derived(currentTheme === 'dark');

	function set(theme: AppTheme) {
		themeStore.setTheme(theme);
	}
</script>

{#if collapsed}
	<!-- Compact: single icon that cycles through themes -->
	<button
		class="flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-150
			{isDark
				? 'text-slate-400 hover:text-indigo-400 hover:bg-slate-700/80'
				: currentTheme === 'warm'
					? 'text-[#c8a870] hover:text-[#a06020] hover:bg-[#f5f0e5]/60'
					: 'text-slate-500 hover:text-amber-500 hover:bg-slate-100'}"
		onclick={() => themeStore.toggle()}
		title="Theme: {themeStore.label} (click to cycle)"
		aria-label="Switch theme (current: {themeStore.label})"
	>
		{#if currentTheme === 'light'}
			<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
				<circle cx="12" cy="12" r="5"/><path stroke-linecap="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364-.707-.707M6.343 6.343l-.707-.707m12.728 0-.707.707M6.343 17.657l-.707.707"/>
			</svg>
		{:else if currentTheme === 'dark'}
			<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
			</svg>
		{:else}
			<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" d="M5 9h11v7a3 3 0 01-3 3H8a3 3 0 01-3-3V9z" />
				<path stroke-linecap="round" stroke-linejoin="round" d="M17 10.5c2.5 0 4.5 1.8 4.5 4s-2 4-4.5 4" />
				<path stroke-linecap="round" stroke-linejoin="round" d="M8 4v2M11 4v2M14 4v2" />
			</svg>
		{/if}
	</button>
{:else}
	<!-- Expanded: 3-option pill switcher -->
	<div
		class="flex items-center rounded-lg p-0.5 gap-0.5 {isDark
			? 'bg-slate-800/80 border border-slate-700/60'
			: currentTheme === 'warm'
				? 'bg-[#2d2010]/10 border border-[#c8a870]/30'
				: 'bg-slate-100 border border-slate-200/80'}"
		role="group"
		aria-label="Theme switcher"
	>
		<!-- Light -->
		<button
			class="relative rounded-md p-1.5 transition-all duration-150 {currentTheme === 'light'
				? 'bg-white shadow-sm text-amber-500'
				: isDark
					? 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/60'
					: currentTheme === 'warm'
						? 'text-[#c8a870]/70 hover:text-[#f0e8d8] hover:bg-white/10'
						: 'text-slate-400 hover:text-slate-600 hover:bg-white'}"
			onclick={() => set('light')}
			aria-label="Light theme"
			aria-pressed={currentTheme === 'light'}
		>
			<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
				<circle cx="12" cy="12" r="5"/><path stroke-linecap="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364-.707-.707M6.343 6.343l-.707-.707m12.728 0-.707.707M6.343 17.657l-.707.707"/>
			</svg>
		</button>

		<!-- Dark -->
		<button
			class="relative rounded-md p-1.5 transition-all duration-150 {currentTheme === 'dark'
				? 'bg-slate-700 shadow-sm text-indigo-400'
				: isDark
					? 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/60'
					: currentTheme === 'warm'
						? 'text-[#c8a870]/70 hover:text-[#f0e8d8] hover:bg-white/10'
						: 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/60'}"
			onclick={() => set('dark')}
			aria-label="Dark theme"
			aria-pressed={currentTheme === 'dark'}
		>
			<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
			</svg>
		</button>

		<!-- Warm -->
		<button
			class="relative rounded-md p-1.5 transition-all duration-150 {currentTheme === 'warm'
				? 'bg-[#f5f0e5] shadow-sm text-[#a06020]'
				: isDark
					? 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/60'
					: 'text-slate-400 hover:text-slate-600 hover:bg-amber-50'}"
			onclick={() => set('warm')}
			aria-label="Warm theme"
			aria-pressed={currentTheme === 'warm'}
		>
			<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" d="M5 9h11v7a3 3 0 01-3 3H8a3 3 0 01-3-3V9z" />
				<path stroke-linecap="round" stroke-linejoin="round" d="M17 10.5c2.5 0 4.5 1.8 4.5 4s-2 4-4.5 4" />
				<path stroke-linecap="round" stroke-linejoin="round" d="M8 4v2M11 4v2M14 4v2" />
			</svg>
		</button>
	</div>
{/if}
