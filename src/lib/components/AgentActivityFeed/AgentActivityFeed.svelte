<script lang="ts">
	import { fly } from 'svelte/transition';
	import { untrack } from 'svelte';
	import { getProjectTextsStore, getProjectTablesStore, getProjectImagesStore } from '$lib/stores/projectEntitiesStore';
	import { notificationStore } from '$lib/stores/notifications.svelte';
	import type { Text, Table, Image, Notification } from '@stratiqai/types-simple';

	type EntityPreview = {
		kind: 'text';
		content: string;
		pageNum: number | null;
	} | {
		kind: 'table';
		description: string;
		pageNum: number | null;
	} | {
		kind: 'image';
		caption: string | null;
		imageUrl: string | null;
		mimeType: string | null;
		pageNum: number | null;
	} | null;

	interface AgentFeedEntry {
		id: string;
		timestamp: number;
		agentName: string;
		agentColor: 'blue' | 'green' | 'purple' | 'indigo' | 'amber';
		agentInitial: string;
		message: string;
		entityType: 'text' | 'table' | 'image' | 'notification';
		isNew: boolean;
		preview: EntityPreview;
	}

	const AGENTS = {
		textAgent: { name: 'Text Agent', color: 'blue' as const, initial: 'T' },
		tableAgent: { name: 'Table Agent', color: 'green' as const, initial: 'A' },
		visionAgent: { name: 'Vision Agent', color: 'purple' as const, initial: 'V' },
		scannerAgent: { name: 'Scanner Agent', color: 'indigo' as const, initial: 'S' },
		classifierAgent: { name: 'Classifier Agent', color: 'amber' as const, initial: 'C' }
	};

	const TEXT_MESSAGES_SINGLE = [
		(p: string) => `Found a text block${p} -- pulling it in now.`,
		(p: string) => `Got one! Extracted a text block${p}.`,
		(p: string) => `New text content spotted${p}. Adding to the collection.`,
		(p: string) => `Just picked up a text block${p}.`,
		(p: string) => `Readable text detected${p} -- captured.`
	];
	const TEXT_MESSAGES_MULTI = [
		(n: number, p: string) => `Grabbed ${n} text blocks${p} in one sweep!`,
		(n: number, p: string) => `Batch find: ${n} text blocks${p} extracted.`,
		(n: number, p: string) => `Found ${n} text blocks${p} -- nice haul.`
	];
	const TABLE_MESSAGES_SINGLE = [
		(p: string) => `Spotted a data table${p}. Parsing structure now.`,
		(p: string) => `Table detected${p}! Looks like structured data.`,
		(p: string) => `Found a table${p} -- rows and columns captured.`,
		(p: string) => `Interesting -- there's a data table${p}.`,
		(p: string) => `New table discovered${p}. Adding it to your dataset.`
	];
	const TABLE_MESSAGES_MULTI = [
		(n: number, p: string) => `Hit the jackpot: ${n} tables${p} in one pass!`,
		(n: number, p: string) => `${n} tables${p} extracted. Lots of structured data here.`,
		(n: number, p: string) => `Found ${n} data tables${p} -- processing them all.`
	];
	const IMAGE_MESSAGES_SINGLE = [
		(p: string) => `Visual content detected${p}. Extracting image now.`,
		(p: string) => `Found an image${p} -- saving it for you.`,
		(p: string) => `Image captured${p}! Looks like a figure or diagram.`,
		(p: string) => `Spotted visual content${p}. Pulling it out.`,
		(p: string) => `New image${p} -- got it.`
	];
	const IMAGE_MESSAGES_MULTI = [
		(n: number, p: string) => `Found ${n} images${p} -- lots of visual content here!`,
		(n: number, p: string) => `Extracted ${n} images${p} in this batch.`,
		(n: number, p: string) => `${n} images${p} captured. Rich visual document!`
	];

	function pick<T>(arr: T[]): T {
		return arr[Math.floor(Math.random() * arr.length)];
	}

	const MAX_ENTRIES = 100;
	const PREVIEW_MAX_CHARS = 200;

	const { projectId, darkMode }: { projectId: string; darkMode: boolean } = $props();

	const texts = $derived.by(() => getProjectTextsStore(projectId));
	const tables = $derived.by(() => getProjectTablesStore(projectId));
	const images = $derived.by(() => getProjectImagesStore(projectId));

	let feedEntries = $state<AgentFeedEntry[]>([]);
	let expandedIds = $state<Set<string>>(new Set());
	let prevTextCount = $state(0);
	let prevTableCount = $state(0);
	let prevImageCount = $state(0);
	let seenNotifIds = $state<Set<string>>(new Set());
	let isComplete = $state(false);
	let initialized = $state(false);

	let _tick = $state(0);
	$effect(() => {
		const interval = setInterval(() => { _tick++; }, 5000);
		return () => clearInterval(interval);
	});

	function toggleExpand(id: string) {
		const next = new Set(expandedIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		expandedIds = next;
	}

	function parseEventType(notif: Notification): string | null {
		if (!notif.properties) return null;
		try {
			const props = typeof notif.properties === 'string'
				? JSON.parse(notif.properties) : notif.properties;
			return props.eventType || null;
		} catch { return null; }
	}

	function agentForEventType(eventType: string | null): (typeof AGENTS)[keyof typeof AGENTS] | null {
		if (!eventType) return AGENTS.scannerAgent;
		switch (eventType) {
			case 'Complete':
			case 'Classified':
				return AGENTS.classifierAgent;
			case 'AnalysisStarted':
			case 'PageAnalysisStarted':
			case 'PageAnalysisComplete':
				return AGENTS.scannerAgent;
			default:
				return AGENTS.scannerAgent;
		}
	}

	function notificationToEntry(notif: Notification, isHistorical: boolean): AgentFeedEntry | null {
		const eventType = parseEventType(notif);
		const agent = agentForEventType(eventType);
		if (!agent) return null;

		const message = notif.message || defaultMessageForEventType(eventType);
		if (!message) return null;

		if (eventType === 'Complete') isComplete = true;

		return {
			id: `notif-${notif.id}`,
			timestamp: new Date(notif.createdAt).getTime(),
			agentName: agent.name,
			agentColor: agent.color,
			agentInitial: agent.initial,
			message,
			entityType: 'notification',
			isNew: !isHistorical,
			preview: null
		};
	}

	function defaultMessageForEventType(eventType: string | null): string {
		switch (eventType) {
			case 'Complete': return 'All done! Document processing wrapped up successfully.';
			case 'Classified': return 'Document type identified -- classification complete.';
			case 'AnalysisStarted': return 'Kicking off the analysis -- scanning the document now...';
			case 'PageAnalysisStarted': return 'Starting on a new page. Let me see what\'s here...';
			case 'PageAnalysisComplete': return 'Page scan finished. Moving on to the next one.';
			default: return '';
		}
	}

	function addEntry(
		agent: (typeof AGENTS)[keyof typeof AGENTS],
		message: string,
		entityType: AgentFeedEntry['entityType'],
		preview: EntityPreview = null
	) {
		const entry: AgentFeedEntry = {
			id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
			timestamp: Date.now(),
			agentName: agent.name,
			agentColor: agent.color,
			agentInitial: agent.initial,
			message,
			entityType,
			isNew: true,
			preview
		};
		feedEntries = [entry, ...feedEntries].slice(0, MAX_ENTRIES);
		setTimeout(() => {
			feedEntries = feedEntries.map(e =>
				e.id === entry.id ? { ...e, isNew: false } : e
			);
		}, 2000);
		isComplete = false;
	}

	function textPreview(t: Text): EntityPreview {
		return { kind: 'text', content: t.text ?? '', pageNum: t.pageNum ?? null };
	}
	function tablePreview(t: Table): EntityPreview {
		return { kind: 'table', description: t.description ?? '', pageNum: t.pageNum ?? null };
	}
	function imagePreview(img: Image): EntityPreview {
		let caption: string | null = null;
		if (img.imageAnnotation) {
			try {
				const parsed = typeof img.imageAnnotation === 'string'
					? JSON.parse(img.imageAnnotation)
					: img.imageAnnotation;
				if (typeof parsed === 'string') {
					caption = parsed;
				} else if (parsed?.image_description) {
					caption = parsed.image_description;
				} else if (parsed?.description) {
					caption = parsed.description;
				} else {
					caption = JSON.stringify(parsed, null, 2);
				}
			} catch { caption = String(img.imageAnnotation); }
		}
		const imageUrl = img.s3Bucket && img.s3Key
			? `https://${img.s3Bucket}.s3.us-west-2.amazonaws.com/${img.s3Key}`
			: null;
		return { kind: 'image', caption, imageUrl, mimeType: img.mimeType ?? null, pageNum: img.pageNum ?? null };
	}

	function truncate(s: string, max: number): string {
		if (s.length <= max) return s;
		return s.slice(0, max).trimEnd() + '...';
	}

	// Load existing notifications as historical entries, then track new ones
	const projectNotifications = $derived(
		notificationStore.notifications.filter(n => n.parentId === projectId)
	);

	$effect(() => {
		const currentNotifs = projectNotifications;
		const newEntries: AgentFeedEntry[] = [];

		for (const notif of currentNotifs) {
			if (seenNotifIds.has(notif.id)) continue;

			const entry = notificationToEntry(notif, !initialized);
			if (entry) {
				newEntries.push(entry);

				if (initialized) {
					// Animate new entries individually
					feedEntries = [entry, ...feedEntries].slice(0, MAX_ENTRIES);
					const entryId = entry.id;
					setTimeout(() => {
						feedEntries = feedEntries.map(e =>
							e.id === entryId ? { ...e, isNew: false } : e
						);
					}, 2000);
				}
			}

			seenNotifIds = new Set([...seenNotifIds, notif.id]);
		}

		if (!initialized && newEntries.length > 0) {
			// Sort historical entries by timestamp (newest first)
			newEntries.sort((a, b) => b.timestamp - a.timestamp);
			feedEntries = [...newEntries, ...feedEntries].slice(0, MAX_ENTRIES);
		}

		if (!initialized) {
			initialized = true;
		}
	});

	// Debounced entity watchers: accumulate rapid arrivals into a single feed entry.
	const ENTITY_DEBOUNCE_MS = 300;
	let textDebounceTimer: ReturnType<typeof setTimeout> | null = null;
	let tableDebounceTimer: ReturnType<typeof setTimeout> | null = null;
	let imageDebounceTimer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		const count = $texts.length;
		const newest = $texts[0] as Text | undefined;
		const prev = untrack(() => prevTextCount);
		if (initialized && count > prev && prev > 0) {
			if (textDebounceTimer) clearTimeout(textDebounceTimer);
			const snapshot = { count, newest };
			textDebounceTimer = setTimeout(() => {
				const delta = snapshot.count - untrack(() => prevTextCount);
				if (delta <= 0) return;
				const pageInfo = snapshot.newest?.pageNum ? ` on page ${snapshot.newest.pageNum}` : '';
				const msg = delta === 1
					? pick(TEXT_MESSAGES_SINGLE)(pageInfo)
					: pick(TEXT_MESSAGES_MULTI)(delta, pageInfo);
				addEntry(AGENTS.textAgent, msg, 'text', snapshot.newest ? textPreview(snapshot.newest) : null);
				prevTextCount = snapshot.count;
			}, ENTITY_DEBOUNCE_MS);
		} else {
			prevTextCount = count;
		}
	});

	$effect(() => {
		const count = $tables.length;
		const newest = $tables[0] as Table | undefined;
		const prev = untrack(() => prevTableCount);
		if (initialized && count > prev && prev > 0) {
			if (tableDebounceTimer) clearTimeout(tableDebounceTimer);
			const snapshot = { count, newest };
			tableDebounceTimer = setTimeout(() => {
				const delta = snapshot.count - untrack(() => prevTableCount);
				if (delta <= 0) return;
				const pageInfo = snapshot.newest?.pageNum ? ` on page ${snapshot.newest.pageNum}` : '';
				const msg = delta === 1
					? pick(TABLE_MESSAGES_SINGLE)(pageInfo)
					: pick(TABLE_MESSAGES_MULTI)(delta, pageInfo);
				addEntry(AGENTS.tableAgent, msg, 'table', snapshot.newest ? tablePreview(snapshot.newest) : null);
				prevTableCount = snapshot.count;
			}, ENTITY_DEBOUNCE_MS);
		} else {
			prevTableCount = count;
		}
	});

	$effect(() => {
		const count = $images.length;
		const newest = $images[0] as Image | undefined;
		const prev = untrack(() => prevImageCount);
		if (initialized && count > prev && prev > 0) {
			if (imageDebounceTimer) clearTimeout(imageDebounceTimer);
			const snapshot = { count, newest };
			imageDebounceTimer = setTimeout(() => {
				const delta = snapshot.count - untrack(() => prevImageCount);
				if (delta <= 0) return;
				const pageInfo = snapshot.newest?.pageNum ? ` on page ${snapshot.newest.pageNum}` : '';
				const msg = delta === 1
					? pick(IMAGE_MESSAGES_SINGLE)(pageInfo)
					: pick(IMAGE_MESSAGES_MULTI)(delta, pageInfo);
				addEntry(AGENTS.visionAgent, msg, 'image', snapshot.newest ? imagePreview(snapshot.newest) : null);
				prevImageCount = snapshot.count;
			}, ENTITY_DEBOUNCE_MS);
		} else {
			prevImageCount = count;
		}
	});

	const activeAgentCount = $derived.by(() => {
		void _tick;
		const cutoff = Date.now() - 30_000;
		return new Set(feedEntries.filter(e => e.timestamp > cutoff).map(e => e.agentName)).size;
	});

	const hasHistory = $derived(feedEntries.length > 0 && feedEntries.every(e => !e.isNew));

	function timeAgo(timestamp: number): string {
		void _tick;
		const diffSecs = Math.floor((Date.now() - timestamp) / 1000);
		if (diffSecs < 5) return 'just now';
		if (diffSecs < 60) return `${diffSecs}s ago`;
		const diffMins = Math.floor(diffSecs / 60);
		if (diffMins < 60) return `${diffMins}m ago`;
		const diffHours = Math.floor(diffMins / 60);
		if (diffHours < 24) return `${diffHours}h ago`;
		const diffDays = Math.floor(diffHours / 24);
		if (diffDays < 7) return `${diffDays}d ago`;
		return new Date(timestamp).toLocaleDateString();
	}

	const AVATAR_BG: Record<string, string> = {
		blue: 'bg-blue-500', green: 'bg-green-500', purple: 'bg-purple-500',
		indigo: 'bg-indigo-500', amber: 'bg-amber-500'
	};
	const AVATAR_BG_DARK: Record<string, string> = {
		blue: 'bg-blue-600', green: 'bg-green-600', purple: 'bg-purple-600',
		indigo: 'bg-indigo-600', amber: 'bg-amber-600'
	};
	const NAME_COLOR: Record<string, string> = {
		blue: 'text-blue-700', green: 'text-green-700', purple: 'text-purple-700',
		indigo: 'text-indigo-700', amber: 'text-amber-700'
	};
	const NAME_COLOR_DARK: Record<string, string> = {
		blue: 'text-blue-400', green: 'text-green-400', purple: 'text-purple-400',
		indigo: 'text-indigo-400', amber: 'text-amber-400'
	};
	const GLOW_RING: Record<string, string> = {
		blue: 'ring-blue-400/40', green: 'ring-green-400/40', purple: 'ring-purple-400/40',
		indigo: 'ring-indigo-400/40', amber: 'ring-amber-400/40'
	};
	const PREVIEW_BG: Record<string, string> = {
		blue: 'bg-blue-50 border-blue-200', green: 'bg-green-50 border-green-200',
		purple: 'bg-purple-50 border-purple-200', indigo: 'bg-indigo-50 border-indigo-200',
		amber: 'bg-amber-50 border-amber-200'
	};
	const PREVIEW_BG_DARK: Record<string, string> = {
		blue: 'bg-blue-950/30 border-blue-800/40', green: 'bg-green-950/30 border-green-800/40',
		purple: 'bg-purple-950/30 border-purple-800/40', indigo: 'bg-indigo-950/30 border-indigo-800/40',
		amber: 'bg-amber-950/30 border-amber-800/40'
	};
</script>

<div class="flex flex-col h-full">
	<!-- Header -->
	<div class="flex items-center justify-between px-4 py-2.5 border-b {darkMode ? 'border-slate-700' : 'border-slate-200'}">
		<div class="flex items-center gap-2">
			<svg class="w-4 h-4 {darkMode ? 'text-indigo-400' : 'text-indigo-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
			</svg>
			<h3 class="text-sm font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">AI Agents</h3>
			{#if !isComplete && activeAgentCount > 0}
				<span class="relative flex h-2 w-2">
					<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
					<span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
				</span>
			{/if}
		</div>
		{#if activeAgentCount > 0 && !isComplete}
			<span class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">
				{activeAgentCount} active
			</span>
		{:else if isComplete}
			<span class="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
				<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
				</svg>
				Complete
			</span>
		{:else if hasHistory}
			<span class="text-xs {darkMode ? 'text-slate-500' : 'text-slate-400'}">
				{feedEntries.length} events
			</span>
		{/if}
	</div>

	<!-- Feed -->
	<div class="flex-1 overflow-y-auto">
		{#if feedEntries.length === 0}
			<div class="flex flex-col items-center justify-center h-full px-4 py-8 text-center">
				<div class="relative mb-3">
					<div class="flex -space-x-2">
						{#each Object.values(AGENTS) as agent}
							<div
								class="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 {darkMode ? 'ring-slate-900' : 'ring-slate-50'} {darkMode ? AVATAR_BG_DARK[agent.color] : AVATAR_BG[agent.color]}"
							>
								{agent.initial}
							</div>
						{/each}
					</div>
					<span class="absolute -bottom-1 -right-1 flex h-3 w-3">
						<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
						<span class="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
					</span>
				</div>
				<p class="text-xs font-medium {darkMode ? 'text-slate-400' : 'text-slate-500'}">
					No activity yet
				</p>
				<p class="text-[10px] {darkMode ? 'text-slate-500' : 'text-slate-400'} mt-1">
					Upload a document and agents will report as they discover content
				</p>
			</div>
		{:else}
			<div class="p-2 space-y-1">
				{#each feedEntries as entry (entry.id)}
					<div
						in:fly={{ y: entry.isNew ? -20 : 0, duration: entry.isNew ? 300 : 0 }}
						class="rounded-md transition-all duration-500
							{entry.isNew ? `ring-1 ${GLOW_RING[entry.agentColor]} ${darkMode ? 'bg-slate-800/80' : 'bg-white/80'}` : ''}
						"
					>
						<div class="flex items-start gap-2 px-2 py-1.5">
							<!-- Agent avatar -->
							<div
								class="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white mt-0.5
									{darkMode ? AVATAR_BG_DARK[entry.agentColor] : AVATAR_BG[entry.agentColor]}"
							>
								{entry.agentInitial}
							</div>

							<!-- Content -->
							<div class="min-w-0 flex-1">
								<div class="flex items-baseline gap-1.5">
									<span class="text-xs font-semibold {darkMode ? NAME_COLOR_DARK[entry.agentColor] : NAME_COLOR[entry.agentColor]}">
										{entry.agentName}
									</span>
									<span class="text-[10px] {darkMode ? 'text-slate-500' : 'text-slate-400'} shrink-0">
										{timeAgo(entry.timestamp)}
									</span>
								</div>
								<p class="text-xs {darkMode ? 'text-slate-300' : 'text-slate-600'} leading-relaxed">
									{entry.message}
								</p>

								<!-- Inline preview toggle -->
								{#if entry.preview}
									<button
										type="button"
										onclick={() => toggleExpand(entry.id)}
										class="mt-1 text-[10px] font-medium {darkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'} transition-colors flex items-center gap-0.5"
									>
										<svg class="w-3 h-3 transition-transform {expandedIds.has(entry.id) ? 'rotate-90' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
										</svg>
										{expandedIds.has(entry.id) ? 'Hide' : 'View'} content
									</button>
								{/if}
							</div>
						</div>

						<!-- Expanded inline preview -->
						{#if entry.preview && expandedIds.has(entry.id)}
							<div class="mx-2 mb-2 ml-10 rounded border text-[11px] leading-relaxed overflow-hidden
								{darkMode ? PREVIEW_BG_DARK[entry.agentColor] : PREVIEW_BG[entry.agentColor]}"
							>
								{#if entry.preview.kind === 'text'}
									<div class="p-2 {darkMode ? 'text-slate-300' : 'text-slate-700'} whitespace-pre-wrap wrap-break-word">
										{truncate(entry.preview.content, PREVIEW_MAX_CHARS)}
									</div>
								{:else if entry.preview.kind === 'table'}
									<div class="p-2 {darkMode ? 'text-slate-300' : 'text-slate-700'} whitespace-pre-wrap wrap-break-word">
										{truncate(entry.preview.description, PREVIEW_MAX_CHARS)}
									</div>
								{:else if entry.preview.kind === 'image'}
									<div class="p-2 space-y-2">
										{#if entry.preview.imageUrl}
											<div class="rounded overflow-hidden {darkMode ? 'bg-slate-800' : 'bg-slate-100'}">
												<img
													src={entry.preview.imageUrl}
													alt={entry.preview.caption || `Image from page ${entry.preview.pageNum || '?'}`}
													class="w-full max-h-48 object-contain"
													loading="lazy"
												/>
											</div>
										{/if}
										{#if entry.preview.caption}
											<p class="{darkMode ? 'text-slate-300' : 'text-slate-600'} italic">
												{truncate(entry.preview.caption, PREVIEW_MAX_CHARS)}
											</p>
										{:else if !entry.preview.imageUrl}
											<span class="{darkMode ? 'text-slate-500' : 'text-slate-400'} italic">No preview available</span>
										{/if}
									</div>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
