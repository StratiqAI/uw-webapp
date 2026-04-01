import type { TourDefinition } from '../types';

export const workspaceTour: TourDefinition = {
	id: 'workspace',
	name: 'Project Workspace',
	description: 'Learn how to use the project workspace effectively.',
	trigger: {
		type: 'auto',
		route: '/projects/workspace/',
		showOnce: true,
		delay: 1000
	},
	steps: [
		{
			id: 'workspace-topbar',
			target: '[data-tour="workspace-topbar"]',
			title: 'Workspace Navigation',
			content:
				'Use these tabs to switch between different views of your project. Each tab focuses on a different aspect of your analysis.',
			placement: 'bottom'
		},
		{
			id: 'workspace-project-selector',
			target: '[data-tour="workspace-project-selector"]',
			title: 'Project Selector',
			content:
				'Quickly switch between your projects without leaving the workspace. Your current project name is shown here.',
			placement: 'bottom'
		},
		{
			id: 'workspace-chat',
			target: '[data-tour="workspace-chat"]',
			title: 'AI Assistant',
			content:
				'Chat with the AI assistant to ask questions about your documents, get analysis help, or run custom queries.',
			placement: 'left'
		}
	]
};
