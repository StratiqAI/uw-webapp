<script lang="ts">
	interface WidgetTypeEntry {
		type: string;
		label: string;
		icon: string;
		category: string;
	}

	interface Props {
		open: boolean;
		darkMode: boolean;
		widgetTypes: WidgetTypeEntry[];
		onAddWidget: (type: string) => void;
	}

	let {
		open = $bindable(false),
		darkMode,
		widgetTypes,
		onAddWidget
	}: Props = $props();

	let searchQuery = $state('');
	let searchInputEl = $state<HTMLInputElement>();

	const CATEGORY_ORDER: [string, string][] = [
		['charts', 'Charts'],
		['content', 'Content'],
		['data', 'Data'],
		['financial', 'Financial'],
		['map', 'Maps'],
		['proforma', 'Pro Forma'],
		['other', 'Other']
	];

	const categoryLabelMap = new Map(CATEGORY_ORDER);

	function resolveCategory(entry: WidgetTypeEntry): string {
		if (entry.category === 'other' && entry.label.startsWith('Pro Forma')) {
			return 'proforma';
		}
		return entry.category;
	}

	const filteredTypes = $derived.by(() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return widgetTypes;
		return widgetTypes.filter(
			(w) =>
				w.label.toLowerCase().includes(q) ||
				w.type.toLowerCase().includes(q) ||
				w.category.toLowerCase().includes(q)
		);
	});

	const groupedByCategory = $derived.by(() => {
		const groups = new Map<string, WidgetTypeEntry[]>();

		for (const entry of filteredTypes) {
			const cat = resolveCategory(entry);
			const list = groups.get(cat);
			if (list) {
				list.push(entry);
			} else {
				groups.set(cat, [entry]);
			}
		}

		const ordered: [string, string, WidgetTypeEntry[]][] = [];
		for (const [key, label] of CATEGORY_ORDER) {
			const items = groups.get(key);
			if (items && items.length > 0) {
				items.sort((a, b) => a.label.localeCompare(b.label));
				ordered.push([key, label, items]);
			}
		}

		for (const [key, items] of groups) {
			if (!categoryLabelMap.has(key)) {
				items.sort((a, b) => a.label.localeCompare(b.label));
				ordered.push([key, key.charAt(0).toUpperCase() + key.slice(1), items]);
			}
		}

		return ordered;
	});

	function close() {
		open = false;
		searchQuery = '';
	}

	function handleSelect(type: string) {
		onAddWidget(type);
		searchQuery = '';
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			close();
		}
	}

	$effect(() => {
		if (open) {
			requestAnimationFrame(() => searchInputEl?.focus());
		}
	});
</script>

<svelte:window onkeydown={open ? handleKeydown : undefined} />

{#if open}
	<!-- Backdrop -->
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
		<!-- Panel -->
		<div
			class="flex w-full max-w-3xl flex-col overflow-hidden rounded-xl border shadow-2xl
				{darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}"
			style="max-height: 85vh;"
			role="dialog"
			aria-modal="true"
			aria-label="Add Widget"
		>
			<!-- Header -->
			<div class="shrink-0 px-6 pt-6 pb-4">
				<h3 class="mb-1 text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
					Add Widget
				</h3>
				<p class="mb-4 text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">
					Select a widget type to add to the current tab
				</p>

				<!-- Search -->
				<div class="relative">
					<svg
						class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 {darkMode ? 'text-slate-500' : 'text-slate-400'}"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
					</svg>
					<input
						bind:this={searchInputEl}
						bind:value={searchQuery}
						type="text"
						placeholder="Search widgets..."
						class="w-full rounded-lg border py-2 pl-10 pr-4 text-sm outline-none transition-colors
							{darkMode
								? 'border-slate-600 bg-slate-700/60 text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
								: 'border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'}"
					/>
					{#if searchQuery}
						<button
							type="button"
							onclick={() => (searchQuery = '')}
							class="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 transition-colors
								{darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'}"
							aria-label="Clear search"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					{/if}
				</div>
			</div>

			<!-- Scrollable body -->
			<div class="flex-1 overflow-y-auto px-6 pb-2">
				{#if groupedByCategory.length === 0}
					<div class="flex flex-col items-center justify-center py-12">
						<svg
							class="mb-3 h-10 w-10 {darkMode ? 'text-slate-600' : 'text-slate-300'}"
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
						</svg>
						<p class="text-sm font-medium {darkMode ? 'text-slate-400' : 'text-slate-500'}">
							No widgets match "{searchQuery}"
						</p>
						<button
							type="button"
							onclick={() => (searchQuery = '')}
							class="mt-2 text-sm font-medium text-indigo-500 hover:text-indigo-400 transition-colors"
						>
							Clear search
						</button>
					</div>
				{:else}
					{#each groupedByCategory as [catKey, catLabel, catWidgets] (catKey)}
						<div class="mb-5">
							<h4
								class="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider
									{darkMode ? 'text-slate-400' : 'text-slate-500'}"
							>
								<span
									class="h-px flex-1
										{darkMode ? 'bg-slate-700' : 'bg-slate-200'}"
								></span>
								<span>{catLabel}</span>
								<span
									class="h-px flex-1
										{darkMode ? 'bg-slate-700' : 'bg-slate-200'}"
								></span>
							</h4>
							<div class="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
								{#each catWidgets as { type, label, icon } (type)}
									<button
										type="button"
										onclick={() => handleSelect(type)}
										class="flex flex-col items-center gap-2 rounded-lg border-2 p-3.5 transition-all hover:shadow-md hover:scale-[1.02]
											{darkMode
												? 'border-slate-700 hover:border-indigo-500 hover:bg-indigo-900/20'
												: 'border-slate-200 hover:border-indigo-500 hover:bg-indigo-50'}"
									>
										<span class="text-2xl">{icon}</span>
										<span class="text-center text-xs font-medium leading-tight {darkMode ? 'text-slate-300' : 'text-slate-700'}">
											{label}
										</span>
									</button>
								{/each}
							</div>
						</div>
					{/each}
				{/if}
			</div>

			<!-- Footer -->
			<div class="shrink-0 flex justify-end border-t px-6 py-4 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
				<button
					type="button"
					onclick={close}
					class="px-4 py-2 text-sm font-medium rounded-md transition-colors
						{darkMode
							? 'text-slate-300 hover:text-white hover:bg-slate-700'
							: 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'}"
				>
					Cancel
				</button>
			</div>
		</div>
	</div>
{/if}
