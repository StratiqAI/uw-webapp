<script lang="ts">
	import { darkModeStore } from '$lib/stores/darkMode.svelte';
	import UnifiedTopBar from '$lib/components/UnifiedTopBar.svelte';

	let darkMode = $derived.by(() => darkModeStore.darkMode);

	interface SupportSection {
		id: string;
		title: string;
		description: string;
		icon: string;
		items: {
			title: string;
			description: string;
			href?: string;
		}[];
	}

	const supportSections: SupportSection[] = [
		{
			id: 'getting-started',
			title: 'Getting Started',
			description: 'Learn the basics and get up and running quickly',
			icon: '🚀',
			items: [
				{
					title: 'Quick Start Guide',
					description: 'Step-by-step guide to create your first project',
					href: '/docs/quick-start'
				},
				{
					title: 'Dashboard Overview',
					description: 'Learn how to use the dashboard builder',
					href: '/docs/dashboard'
				},
				{
					title: 'Workflow Builder',
					description: 'Create and execute analysis workflows',
					href: '/docs/workflows'
				}
			]
		},
		{
			id: 'features',
			title: 'Features & Guides',
			description: 'Explore features and learn how to use them',
			icon: '📚',
			items: [
				{
					title: 'Prompt Library',
					description: 'Create and manage AI analysis agents',
					href: '/docs/agents'
				},
				{
					title: 'Data Sources',
					description: 'Connect and use external data sources',
					href: '/docs/data-sources'
				},
				{
					title: 'Projects & Workspaces',
					description: 'Organize your work with projects',
					href: '/docs/projects'
				}
			]
		},
		{
			id: 'troubleshooting',
			title: 'Troubleshooting',
			description: 'Common issues and solutions',
			icon: '🔧',
			items: [
				{
					title: 'Account & Access',
					description: 'Resolve login and permission issues',
					href: '/docs/troubleshooting/account'
				},
				{
					title: 'Performance Issues',
					description: 'Fix slow loading and performance problems',
					href: '/docs/troubleshooting/performance'
				},
				{
					title: 'Data Import Errors',
					description: 'Troubleshoot data import and connection issues',
					href: '/docs/troubleshooting/data'
				}
			]
		}
	];

	const contactMethods = [
		{
			title: 'Email Support',
			description: 'Get help via email',
			value: 'support@stratiqai.com',
			icon: '✉️',
			action: 'mailto:support@stratiqai.com'
		},
		{
			title: 'Documentation',
			description: 'Browse our documentation',
			value: 'docs.stratiqai.com',
			icon: '📖',
			action: 'https://docs.stratiqai.com'
		},
		{
			title: 'Community Forum',
			description: 'Join the community',
			value: 'community.stratiqai.com',
			icon: '💬',
			action: 'https://community.stratiqai.com'
		}
	];
</script>

<div class="flex h-screen w-full overflow-hidden {darkMode ? 'bg-slate-900' : 'bg-slate-50'} transition-colors">
	<!-- Main Content Area -->
	<div class="flex-1 flex flex-col overflow-hidden {darkMode ? 'bg-slate-900' : 'bg-white'}">
		<UnifiedTopBar pageTitle="Support" subtitle="Help & Resources" />

		<!-- Main Content -->
		<div class="flex-1 overflow-y-auto {darkMode ? 'bg-slate-900' : 'bg-slate-50'}">
			<div class="max-w-7xl mx-auto px-6 py-8">
				<!-- Hero Section -->
				<div class="mb-12">
					<h2 class="text-3xl font-bold {darkMode ? 'text-white' : 'text-slate-900'} mb-3">How can we help you?</h2>
					<p class="text-lg {darkMode ? 'text-slate-300' : 'text-slate-600'} mb-6">
						Find answers, guides, and resources to get the most out of StratiqAI
					</p>
					<!-- Search Bar -->
					<div class="relative max-w-2xl">
						<input
							type="text"
							placeholder="Search for help articles..."
							class="w-full px-4 py-3 pl-12 {darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors shadow-sm"
						/>
						<svg class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 {darkMode ? 'text-slate-400' : 'text-slate-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
						</svg>
					</div>
				</div>

				<!-- Support Sections -->
				<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
					{#each supportSections as section}
						<div
							class="{darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-lg p-6 hover:shadow-lg transition-all"
						>
							<div class="flex items-start gap-4 mb-4">
								<div class="text-3xl">{section.icon}</div>
								<div class="flex-1">
									<h3 class="text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-1">
										{section.title}
									</h3>
									<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-600'}">
										{section.description}
									</p>
                        </div>
                    </div>
							<div class="space-y-3">
								{#each section.items as item}
									<a
										href={item.href || '#'}
										class="block p-3 {darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-50 hover:bg-slate-100'} rounded-lg transition-colors group"
									>
										<h4 class="text-sm font-medium {darkMode ? 'text-white group-hover:text-indigo-300' : 'text-slate-900 group-hover:text-indigo-600'} mb-1 transition-colors">
											{item.title}
										</h4>
										<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-600'}">
											{item.description}
										</p>
									</a>
								{/each}
                        </div>
                    </div>
					{/each}
    </div>

				<!-- Contact Methods -->
				<div class="mb-12">
					<h3 class="text-xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-6">Get in Touch</h3>
					<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
						{#each contactMethods as method}
							<a
								href={method.action}
								target={method.action.startsWith('http') ? '_blank' : undefined}
								rel={method.action.startsWith('http') ? 'noopener noreferrer' : undefined}
								class="{darkMode ? 'bg-slate-800 border-slate-700 hover:border-indigo-500' : 'bg-white border-slate-200 hover:border-indigo-300'} border rounded-lg p-6 transition-all hover:shadow-lg group"
							>
								<div class="flex items-start gap-4">
									<div class="text-2xl">{method.icon}</div>
									<div class="flex-1 min-w-0">
										<h4 class="text-base font-semibold {darkMode ? 'text-white group-hover:text-indigo-300' : 'text-slate-900 group-hover:text-indigo-600'} mb-1 transition-colors">
											{method.title}
										</h4>
										<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-600'} mb-2">
											{method.description}
										</p>
										<p class="text-sm font-medium {darkMode ? 'text-indigo-400' : 'text-indigo-600'} break-all">
											{method.value}
										</p>
                </div>
									<svg class="w-5 h-5 {darkMode ? 'text-slate-500 group-hover:text-indigo-400' : 'text-slate-400 group-hover:text-indigo-600'} transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                            </svg>
                        </div>
							</a>
						{/each}
        </div>
    </div>
  
				<!-- Quick Links -->
            <div>
					<h3 class="text-xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-6">Quick Links</h3>
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
						{#each [
							{ title: 'API Documentation', href: '/docs/api', icon: '🔌' },
							{ title: 'Release Notes', href: '/docs/releases', icon: '📝' },
							{ title: 'Video Tutorials', href: '/docs/tutorials', icon: '🎥' },
							{ title: 'System Status', href: '/status', icon: '📊' }
						] as link}
							<a
								href={link.href}
								class="{darkMode ? 'bg-slate-800 border-slate-700 hover:border-indigo-500' : 'bg-white border-slate-200 hover:border-indigo-300'} border rounded-lg p-4 transition-all hover:shadow-md group flex items-center gap-3"
							>
								<span class="text-xl">{link.icon}</span>
								<span class="text-sm font-medium {darkMode ? 'text-white group-hover:text-indigo-300' : 'text-slate-900 group-hover:text-indigo-600'} transition-colors">
									{link.title}
            </span>
							</a>
						{/each}
                </div>
            </div>
        </div>
    </div>
  </div>
</div>
