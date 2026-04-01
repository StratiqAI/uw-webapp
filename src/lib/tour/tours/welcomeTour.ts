import type { TourDefinition } from '../types';

export const welcomeTour: TourDefinition = {
	id: 'welcome',
	name: 'Welcome to StratiqAI',
	description: 'A quick overview of the platform and how to get around.',
	trigger: {
		type: 'auto',
		route: '/dashboard',
		showOnce: false,
		delay: 800
	},
	steps: [
		{
			id: 'welcome-intro',
			title: 'Welcome to StratiqAI',
			content:
				'Let\'s take a quick tour of the platform so you can get the most out of it. You can skip at any time and replay this tour later.',
			placement: 'bottom'
		},
		{
			id: 'sidebar-projects',
			target: '[data-tour="sidebar-projects"]',
			title: 'Projects',
			content:
				'All your work starts with a <strong>project</strong>. Create and manage projects here to organise your documents and analysis.',
			placement: 'right'
		},
		{
			id: 'sidebar-doc-analysis',
			target: '[data-tour="sidebar-doc-analysis"]',
			title: 'Document Analysis',
			content:
				'Upload and analyse documents using AI. Extract key data, generate summaries, and run custom queries against your documents.',
			placement: 'right'
		},
		{
			id: 'sidebar-dashboard',
			target: '[data-tour="sidebar-dashboard"]',
			title: 'Dashboard',
			content:
				'Your central command centre. View widgets, charts, and key metrics from your projects at a glance.',
			placement: 'right'
		},
		{
			id: 'sidebar-library',
			target: '[data-tour="sidebar-library"]',
			title: 'Prompt Library',
			content:
				'Save, reuse, and share AI prompts. Build a library of prompts tailored to your analysis workflow.',
			placement: 'right'
		},
		{
			id: 'theme-switcher',
			target: '[data-tour="theme-switcher"]',
			title: 'Theme',
			content: 'Switch between light and dark themes to suit your preference.',
			placement: 'right'
		},
		{
			id: 'user-menu',
			target: '[data-tour="user-menu"]',
			title: 'Your Account',
			content:
				'Access your profile settings and account options here. That\'s it — you\'re ready to go!',
			placement: 'right',
			nextLabel: 'Get Started'
		}
	]
};
