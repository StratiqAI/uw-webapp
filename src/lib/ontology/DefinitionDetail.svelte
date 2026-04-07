<script lang="ts">
	import type { EntityDefinition, PropertyDefinition } from '@stratiqai/types-simple';
	import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
	import type { StoreChangeEvent } from '$lib/stores/validatedTopicStore';
	import { onDestroy } from 'svelte';

	interface Props {
		definition: EntityDefinition;
		projectId: string;
		darkMode: boolean;
	}

	let { definition, projectId, darkMode }: Props = $props();

	let schemaOpen = $state(false);

	let properties = $derived(
		(definition.properties?.filter(Boolean) ?? []) as PropertyDefinition[]
	);

	let schemaJson = $derived.by(() => {
		const raw = (definition as any).normalizedSchema ?? (definition as any).normalizedJsonSchema ?? (definition as any).jsonSchema;
		if (!raw) return null;
		try {
			const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
			return JSON.stringify(obj, null, 2);
		} catch {
			return String(raw);
		}
	});

	const TYPE_BADGE: Record<string, { bg: string; bgDark: string; text: string; textDark: string }> = {
		STRING:      { bg: 'bg-slate-100',   bgDark: 'bg-slate-700',       text: 'text-slate-600',   textDark: 'text-slate-400' },
		NUMBER:      { bg: 'bg-blue-100',    bgDark: 'bg-blue-900/30',     text: 'text-blue-700',    textDark: 'text-blue-400' },
		BOOLEAN:     { bg: 'bg-emerald-100', bgDark: 'bg-emerald-900/30',  text: 'text-emerald-700', textDark: 'text-emerald-400' },
		DATE:        { bg: 'bg-amber-100',   bgDark: 'bg-amber-900/30',    text: 'text-amber-700',   textDark: 'text-amber-400' },
		CALCULATION: { bg: 'bg-violet-100',  bgDark: 'bg-violet-900/30',   text: 'text-violet-700',  textDark: 'text-violet-400' },
	};

	function badgeClass(dataType: string): string {
		const b = TYPE_BADGE[dataType] ?? TYPE_BADGE.STRING;
		return darkMode ? `${b.bgDark} ${b.textDark}` : `${b.bg} ${b.text}`;
	}

	// Activity feed
	interface ActivityEntry {
		id: string;
		type: string;
		topic: string;
		time: Date;
	}

	let activities = $state<ActivityEntry[]>([]);
	let nextId = 0;

	const topicPrefix = $derived(`ontology/p/${projectId}/def/${definition.id}`);

	const unsubscribe = validatedTopicStore.onChange((event: StoreChangeEvent) => {
		if (!('topic' in event)) return;
		if (!event.topic.startsWith(topicPrefix)) return;

		const entry: ActivityEntry = {
			id: String(nextId++),
			type: event.type,
			topic: event.topic,
			time: new Date(),
		};
		activities = [entry, ...activities].slice(0, 20);
	});

	onDestroy(unsubscribe);

	function relativeTime(date: Date): string {
		const diff = Math.floor((Date.now() - date.getTime()) / 1000);
		if (diff < 5) return 'just now';
		if (diff < 60) return `${diff}s ago`;
		if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
		return `${Math.floor(diff / 3600)}h ago`;
	}

	function shortTopic(topic: string): string {
		const parts = topic.split('/');
		const instIdx = parts.indexOf('inst');
		if (instIdx >= 0 && parts[instIdx + 1]) {
			const id = parts[instIdx + 1];
			return id.length > 12 ? id.slice(0, 12) + '...' : id;
		}
		return parts[parts.length - 1];
	}
</script>

<div class="flex h-full flex-col overflow-hidden">
	<!-- Header -->
	<div class="border-b px-4 py-3 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
		<h3 class="text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-800'}">
			{definition.name}
		</h3>
		{#if definition.description}
			<p class="mt-1 text-xs leading-relaxed {darkMode ? 'text-slate-400' : 'text-slate-500'}">
				{definition.description}
			</p>
		{/if}
		<div class="mt-2 flex items-center gap-2">
			<span class="rounded px-1.5 py-0.5 font-mono text-[10px] {darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}">
				{definition.id}
			</span>
		</div>
	</div>

	<div class="flex-1 overflow-y-auto">
		<!-- Properties -->
		<div class="border-b px-4 py-3 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
			<h4 class="mb-2 text-xs font-semibold uppercase tracking-wider {darkMode ? 'text-slate-400' : 'text-slate-500'}">
				Properties
			</h4>
			{#if properties.length === 0}
				<p class="text-xs {darkMode ? 'text-slate-500' : 'text-slate-400'}">No properties defined</p>
			{:else}
				<div class="space-y-1.5">
					{#each properties as prop}
						<div class="flex items-center gap-2 rounded-md px-2 py-1.5
							{darkMode ? 'bg-slate-800/50' : 'bg-slate-50'}">
							<span class="text-xs font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'}">
								{prop.name}
							</span>
							<span class="rounded px-1 py-0.5 text-[9px] font-semibold uppercase leading-none {badgeClass(prop.dataType)}">
								{prop.dataType}
							</span>
							{#if prop.formula}
								<span class="ml-auto truncate text-[10px] font-mono {darkMode ? 'text-violet-400/70' : 'text-violet-500/70'}">
									{prop.formula}
								</span>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Schema Preview -->
		{#if schemaJson}
			<div class="border-b px-4 py-3 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
				<button
					type="button"
					class="flex w-full items-center gap-1.5 text-xs font-semibold uppercase tracking-wider
						{darkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-600'}
						transition-colors"
					onclick={() => schemaOpen = !schemaOpen}
				>
					<svg
						class="h-3 w-3 transition-transform {schemaOpen ? 'rotate-90' : ''}"
						fill="none" stroke="currentColor" viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
					JSON Schema
				</button>
				{#if schemaOpen}
					<pre class="mt-2 max-h-64 overflow-auto rounded-md p-3 text-[11px] leading-relaxed
						{darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-600'}">{schemaJson}</pre>
				{/if}
			</div>
		{/if}

		<!-- Activity Feed -->
		<div class="px-4 py-3">
			<h4 class="mb-2 text-xs font-semibold uppercase tracking-wider {darkMode ? 'text-slate-400' : 'text-slate-500'}">
				Activity
			</h4>
			{#if activities.length === 0}
				<p class="text-xs {darkMode ? 'text-slate-600' : 'text-slate-400'}">
					Waiting for real-time events...
				</p>
			{:else}
				<div class="space-y-1">
					{#each activities as entry (entry.id)}
						<div class="flex items-center gap-2 text-[11px]">
							<span class="h-1.5 w-1.5 shrink-0 rounded-full
								{entry.type === 'delete' ? 'bg-red-400' : entry.type === 'clear' ? 'bg-amber-400' : 'bg-emerald-400'}">
							</span>
							<span class="truncate {darkMode ? 'text-slate-400' : 'text-slate-500'}">
								{shortTopic(entry.topic)}
							</span>
							<span class="ml-auto shrink-0 {darkMode ? 'text-slate-600' : 'text-slate-400'}">
								{relativeTime(entry.time)}
							</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
