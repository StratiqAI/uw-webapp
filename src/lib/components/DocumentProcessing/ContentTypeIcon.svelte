<!-- src/lib/components/DocumentProcessing/ContentTypeIcon.svelte -->
<script lang="ts">
	const { type, size = 'md' } = $props<{
		type: 'text' | 'table' | 'image' | 'scan' | 'notification';
		size?: 'sm' | 'md' | 'lg';
	}>();

	const iconConfig = $derived.by(() => {
		const configs = {
			text: { icon: '📄', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
			table: { icon: '📊', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' },
			image: { icon: '🖼️', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30' },
			scan: { icon: '📄', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' },
			notification: { icon: '🔔', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-100 dark:bg-indigo-900/30' }
		};
		return configs[type] || configs.text;
	});

	const sizeClasses = $derived.by(() => {
		const sizes = {
			sm: 'text-sm p-1',
			md: 'text-base p-1.5',
			lg: 'text-lg p-2'
		};
		return sizes[size];
	});
</script>

<span
	class="inline-flex items-center justify-center rounded {iconConfig.bg} {iconConfig.color} {sizeClasses}"
	role="img"
	aria-label={type}
>
	{iconConfig.icon}
</span>
