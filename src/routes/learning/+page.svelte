<script lang="ts">
	import { darkModeStore } from '$lib/stores/darkMode.svelte';

	// Use unified dark mode store
	let darkMode = $derived.by(() => darkModeStore.darkMode);
	let toggleDarkMode = darkModeStore.toggle;

	interface LearningResource {
		title: string;
		description: string;
		link: string;
		tag: 'Beginner' | 'Intermediate' | 'Advanced' | 'All';
		icon?: string;
	}

	const resources: LearningResource[] = [
		{
			title: 'Getting Started',
			description: 'Learn the basics of using StratiqAI and how to get your first project up and running.',
			link: '/learning/getting-started',
			tag: 'Beginner',
			icon: '🚀'
		},
		{
			title: 'Project Management',
			description: 'Best practices and workflows for managing your real estate projects efficiently.',
			link: '/learning/project-management',
			tag: 'Intermediate',
			icon: '📁'
		},
		{
			title: 'Investment Analysis',
			description: 'Deep dive into the analysis tools and how to interpret results for smarter decisions.',
			link: '/learning/investment-analysis',
			tag: 'Advanced',
			icon: '📊'
		},
		{
			title: 'Document Review',
			description: 'How to upload, organize, and review documents within your projects.',
			link: '/learning/document-review',
			tag: 'Beginner',
			icon: '📄'
		},
		{
			title: 'FAQs',
			description: 'Frequently asked questions and troubleshooting tips.',
			link: '/learning/faqs',
			tag: 'All',
			icon: '❓'
		}
	];

	function getTagColor(tag: string) {
		switch (tag) {
			case 'Beginner':
				return darkMode ? 'bg-emerald-900 text-emerald-300' : 'bg-emerald-100 text-emerald-700';
			case 'Intermediate':
				return darkMode ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-700';
			case 'Advanced':
				return darkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700';
			default:
				return darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700';
		}
	}
</script>

<div class="flex h-screen w-full overflow-hidden {darkMode ? 'bg-slate-900' : 'bg-slate-50'} transition-colors">
	<!-- Main Content Area -->
	<div class="flex-1 flex flex-col overflow-hidden {darkMode ? 'bg-slate-900' : 'bg-white'}">
		<!-- Header -->
		<div class="h-14 {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-b flex items-center justify-between px-6 shadow-sm">
			<div class="flex items-center gap-4">
				<div class="w-10 h-10 {darkMode ? 'bg-indigo-900' : 'bg-indigo-100'} rounded-lg flex items-center justify-center">
					<svg class="w-5 h-5 {darkMode ? 'text-indigo-300' : 'text-indigo-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 14H4m6.5 3L8 20m5.5-3 2.5 3M4.88889 17H19.1111c.4909 0 .8889-.4157.8889-.9286V4.92857C20 4.41574 19.602 4 19.1111 4H4.88889C4.39797 4 4 4.41574 4 4.92857V16.0714c0 .5129.39797.9286.88889.9286ZM13 14v-3h4v3h-4Z"></path>
					</svg>
				</div>
				<h1 class="text-2xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'} tracking-tight">Learning Center</h1>
				<div class="h-4 w-px {darkMode ? 'bg-slate-700' : 'bg-slate-200'}"></div>
				<span class="text-sm {darkMode ? 'text-slate-300' : 'text-slate-600'}">
					{resources.length} {resources.length === 1 ? 'resource' : 'resources'}
				</span>
			</div>
			<div class="flex items-center gap-2">
				<button
					class="p-2 {darkMode ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'} rounded-md transition-colors"
					onclick={toggleDarkMode}
					aria-label="Toggle dark mode"
					title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
				>
					{#if darkMode}
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
						</svg>
					{:else}
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
						</svg>
					{/if}
				</button>
			</div>
		</div>

		<!-- Main Content -->
		<div class="flex-1 overflow-y-auto {darkMode ? 'bg-slate-900' : 'bg-slate-50'}">
			<div class="max-w-7xl mx-auto px-6 py-8">
				<!-- Description -->
				<div class="mb-8">
					<p class="text-base {darkMode ? 'text-slate-300' : 'text-slate-600'}">
						Explore guides, tutorials, and resources to help you get the most out of StratiqAI.
					</p>
				</div>

				<!-- Learning Resources Grid -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					{#each resources as resource}
						<a
							href={resource.link}
							class="{darkMode ? 'bg-slate-800 border-slate-700 hover:border-indigo-500' : 'bg-white border-slate-200 hover:border-indigo-300'} border rounded-lg p-6 transition-all hover:shadow-lg group flex flex-col"
						>
							<div class="flex items-start gap-4 mb-4">
								<div class="w-12 h-12 flex-shrink-0 {darkMode ? 'bg-indigo-900' : 'bg-indigo-100'} rounded-lg flex items-center justify-center text-2xl">
									{resource.icon || '📚'}
								</div>
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2 mb-2">
										<h3 class="text-lg font-semibold {darkMode ? 'text-white group-hover:text-indigo-300' : 'text-slate-900 group-hover:text-indigo-600'} transition-colors">
											{resource.title}
										</h3>
										<span class="px-2 py-0.5 text-xs font-medium rounded {getTagColor(resource.tag)}">
											{resource.tag}
										</span>
									</div>
									<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-600'} line-clamp-2">
										{resource.description}
									</p>
								</div>
							</div>
							<div class="mt-auto flex items-center justify-between">
								<span class="text-sm font-medium {darkMode ? 'text-indigo-400' : 'text-indigo-600'}">
									Read More
								</span>
								<svg class="w-5 h-5 {darkMode ? 'text-slate-500 group-hover:text-indigo-400' : 'text-slate-400 group-hover:text-indigo-600'} transition-colors opacity-0 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
								</svg>
							</div>
						</a>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>
