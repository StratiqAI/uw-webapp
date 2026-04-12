<script lang="ts">
	let {
		darkMode,
		menuId = 'prompt-chat-tools-menu'
	} = $props<{
		darkMode: boolean;
		/** `aria-controls` target; unique if multiple popovers share a page. */
		menuId?: string;
	}>();

	let menuOpen = $state(false);
	let rootEl = $state<HTMLDivElement | undefined>();

	let toolStructuredOutputs = $state(false);
	let toolCodeExecution = $state(false);
	let toolFunctionCalling = $state(false);
	let toolGoogleSearchGrounding = $state(false);
	let toolGoogleMapsGrounding = $state(false);
	let toolUrlContext = $state(false);

	function closeMenu() {
		menuOpen = false;
	}

	function toggleMenu(e: MouseEvent) {
		e.stopPropagation();
		menuOpen = !menuOpen;
	}

	function onWindowClickCloseMenu(e: MouseEvent) {
		if (!menuOpen) return;
		const t = e.target;
		if (!(t instanceof Node)) return;
		if (rootEl?.contains(t)) return;
		closeMenu();
	}
</script>

<svelte:window onclick={onWindowClickCloseMenu} />

<div bind:this={rootEl} class="relative">
	{#snippet toolRow(
		label: string,
		on: boolean,
		toggle: () => void,
		showEdit: boolean,
		icon: 'json' | 'code' | 'fx' | 'google' | 'map' | 'link'
	)}
		<div
			class="flex w-full items-center gap-2.5 px-3 py-2 text-xs {darkMode ? 'text-slate-200' : 'text-slate-800'}"
		>
			<span
				class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border {darkMode
					? 'border-slate-600 bg-slate-800'
					: 'border-slate-200 bg-slate-100'}"
			>
				{#if icon === 'json'}
					<span class="font-mono text-[8px] font-semibold leading-none tracking-tight">JSON</span>
				{:else if icon === 'code'}
					<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
						/>
					</svg>
				{:else if icon === 'fx'}
					<span class="text-[10px] font-semibold leading-none">ƒx</span>
				{:else if icon === 'google'}
					<svg class="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
						<path
							fill="#4285F4"
							d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
						/>
						<path
							fill="#34A853"
							d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
						/>
						<path
							fill="#FBBC05"
							d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
						/>
						<path
							fill="#EA4335"
							d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
						/>
					</svg>
				{:else if icon === 'map'}
					<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
						/>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
						/>
					</svg>
				{:else}
					<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
						/>
					</svg>
				{/if}
			</span>
			<span class="min-w-0 flex-1 font-medium leading-snug">{label}</span>
			{#if showEdit}
				<span class="shrink-0 text-[10px] font-medium {darkMode ? 'text-slate-500' : 'text-slate-400'}">Edit</span>
			{/if}
			<button
				type="button"
				role="switch"
				aria-checked={on}
				aria-label={`${label}: ${on ? 'on' : 'off'}`}
				class="relative h-5 w-9 shrink-0 rounded-full transition-colors {on
					? 'bg-emerald-500'
					: darkMode
						? 'bg-slate-600'
						: 'bg-slate-300'}"
				onclick={(e) => {
					e.stopPropagation();
					toggle();
				}}
			>
				<span
					class="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform {on
						? 'translate-x-4'
						: 'translate-x-0'}"
				></span>
			</button>
		</div>
	{/snippet}

	<button
		type="button"
		class="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors {darkMode
			? 'border-slate-600 bg-slate-800/80 text-slate-200 hover:bg-slate-700'
			: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}"
		aria-haspopup="true"
		aria-expanded={menuOpen}
		aria-controls={menuId}
		onclick={toggleMenu}
	>
		<svg
			class="h-3.5 w-3.5 shrink-0 opacity-80"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
			aria-hidden="true"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
			/>
		</svg>
		Tools
	</button>

	{#if menuOpen}
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div
			id={menuId}
			role="region"
			aria-label="Tool options"
			tabindex="-1"
			class="absolute bottom-full left-0 z-20 mb-1.5 min-w-72 rounded-xl border py-1.5 shadow-xl outline-none {darkMode
				? 'border-slate-600 bg-slate-900'
				: 'border-slate-200 bg-white'}"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => {
				if (e.key === 'Escape') {
					e.preventDefault();
					closeMenu();
				}
			}}
		>
			{@render toolRow(
				'Structured outputs',
				toolStructuredOutputs,
				() => (toolStructuredOutputs = !toolStructuredOutputs),
				true,
				'json'
			)}
			{@render toolRow(
				'Code execution',
				toolCodeExecution,
				() => (toolCodeExecution = !toolCodeExecution),
				false,
				'code'
			)}
			{@render toolRow(
				'Function calling',
				toolFunctionCalling,
				() => (toolFunctionCalling = !toolFunctionCalling),
				true,
				'fx'
			)}
			{@render toolRow(
				'Grounding with Google Search',
				toolGoogleSearchGrounding,
				() => (toolGoogleSearchGrounding = !toolGoogleSearchGrounding),
				false,
				'google'
			)}
			{@render toolRow(
				'Grounding with Google Maps',
				toolGoogleMapsGrounding,
				() => (toolGoogleMapsGrounding = !toolGoogleMapsGrounding),
				false,
				'map'
			)}
			{@render toolRow(
				'URL context',
				toolUrlContext,
				() => (toolUrlContext = !toolUrlContext),
				false,
				'link'
			)}
		</div>
	{/if}
</div>
