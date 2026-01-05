<!-- src/lib/components/DocumentProcessing/ProcessingBadge.svelte -->
<script lang="ts">
	import type { DocumentProcessingStatus, PageStatus } from './types';

	const { status } = $props<{
		status: DocumentProcessingStatus | PageStatus;
	}>();

	const statusConfig = $derived.by(() => {
		const configs: Record<
			DocumentProcessingStatus | PageStatus,
			{ label: string; bg: string; text: string; icon: string }
		> = {
			uploading: {
				label: 'Uploading',
				bg: 'bg-blue-100 dark:bg-blue-900/30',
				text: 'text-blue-800 dark:text-blue-300',
				icon: '↻'
			},
			analyzing: {
				label: 'Analyzing',
				bg: 'bg-indigo-100 dark:bg-indigo-900/30',
				text: 'text-indigo-800 dark:text-indigo-300',
				icon: '🔍'
			},
			processing: {
				label: 'Processing',
				bg: 'bg-purple-100 dark:bg-purple-900/30',
				text: 'text-purple-800 dark:text-purple-300',
				icon: '⚙️'
			},
			complete: {
				label: 'Complete',
				bg: 'bg-green-100 dark:bg-green-900/30',
				text: 'text-green-800 dark:text-green-300',
				icon: '✓'
			},
			error: {
				label: 'Error',
				bg: 'bg-red-100 dark:bg-red-900/30',
				text: 'text-red-800 dark:text-red-300',
				icon: '✗'
			},
			pending: {
				label: 'Pending',
				bg: 'bg-gray-100 dark:bg-gray-800',
				text: 'text-gray-600 dark:text-gray-400',
				icon: '⏳'
			}
		};
		return configs[status] || configs.pending;
	});
</script>

<span
	class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium {statusConfig.bg} {statusConfig.text}"
>
	<span>{statusConfig.icon}</span>
	<span>{statusConfig.label}</span>
</span>
