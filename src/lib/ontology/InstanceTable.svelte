<script lang="ts">
	import type { EntityDefinition, PropertyDefinition } from '@stratiqai/types-simple';

	interface Props {
		definition: EntityDefinition;
		instances: Array<{ id: string; data: Record<string, unknown> }>;
		darkMode: boolean;
	}

	let { definition, instances, darkMode }: Props = $props();

	let properties = $derived(
		(definition.properties?.filter(Boolean) ?? []) as PropertyDefinition[]
	);

	const TYPE_BADGE: Record<string, { bg: string; bgDark: string; text: string; textDark: string }> = {
		STRING:      { bg: 'bg-slate-100',   bgDark: 'bg-slate-700',       text: 'text-slate-600',   textDark: 'text-slate-400' },
		NUMBER:      { bg: 'bg-blue-100',    bgDark: 'bg-blue-900/30',     text: 'text-blue-700',    textDark: 'text-blue-400' },
		BOOLEAN:     { bg: 'bg-emerald-100', bgDark: 'bg-emerald-900/30',  text: 'text-emerald-700', textDark: 'text-emerald-400' },
		DATE:        { bg: 'bg-amber-100',   bgDark: 'bg-amber-900/30',    text: 'text-amber-700',   textDark: 'text-amber-400' },
		CALCULATION: { bg: 'bg-violet-100',  bgDark: 'bg-violet-900/30',   text: 'text-violet-700',  textDark: 'text-violet-400' },
	};

	function badgeClass(dataType: string): string {
		const b = TYPE_BADGE[dataType] ?? TYPE_BADGE.STRING;
		return darkMode
			? `${b.bgDark} ${b.textDark}`
			: `${b.bg} ${b.text}`;
	}

	function formatValue(val: unknown): string {
		if (val === null || val === undefined) return '—';
		if (typeof val === 'boolean') return val ? 'Yes' : 'No';
		return String(val);
	}

	let flashKeys = $state(new Map<string, number>());

	$effect(() => {
		for (const inst of instances) {
			const sig = JSON.stringify(inst.data);
			const hash = sig.length + sig.charCodeAt(0) + (sig.charCodeAt(sig.length - 1) || 0);
			const prev = flashKeys.get(inst.id);
			if (prev !== undefined && prev !== hash) {
				const el = document.getElementById(`row-${inst.id}`);
				if (el) {
					el.classList.remove('animate-row-flash');
					void el.offsetWidth;
					el.classList.add('animate-row-flash');
				}
			}
			flashKeys.set(inst.id, hash);
		}
	});
</script>

<style>
	@keyframes row-flash-light {
		0% { background-color: #dbeafe; }
		100% { background-color: transparent; }
	}
	@keyframes row-flash-dark {
		0% { background-color: rgba(59, 130, 246, 0.15); }
		100% { background-color: transparent; }
	}
	:global(.animate-row-flash) {
		animation: row-flash-light 1.5s ease-out;
	}
	:global(.dark .animate-row-flash) {
		animation: row-flash-dark 1.5s ease-out;
	}
</style>

<div class="flex h-full flex-col overflow-hidden">
	<!-- Header -->
	<div class="flex items-center gap-3 border-b px-4 py-2.5
		{darkMode ? 'border-slate-700' : 'border-slate-200'}">
		<h2 class="text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-800'}">
			{definition.name}
		</h2>
		<span class="rounded-full px-2 py-0.5 text-[10px] font-medium
			{darkMode ? 'bg-indigo-900/30 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}">
			{instances.length} instance{instances.length !== 1 ? 's' : ''}
		</span>
	</div>

	{#if instances.length === 0}
		<div class="flex flex-1 items-center justify-center">
			<div class="text-center">
				<svg class="mx-auto h-10 w-10 {darkMode ? 'text-slate-700' : 'text-slate-300'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M10.875 12h-7.5m7.5 0h7.5M12 10.875c0-.621.504-1.125 1.125-1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M10.875 15.75h-7.5m8.625 0h7.5" />
				</svg>
				<p class="mt-3 text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">No instances yet</p>
				<p class="mt-1 text-xs {darkMode ? 'text-slate-600' : 'text-slate-400'}">
					Create one from the AppSync console or API
				</p>
			</div>
		</div>
	{:else}
		<div class="flex-1 overflow-auto">
			<table class="w-full text-xs">
				<thead>
					<tr class="sticky top-0 {darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-500'}">
						<th class="whitespace-nowrap px-3 py-2 text-left font-medium">ID</th>
						{#each properties as prop}
							<th class="whitespace-nowrap px-3 py-2 text-left font-medium">
								<div class="flex items-center gap-1.5">
									<span>{prop.name}</span>
									<span class="rounded px-1 py-0.5 text-[9px] font-semibold uppercase leading-none {badgeClass(prop.dataType)}">
										{prop.dataType}
									</span>
								</div>
							</th>
						{/each}
					</tr>
				</thead>
				<tbody class="divide-y {darkMode ? 'divide-slate-800' : 'divide-slate-100'}">
					{#each instances as inst (inst.id)}
						<tr
							id="row-{inst.id}"
							class="transition-colors {darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}"
						>
							<td class="whitespace-nowrap px-3 py-2 font-mono {darkMode ? 'text-slate-500' : 'text-slate-400'}">
								{inst.id.length > 16 ? inst.id.slice(0, 16) + '...' : inst.id}
							</td>
							{#each properties as prop}
								<td class="whitespace-nowrap px-3 py-2 {darkMode ? 'text-slate-300' : 'text-slate-700'}">
									{formatValue(inst.data[prop.name])}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
