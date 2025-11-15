<script lang="ts">
	import type { PageData } from './$types';
	import JobSubmission from '$lib/components/AI/JobSubmission.svelte';
	import { zodTextFormat } from 'openai/helpers/zod';
	import { z } from 'zod';
	import { project as projectStore } from '$lib/stores/appStateStore';

	// Define a type for Job Input Request

	type Tool = {
		type: string;
		vector_store_ids?: string[];
		[key: string]: any;
	};

	type Message = {
		role: string;
		content: string;
	};

	type JobInputRequest = {
		model: string;
		input?: { role: string; content: string }[];
		messages?: Message[];
		tools?: Tool[] | string;
		tool_choice?: string;
		text?: { format: any };
		priority?: string;
		[key: string]: any;
	};

	const projectSchema = z.object({
		name: z.string(),
		description: z.string(),
		address: z.string(),
		city: z.string(),
		state: z.string(),
		zip: z.string(),
		country: z.string(),
		assetType: z.string()
	});

	const brokerSchema = z.object({
		brokers: z.array(
			z.object({
				company: z.string(),
				name: z.string(),
				city: z.string(),
				state: z.string(),
				country: z.string(),
				phone: z.string(),
				email: z.string(),
				website: z.string()
			})
		)
	});

	let { data }: { data: PageData } = $props();

	// Get vector store ID from current project
	const currentProject = $derived($projectStore);
	const getVectorStoreId = () => {
		return currentProject?.vectorStoreId || 'vs_68da2c6862088191a5b51b8b4566b300';
	};

	const jobInput1Request: JobInputRequest = {
		model: 'gpt-5-nano',
		input: [{ role: 'system', content: 'Extract the details from the file' }],
		tools: [{ type: 'file_search', vector_store_ids: [getVectorStoreId()] }],
		tool_choice: 'auto',
		text: { format: zodTextFormat(projectSchema, 'projectDetails') }
	};
	
	const jobInput2Request: JobInputRequest = {
		model: 'gpt-5-nano',
		input: [{ role: 'system', content: 'Extract the details from the file' }],
		tools: [{ type: 'file_search', vector_store_ids: [getVectorStoreId()] }],
		tool_choice: 'auto',
		text: { format: zodTextFormat(brokerSchema, 'projectDetails') }
	};

	const jobInput3Request: JobInputRequest = {
		model: 'gpt-5-nano',
		priority: 'HIGH',
		messages: [
			{
				role: 'user',
				content: 'Write a two sentence summary of this property'
			}
		],
		tools: JSON.stringify([{ type: 'file_search', vector_store_ids: [getVectorStoreId()] }])
	};

	// const jobInput1 = {
	// 	request:
	// 		'{"model":"gpt-5-nano","input":[{"role":"system","content":"Extract the details from the file"}],"tools":[{"type":"file_search","vector_store_ids":["vs_68da2c6862088191a5b51b8b4566b300"]}],"tool_choice":"auto","text":{"format":{"type":"json_schema","name":"projectDetails","strict":true,"schema":{"type":"object","properties":{"name":{"type":"string"},"description":{"type":"string"},"address":{"type":"string"},"city":{"type":"string"},"state":{"type":"string"},"zip":{"type":"string"},"country":{"type":"string"},"assetType":{"type":"string"}},"required":["name","description","address","city","state","zip","country","assetType"],"additionalProperties":false,"$schema":"http://json-schema.org/draft-07/schema#"}}}}',
	// 	priority: 'HIGH'
	// };

	const jobInput1 = {
		request: JSON.stringify(jobInput1Request),
		priority: 'HIGH' as const
	};
	const jobInput2 = {
		request: JSON.stringify(jobInput2Request),
		priority: 'HIGH' as const
	};
	const jobInput3 = {
		request: JSON.stringify(jobInput3Request),
		priority: 'HIGH' as const
	};

	// const jobInput2 = {
	// 	request:
	// 		'{"model":"gpt-5-nano","input":[{"role":"system","content":"Extract the details from the file"}],"tools":[{"type":"file_search","vector_store_ids":["vs_68da2c6862088191a5b51b8b4566b300"]}],"tool_choice":"auto","text":{"format":{"type":"json_schema","name":"projectDetails","strict":true,"schema":{"type":"object","properties":{"name":{"type":"string"},"description":{"type":"string"},"address":{"type":"string"},"city":{"type":"string"},"state":{"type":"string"},"zip":{"type":"string"},"country":{"type":"string"},"assetType":{"type":"string"}},"required":["name","description","address","city","state","zip","country","assetType"],"additionalProperties":false,"$schema":"http://json-schema.org/draft-07/schema#"}}}}',
	// 	priority: 'HIGH'
	// };
</script>

<div class="container mx-auto max-w-full p-6">
	<h1 class="mb-6 text-3xl font-bold">AI Job Submission</h1>

	<!-- <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">

		<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
			<h2 class="mb-4 text-xl font-semibold text-gray-800">Project Details</h2>
			<JobSubmission idToken={data.idToken} jobInput={jobInput1} />
		</div>


		<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
			<h2 class="mb-4 text-xl font-semibold text-gray-800">Project Details</h2>
			<JobSubmission idToken={data.idToken} jobInput={jobInput1} />
		</div>

		<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
			<h2 class="mb-4 text-xl font-semibold text-gray-800">Two Sentence Summary</h2>
			<JobSubmission idToken={data.idToken} jobInput={jobInput3} />
		</div>
	</div> -->
</div>
