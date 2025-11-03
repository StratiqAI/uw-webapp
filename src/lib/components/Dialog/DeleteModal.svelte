<script lang="ts">
	export interface YesNoDialogProps {
		open?: boolean;
		title?: string;
		yes?: string;
		no?: string;
		data: Record<string, string>;
		idToken: string;
		onConfirm?: () => Promise<void>;
	}
	import { Button, Modal } from 'flowbite-svelte';
	import { ExclamationCircleOutline } from 'flowbite-svelte-icons';
	import { gql } from '$lib/realtime/graphql/requestHandler';
	import type { Project } from '$lib/types/Project';
	import { M_DELETE_PROJECT } from '$lib/realtime/graphql/mutations/Project';
	let {
		open = $bindable(true),
		title = 'Are you sure you want to delete this?',
		yes = "Yes, I'm sure",
		no = 'No, cancel',
		data,
		idToken,
		onConfirm
	}: YesNoDialogProps = $props();

	// $inspect(data);
	async function deleteProject(id: string, idToken: string) {
		const mutation = M_DELETE_PROJECT;

		try {
			const res = await gql<{ deleteProject: Project }>(mutation, { id }, idToken);
			return res.deleteProject;
		} catch (e) {
			console.error('Error deleting project:', e);
			throw e;
		}
	}
</script>

<Modal bind:open size="sm">
	<ExclamationCircleOutline class="mx-auto mb-4 mt-8 h-10 w-10 text-red-600" />

	<h3 class="mb-6 text-center text-lg text-gray-500 dark:text-gray-300">{title}</h3>
	<div class="mb-6 flex flex-row items-center rounded-lg p-4">
		<div class="flex flex-col items-start">
			<div class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">{data.name}</div>
			<div class="mb-1 text-sm text-gray-500 dark:text-gray-300">{data.details?.streetAddress || ''}</div>
			<div class="mb-1 text-sm text-gray-500 dark:text-gray-300">
				{data.details?.city || ''}, {data.details?.state || ''}
				{data.details?.zip || ''}
			</div>
			<div class="mb-1 text-xs text-gray-400 dark:text-gray-400">Type: {data.details?.assetType || ''}</div>
		</div>
	</div>

	<div class="flex items-center justify-center">
		<Button
			color="red"
			class="mr-2"
			onclick={async () => {
				try {
					await deleteProject(data.id, idToken);
					if (onConfirm) {
						await onConfirm();
					}
					open = false;
				} catch (error) {
					console.error('Failed to delete project:', error);
					alert('Failed to delete project. Please try again.');
				}
			}}>{yes}</Button
		>
		<Button color="alternative" onclick={() => (open = false)}>{no}</Button>
	</div>
</Modal>

<!--
  @component
  [Go to docs](https://flowbite-svelte-admin-dashboard.vercel.app/)
  ## Type
  [DeleteModalProps](https://github.com/themesberg/flowbite-svelte-admin-dashboard/blob/main/src/lib/types.ts#L237)
  ## Props
  @prop open = $bindable(true)
  @prop title = 'Are you sure you want to delete this?'
  @prop yes = "Yes, I'm sure"
  @prop no = 'No, cancel'
  -->
