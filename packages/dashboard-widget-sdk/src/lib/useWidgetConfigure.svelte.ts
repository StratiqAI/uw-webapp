import { getDashboardWidgetHost } from './context.svelte.js';

/**
 * Reactive hook that encapsulates the flip-card configuration boilerplate.
 *
 * Manages `isFlipped` state, registers the toggle function with the host,
 * and provides apply/cancel helpers so each widget only needs to supply
 * its data getter and callbacks.
 *
 * Automatically exits fullscreen when the card flips back to front.
 */
// #region agent log
let _dbgConfigureCount = 0;
// #endregion
export function useWidgetConfigure<TData>(options: {
	widgetId?: string;
	data: () => TData;
	onUpdateConfig?: (data: TData) => void;
	onConfigureReady?: (toggleFn: () => void) => void;
}) {
	// #region agent log
	const _dbgIdx = ++_dbgConfigureCount;
	fetch('http://127.0.0.1:7378/ingest/4d5fe42c-52eb-4139-a797-75aa8980d08f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f38342'},body:JSON.stringify({sessionId:'f38342',location:'useWidgetConfigure.svelte.ts:init',message:'useWidgetConfigure called',data:{idx:_dbgIdx,widgetId:options.widgetId},timestamp:Date.now(),hypothesisId:'H-C'})}).catch(()=>{});
	// #endregion
	const host = getDashboardWidgetHost();

	let isFlipped = $state(false);
	let initialDraft: TData;
	try {
		initialDraft = structuredClone(options.data());
	} catch {
		initialDraft = JSON.parse(JSON.stringify(options.data())) as TData;
	}
	let draft = $state<TData>(initialDraft);

	function syncDraft() {
		try {
			draft = structuredClone(options.data());
		} catch {
			draft = JSON.parse(JSON.stringify(options.data())) as TData;
		}
	}

	function exitFullscreen() {
		// #region agent log
		fetch('http://127.0.0.1:7378/ingest/4d5fe42c-52eb-4139-a797-75aa8980d08f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f38342'},body:JSON.stringify({sessionId:'f38342',location:'useWidgetConfigure.svelte.ts:exitFullscreen',message:'exitFullscreen called',data:{idx:_dbgIdx,widgetId:options.widgetId},timestamp:Date.now(),hypothesisId:'H-B'})}).catch(()=>{});
		// #endregion
		if (options.widgetId) {
			host.setWidgetFullscreen?.(options.widgetId, false);
		}
	}

	function toggleFlip() {
		isFlipped = !isFlipped;
		if (isFlipped) {
			syncDraft();
		} else {
			exitFullscreen();
		}
	}

	// #region agent log
	let _dbgEffectRuns = 0;
	// #endregion
	$effect(() => {
		// #region agent log
		_dbgEffectRuns++;
		fetch('http://127.0.0.1:7378/ingest/4d5fe42c-52eb-4139-a797-75aa8980d08f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f38342'},body:JSON.stringify({sessionId:'f38342',location:'useWidgetConfigure.svelte.ts:effect',message:'onConfigureReady effect fired',data:{idx:_dbgIdx,widgetId:options.widgetId,run:_dbgEffectRuns},timestamp:Date.now(),hypothesisId:'H-A'})}).catch(()=>{});
		if (_dbgEffectRuns > 50) { console.error('[DEBUG] useWidgetConfigure effect loop detected for', options.widgetId); return; }
		// #endregion
		options.onConfigureReady?.(toggleFlip);
	});

	function applyConfig(draftData?: TData) {
		options.onUpdateConfig?.(draftData ?? draft);
		isFlipped = false;
		exitFullscreen();
	}

	function cancelConfig() {
		isFlipped = false;
		exitFullscreen();
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
