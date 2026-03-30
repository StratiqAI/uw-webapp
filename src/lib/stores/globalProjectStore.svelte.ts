import type { Project } from '@stratiqai/types-simple';

const STORAGE_KEY = 'selected_project';

class GlobalProjectStore {
	projects = $state<Project[]>([]);
	selectedProjectId = $state<string | null>(null);

	selectedProject = $derived(
		this.selectedProjectId ? this.projects.find((p) => p.id === this.selectedProjectId) ?? null : null
	);

	initialize(projects: Project[]) {
		this.projects = projects;

		if (typeof localStorage !== 'undefined') {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved && projects.some((p) => p.id === saved)) {
				this.selectedProjectId = saved;
				return;
			}
		}

		this.selectedProjectId = projects.length > 0 ? projects[0].id : null;
	}

	setSelectedProjectId(id: string | null) {
		this.selectedProjectId = id;
		try {
			if (id) localStorage.setItem(STORAGE_KEY, id);
			else localStorage.removeItem(STORAGE_KEY);
		} catch {
			// localStorage unavailable (SSR)
		}
	}

	setProjects(projects: Project[]) {
		this.projects = projects;
		if (this.selectedProjectId && !projects.some((p) => p.id === this.selectedProjectId)) {
			this.selectedProjectId = projects.length > 0 ? projects[0].id : null;
		}
	}
}

export const globalProjectStore = new GlobalProjectStore();
