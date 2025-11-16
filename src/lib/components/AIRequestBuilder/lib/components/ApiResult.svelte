<!-- src/lib/components/ApiResult.svelte -->
<script lang="ts">
	interface Props {
		error: string | null;
		result: any;
		elapsedTime?: number | null;
		onCopy: () => void;
	}

	let { error, result, elapsedTime = null, onCopy }: Props = $props();

	function copyResultToClipboard() {
		if (result) {
			navigator.clipboard.writeText(JSON.stringify(result, null, 2));
			onCopy();
		}
	}

	function formatElapsedTime(ms: number | null): string {
		if (ms === null) return '';
		if (ms < 1000) return `${ms.toFixed(0)}ms`;
		return `${(ms / 1000).toFixed(2)}s`;
	}
</script>

{#if error}
	<div class="border-t border-red-200 bg-red-50 px-6 py-6">
		<div class="rounded-lg border-2 border-red-200 bg-white p-6 shadow-sm">
			<div class="mb-2 flex items-center gap-2">
				<svg
					class="h-5 w-5 text-red-600"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				<h3 class="text-lg font-semibold text-red-800">Error</h3>
			</div>
			<p class="text-sm text-red-700">{error}</p>
		</div>
	</div>
{/if}

{#if result}
	<div class="border-t border-green-200 bg-green-50 px-6 py-6">
		<div class="rounded-lg border-2 border-green-200 bg-white p-6 shadow-sm">
			<div class="mb-4 flex items-center justify-between">
				<div class="flex items-center gap-3">
					<svg
						class="h-5 w-5 text-green-600"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<div>
						<h3 class="text-lg font-semibold text-green-800">API Response</h3>
						{#if elapsedTime !== null}
							<p class="text-xs text-green-600">
								<svg
									class="mr-1 inline-block h-3 w-3"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
								Elapsed time: {formatElapsedTime(elapsedTime)}
							</p>
						{/if}
					</div>
				</div>
				<button
					type="button"
					onclick={copyResultToClipboard}
					class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-green-300 bg-white px-3 py-1.5 text-sm font-medium text-green-700 shadow-sm transition-all duration-200 hover:border-green-400 hover:bg-green-50 hover:shadow-md active:scale-[0.98]"
				>
					<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
						<path
							d="M5.5 4.5H3.5C2.67 4.5 2 5.17 2 6V12.5C2 13.33 2.67 14 3.5 14H10C10.83 14 11.5 13.33 11.5 12.5V10.5M11.5 4.5H13.5C14.33 4.5 15 5.17 15 6V12.5C15 13.33 14.33 14 13.5 14H7C6.17 14 5.5 13.33 5.5 12.5V10.5M11.5 4.5V2M11.5 4.5H9.5M11.5 4.5V6.5"
							stroke="currentColor"
							stroke-width="1.2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
					Copy Result
				</button>
			</div>
			<pre
				class="m-0 max-h-[600px] overflow-auto rounded-lg border border-green-200 bg-slate-950 p-5 font-mono text-sm leading-relaxed text-green-100"
				>{JSON.stringify(result, null, 2)}</pre
			>
		</div>
	</div>
{/if}