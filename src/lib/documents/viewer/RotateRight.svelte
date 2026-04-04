<script lang="ts">
	export let size: number = 24;
	export let strokeWidth: number = 1.5;
	export let className: string = '';
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width={strokeWidth}
	stroke-linecap="round"
	stroke-linejoin="round"
	class="icon icon-tabler icons-tabler-outline icon-tabler-rotate-clockwise {className || ''}"
	><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path
		d="M4.05 11a8 8 0 1 1 .5 4m-.5 5v-5h5"
	/></svg
>
