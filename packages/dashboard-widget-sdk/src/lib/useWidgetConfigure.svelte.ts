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
