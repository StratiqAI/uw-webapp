<script lang="ts">
	export interface YesNoDialogProps {
		open?: boolean;
		title?: string;
		yes?: string;
		no?: string;
		data: Record<string, any> & { id: string; name?: string; details?: { streetAddress?: string; city?: string; state?: string; zip?: string; assetType?: string } };
		idToken: string;
		mutation: string;
		onConfirm?: () => Promise<void>;
	}
	import { Button, Modal } from 'flowbite-svelte';
	import { ExclamationCircleOutline } from 'flowbite-svelte-icons';
	import { gql } from '$lib/realtime/graphql/requestHandler';
	import type { Project } from '@stratiqai/types-simple';
	let {
		open = $bindable(true),
		title = 'Are you sure you want to delete this?',
		yes = "Yes, I'm sure",
		no = 'No, cancel',
		data,
		idToken,
		mutation,
		onConfirm
	}: YesNoDialogProps = $props();

	// $inspect(data);
	async function deleteProject(id: string, idToken: string) {
		try {
			const res = await gql<{ deleteProject: Project }>(
				mutation, 
				{ id }, 
				idToken
			);
			
			// Check if project was deleted (new format returns entity directly)
			if (!res.deleteProject) {
				console.error('Project deletion returned null project');
				throw new Error('Error deleting project: No project returned');
			}
			
			return res.deleteProject;
		} catch (e) {
			console.error('Error deleting project:', e);
			throw e;
		}
	}
</script>

<Modal bind:open size="md" class="backdrop-blur-sm">
	<div class="p-6">
		<!-- Icon and Title Section -->
		<div class="flex flex-col items-center text-center mb-6">
			<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
				<ExclamationCircleOutline class="h-8 w-8 text-red-600 dark:text-red-400" />
			</div>
			<h3 class="mb-2 text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>
			<p class="text-sm text-gray-500 dark:text-gray-400">
				This action cannot be undone. All associated data will be permanently deleted.
			</p>
		</div>

		<!-- Item Details Card -->
		{#if data.name}
			<div class="mb-6 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-4">
				<div class="flex items-start gap-3">
					<div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
						<svg
							class="h-5 w-5 text-indigo-600 dark:text-indigo-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
							></path>
						</svg>
					</div>
					<div class="min-w-0 flex-1">
						<div class="mb-1 text-base font-semibold text-gray-900 dark:text-white">{data.name}</div>
						{#if data.details?.streetAddress || data.details?.city}
							<div class="space-y-0.5 text-sm text-gray-600 dark:text-gray-400">
								{#if data.details?.streetAddress}
									<div>{data.details.streetAddress}</div>
								{/if}
								{#if data.details?.city || data.details?.state || data.details?.zip}
									<div>
										{#if data.details?.city}{data.details.city}{/if}
										{#if data.details?.city && (data.details?.state || data.details?.zip)}, {/if}
										{#if data.details?.state}{data.details.state}{/if}
										{#if data.details?.zip} {data.details.zip}{/if}
									</div>
								{/if}
								{#if data.details?.assetType}
									<div class="mt-1 text-xs text-gray-500 dark:text-gray-500">
										Type: {data.details.assetType}
									</div>
								{/if}
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<!-- Action Buttons -->
		<div class="flex items-center justify-end gap-3 border-t border-gray-200 dark:border-slate-700 pt-6">
			<Button
				color="alternative"
				class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
				onclick={() => (open = false)}
			>
				{no}
			</Button>
			<Button
				color="red"
				class="px-4 py-2 text-sm font-medium shadow-sm hover:shadow-md transition-all"
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
				}}
			>
				{yes}
			</Button>
		</div>
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
