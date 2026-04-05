/**
 * Reactive hook that encapsulates the flip-card configuration boilerplate.
 *
 * Manages `isFlipped` state, registers the toggle function with the host,
 * and provides apply/cancel helpers so each widget only needs to supply
 * its data getter and callbacks.
 */
export function useWidgetConfigure<TData>(options: {
	data: () => TData;
	onUpdateConfig?: (data: TData) => void;
	onConfigureReady?: (toggleFn: () => void) => void;
}) {
	let isFlipped = $state(false);
	// #region agent log
	let initialDraft: TData;
	try {
		initialDraft = structuredClone(options.data());
	} catch (err) {
		const raw = options.data();
		const nonCloneableKeys: string[] = [];
		if (raw && typeof raw === 'object') {
			for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
				try { structuredClone(v); } catch { nonCloneableKeys.push(`${k}(${typeof v})`); }
			}
		}
		fetch('http://127.0.0.1:7378/ingest/4d5fe42c-52eb-4139-a797-75aa8980d08f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2eb8ec'},body:JSON.stringify({sessionId:'2eb8ec',location:'useWidgetConfigure.svelte.ts:14',message:'structuredClone FAILED on initial draft',data:{error:String(err),dataKeys:raw ? Object.keys(raw as any) : null,nonCloneableKeys,dataTypes:raw && typeof raw === 'object' ? Object.fromEntries(Object.entries(raw as any).map(([k,v])=>[k,typeof v])) : typeof raw},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
		initialDraft = JSON.parse(JSON.stringify(options.data())) as TData;
	}
	// #endregion
	let draft = $state<TData>(initialDraft);

	function syncDraft() {
		// #region agent log
		try {
			draft = structuredClone(options.data());
		} catch (err) {
			const raw = options.data();
			const nonCloneableKeys: string[] = [];
			if (raw && typeof raw === 'object') {
				for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
					try { structuredClone(v); } catch { nonCloneableKeys.push(`${k}(${typeof v})`); }
				}
			}
			fetch('http://127.0.0.1:7378/ingest/4d5fe42c-52eb-4139-a797-75aa8980d08f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2eb8ec'},body:JSON.stringify({sessionId:'2eb8ec',location:'useWidgetConfigure.svelte.ts:syncDraft',message:'structuredClone FAILED in syncDraft',data:{error:String(err),nonCloneableKeys},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
			draft = JSON.parse(JSON.stringify(options.data())) as TData;
		}
		// #endregion
	}

	function toggleFlip() {
		isFlipped = !isFlipped;
		if (isFlipped) syncDraft();
	}

	$effect(() => {
		options.onConfigureReady?.(toggleFlip);
	});

	function applyConfig(draftData?: TData) {
		options.onUpdateConfig?.(draftData ?? draft);
		isFlipped = false;
	}

	function cancelConfig() {
		isFlipped = false;
	}

	return {
		get isFlipped() {
			return isFlipped;
		},
		get draft() {
			return draft;
		},
		set draft(v: TData) {
			draft = v;
		},
		toggleFlip,
		applyConfig,
		cancelConfig
	};
}
