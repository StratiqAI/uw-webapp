<script lang="ts">
	let { darkMode = false } = $props<{ darkMode?: boolean }>();

	type NotifChannel = { inApp: boolean; email: boolean };

	let documentAnalysis = $state<NotifChannel>({ inApp: true, email: true });
	let projectUpdates = $state<NotifChannel>({ inApp: true, email: false });
	let dealRoomActivity = $state<NotifChannel>({ inApp: true, email: true });
	let aiInsights = $state<NotifChannel>({ inApp: true, email: false });
	let workflowComplete = $state<NotifChannel>({ inApp: true, email: false });
	let creditBalanceLow = $state<NotifChannel>({ inApp: true, email: true });

	let emailDigestFrequency = $state('daily');

	const DIGEST_OPTIONS = [
		{ value: 'realtime', label: 'Real-time', description: 'Send emails as events happen' },
		{ value: 'daily', label: 'Daily Digest', description: 'One summary email per day' },
		{ value: 'weekly', label: 'Weekly Digest', description: 'One summary email per week' },
		{ value: 'off', label: 'Off', description: 'No email notifications' }
	];

	type NotifItem = {
		key: string;
		label: string;
		description: string;
		state: NotifChannel;
	};

	let notifItems = $derived<NotifItem[]>([
		{
			key: 'documentAnalysis',
			label: 'Document Analysis Complete',
			description: 'When document extraction and AI analysis finishes processing',
			state: documentAnalysis
		},
		{
			key: 'projectUpdates',
			label: 'Project Updates',
			description: 'Changes to projects you own or collaborate on',
			state: projectUpdates
		},
		{
			key: 'dealRoomActivity',
			label: 'Deal Room Activity',
			description: 'New documents, member joins, and NDA status changes',
			state: dealRoomActivity
		},
		{
			key: 'aiInsights',
			label: 'AI Insights Ready',
			description: 'When AI-generated analysis and recommendations are available',
			state: aiInsights
		},
		{
			key: 'workflowComplete',
			label: 'Workflow Execution Complete',
			description: 'When an automated workflow finishes running',
			state: workflowComplete
		},
		{
			key: 'creditBalanceLow',
			label: 'Credit Balance Low',
			description: 'When your account credits drop below the threshold',
			state: creditBalanceLow
		}
	]);

	function toggleInApp(key: string) {
		switch (key) {
			case 'documentAnalysis':
				documentAnalysis = { ...documentAnalysis, inApp: !documentAnalysis.inApp };
				break;
			case 'projectUpdates':
				projectUpdates = { ...projectUpdates, inApp: !projectUpdates.inApp };
				break;
			case 'dealRoomActivity':
				dealRoomActivity = { ...dealRoomActivity, inApp: !dealRoomActivity.inApp };
				break;
			case 'aiInsights':
				aiInsights = { ...aiInsights, inApp: !aiInsights.inApp };
				break;
			case 'workflowComplete':
				workflowComplete = { ...workflowComplete, inApp: !workflowComplete.inApp };
				break;
			case 'creditBalanceLow':
				creditBalanceLow = { ...creditBalanceLow, inApp: !creditBalanceLow.inApp };
				break;
		}
	}

	function toggleEmail(key: string) {
		switch (key) {
			case 'documentAnalysis':
				documentAnalysis = { ...documentAnalysis, email: !documentAnalysis.email };
				break;
			case 'projectUpdates':
				projectUpdates = { ...projectUpdates, email: !projectUpdates.email };
				break;
			case 'dealRoomActivity':
				dealRoomActivity = { ...dealRoomActivity, email: !dealRoomActivity.email };
				break;
			case 'aiInsights':
				aiInsights = { ...aiInsights, email: !aiInsights.email };
				break;
			case 'workflowComplete':
				workflowComplete = { ...workflowComplete, email: !workflowComplete.email };
				break;
			case 'creditBalanceLow':
				creditBalanceLow = { ...creditBalanceLow, email: !creditBalanceLow.email };
				break;
		}
	}

	function handleSave() {
		const prefs = {
			documentAnalysis,
			projectUpdates,
			dealRoomActivity,
			aiInsights,
			workflowComplete,
			creditBalanceLow,
			emailDigestFrequency
		};
		try {
			localStorage.setItem('user-settings-notifications', JSON.stringify(prefs));
		} catch {}
	}

	function loadSaved() {
		try {
			const saved = localStorage.getItem('user-settings-notifications');
			if (saved) {
				const data = JSON.parse(saved);
				if (data.documentAnalysis) documentAnalysis = data.documentAnalysis;
				if (data.projectUpdates) projectUpdates = data.projectUpdates;
				if (data.dealRoomActivity) dealRoomActivity = data.dealRoomActivity;
				if (data.aiInsights) aiInsights = data.aiInsights;
				if (data.workflowComplete) workflowComplete = data.workflowComplete;
				if (data.creditBalanceLow) creditBalanceLow = data.creditBalanceLow;
				if (data.emailDigestFrequency) emailDigestFrequency = data.emailDigestFrequency;
			}
		} catch {}
	}

	$effect(() => {
		if (typeof window !== 'undefined') loadSaved();
	});
</script>

<div class="space-y-6">
	<!-- Notification Channels -->
	<div
		class="rounded-lg border p-6 {darkMode
			? 'bg-slate-800 border-slate-700'
			: 'bg-white border-slate-200'} shadow-sm"
	>
		<h3 class="text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-1">
			Notification Channels
		</h3>
		<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mb-5">
			Choose how you want to be notified for each type of event.
		</p>

		<!-- Header row -->
		<div class="mb-3 flex items-center gap-4 px-1">
			<div class="flex-1"></div>
			<div class="w-16 text-center text-xs font-semibold uppercase tracking-wide {darkMode ? 'text-slate-400' : 'text-slate-500'}">
				In-App
			</div>
			<div class="w-16 text-center text-xs font-semibold uppercase tracking-wide {darkMode ? 'text-slate-400' : 'text-slate-500'}">
				Email
			</div>
		</div>

		<div class="space-y-1">
			{#each notifItems as item}
				<div
					class="flex items-center gap-4 rounded-lg px-3 py-3 transition-colors {darkMode
						? 'hover:bg-slate-700/50'
						: 'hover:bg-slate-50'}"
				>
					<div class="flex-1 min-w-0">
						<p class="text-sm font-medium {darkMode ? 'text-white' : 'text-slate-900'}">
							{item.label}
						</p>
						<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-0.5">
							{item.description}
						</p>
					</div>
					<div class="w-16 flex justify-center">
						<button
							type="button"
							onclick={() => toggleInApp(item.key)}
							class="relative h-6 w-11 rounded-full transition-colors {item.state.inApp
								? 'bg-primary-600'
								: darkMode
									? 'bg-slate-600'
									: 'bg-slate-300'}"
							role="switch"
							aria-checked={item.state.inApp}
						>
							<span
								class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform {item
									.state.inApp
									? 'translate-x-5'
									: 'translate-x-0'}"
							></span>
						</button>
					</div>
					<div class="w-16 flex justify-center">
						<button
							type="button"
							onclick={() => toggleEmail(item.key)}
							class="relative h-6 w-11 rounded-full transition-colors {item.state.email
								? 'bg-primary-600'
								: darkMode
									? 'bg-slate-600'
									: 'bg-slate-300'}"
							role="switch"
							aria-checked={item.state.email}
						>
							<span
								class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform {item
									.state.email
									? 'translate-x-5'
									: 'translate-x-0'}"
							></span>
						</button>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Email Digest Frequency -->
	<div
		class="rounded-lg border p-6 {darkMode
			? 'bg-slate-800 border-slate-700'
			: 'bg-white border-slate-200'} shadow-sm"
	>
		<h3 class="text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-1">
			Email Digest Frequency
		</h3>
		<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mb-4">
			How often should email notifications be batched and sent?
		</p>
		<div class="grid gap-3 sm:grid-cols-2">
			{#each DIGEST_OPTIONS as opt}
				<button
					type="button"
					onclick={() => (emailDigestFrequency = opt.value)}
					class="rounded-lg border p-4 text-left transition-all {emailDigestFrequency === opt.value
						? darkMode
							? 'border-primary-500 bg-primary-900/30'
							: 'border-primary-500 bg-primary-50'
						: darkMode
							? 'border-slate-600 hover:border-slate-500'
							: 'border-slate-200 hover:border-slate-300'}"
				>
					<p
						class="text-sm font-medium {emailDigestFrequency === opt.value
							? darkMode
								? 'text-primary-300'
								: 'text-primary-700'
							: darkMode
								? 'text-white'
								: 'text-slate-900'}"
					>
						{opt.label}
					</p>
					<p class="mt-0.5 text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">
						{opt.description}
					</p>
				</button>
			{/each}
		</div>

		<div
			class="mt-6 flex justify-end border-t pt-5 {darkMode
				? 'border-slate-700'
				: 'border-slate-200'}"
		>
			<button
				type="button"
				onclick={handleSave}
				class="rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors bg-primary-600 hover:bg-primary-700"
			>
				Save Notifications
			</button>
		</div>
	</div>
</div>
