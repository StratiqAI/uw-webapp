<script lang="ts">
	import { Button, Input, Label, Modal, Textarea, Checkbox, Select } from 'flowbite-svelte';
	import type { UserModalProps } from '../../../../uw-ai-plane/types';
	import { gql } from '$lib/realtime/graphql/requestHandler';
	import { M_CREATE_PROJECT, M_UPDATE_PROJECT } from '$lib/realtime/graphql/mutations/Project';
	import { goto } from '$app/navigation';

	// Using imported mutations from Project.ts
	let { open = $bindable(true), data, idToken }: UserModalProps = $props();

	let formEl: HTMLFormElement;

	function init(form: HTMLFormElement) {
		for (const key in data) {
			const el = form.elements.namedItem(key);
			if (!el) continue;
			if (el instanceof HTMLInputElement) {
				if (el.type === 'checkbox') {
					el.checked = Boolean((data as any)[key]);
				} else {
					el.value = String((data as any)[key] ?? '');
				}
			} else if (el instanceof HTMLTextAreaElement) {
				el.value = String((data as any)[key] ?? '');
			} else if (el instanceof HTMLSelectElement) {
				el.value = String((data as any)[key] ?? '');
			}
		}
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		const form = formEl;
		const formData = new FormData(form);

		const formValues: any = {};
		for (const [key, value] of formData.entries()) {
			formValues[key] = value;
		}

		try {
			let projectId: string;
			
			// Step 1: Create or update the Project
			if (data && data.id) {
				// Update existing project
				const projectInput = {
					projectId: data.id,
					name: formValues.name
				};
				const projectRes = await gql<{ updateProject: any }>(M_UPDATE_PROJECT, { input: projectInput }, idToken);
				projectId = projectRes.updateProject.id;
			} else {
				// Create new project
				const projectInput = {
					name: formValues.name
				};
				const projectRes = await gql<{ createProject: any }>(M_CREATE_PROJECT, { input: projectInput }, idToken);
				projectId = projectRes.createProject.id;
			}

			// Step 2: Create or update ProjectDetail with address and property info
			const detailInput = {
				...(data?.details?.id ? { id: data.details.id } : { projectId }),
				projectId,
				description: formValues.description || undefined,
				streetAddress: formValues.streetAddress || undefined,
				city: formValues.city || undefined,
				state: formValues.state || undefined,
				zip: formValues.zip || undefined,
				assetType: formValues.assetType || undefined
			};

			// Import detail mutations
			const { M_CREATE_PROJECT_DETAIL, M_UPDATE_PROJECT_DETAIL } = await import('$lib/realtime/graphql/mutations/Project');
			
			if (data?.details?.id) {
				await gql<{ updateProjectDetail: any }>(M_UPDATE_PROJECT_DETAIL, { input: detailInput }, idToken);
			} else if (projectId) {
				await gql<{ createProjectDetail: any }>(M_CREATE_PROJECT_DETAIL, { input: detailInput }, idToken);
			}

			open = false;
			await goto(`/projects/workspace/${projectId}/get-started`);
		} catch (err) {
			console.error('Error saving project:', err);
			alert('Error saving project');
		}
	}
</script>

<Modal
	bind:open
	title={Object.keys(data).length ? 'Edit project' : 'Add new project'}
	size="md"
	class="m-4"
>
	<!-- Modal body -->
	<div class="space-y-6 p-0">
		<form bind:this={formEl} use:init onsubmit={handleSubmit}>
			<div class="grid grid-cols-6 gap-6">
				<Label class="col-span-6 space-y-2 sm:col-span-3">
					<span>Name</span>
					<Input name="name" class="border outline-none" placeholder="e.g. Downtown Office Tower" required />
				</Label>
				<Label class="col-span-6 space-y-2 sm:col-span-3">
					<span>Asset Type</span>
					<Input name="assetType" class="border outline-none" placeholder="e.g. Office" required />
				</Label>
				<Label class="col-span-6 space-y-2 sm:col-span-3">
					<span>Street Address</span>
					<Input name="streetAddress" class="border outline-none" placeholder="e.g. 100 Market St" />
				</Label>
				<Label class="col-span-6 space-y-2 sm:col-span-3">
					<span>City</span>
					<Input name="city" class="border outline-none" placeholder="e.g. San Francisco" />
				</Label>
				<Label class="col-span-6 space-y-2 sm:col-span-3">
					<span>State</span>
					<Input name="state" class="border outline-none" placeholder="e.g. CA" />
				</Label>
				<Label class="col-span-6 space-y-2 sm:col-span-3">
					<span>Zip</span>
					<Input name="zip" class="border outline-none" placeholder="e.g. 94105" />
				</Label>
				<Label class="col-span-6 space-y-2">
					<span>Description</span>
					<Textarea
						id="description"
						name="description"
						rows={4}
						class="w-full bg-gray-50 outline-none dark:bg-gray-700"
						placeholder="Project description"
					/>
				</Label>
			</div>
			<!-- Modal footer -->
			<div class="mt-6 flex justify-end">
				<Button type="submit">{Object.keys(data).length ? 'Save project' : 'Add project'}</Button>
			</div>
		</form>
	</div>
</Modal>

<!--
  @component
  [Go to docs](https://flowbite-svelte-admin-dashboard.vercel.app/)
  ## Type
  [UserModalProps](https://github.com/themesberg/flowbite-svelte-admin-dashboard/blob/main/src/lib/types.ts#L244)
  ## Props
  @prop open = $bindable(true)
  @prop data
  -->
