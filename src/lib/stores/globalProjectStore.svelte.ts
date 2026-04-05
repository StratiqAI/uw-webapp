import type { Project } from '@stratiqai/types-simple';

const STORAGE_KEY = 'selected_project';

// #region agent log
const _dbg = (location: string, message: string, data: Record<string, unknown> = {}) =>
	fetch('http://127.0.0.1:7378/ingest/4d5fe42c-52eb-4139-a797-75aa8980d08f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'bfa702'},body:JSON.stringify({sessionId:'bfa702',location,message,data,timestamp:Date.now()})}).catch(()=>{});
// #endregion

class GlobalProjectStore {
	projects = $state<Project[]>([]);
	selectedProjectId = $state<string | null>(null);

	selectedProject = $derived(
		this.selectedProjectId ? this.projects.find((p) => p.id === this.selectedProjectId) ?? null : null
	);

	initialize(projects: Project[]) {
		// #region agent log
		_dbg('globalProjectStore.ts:initialize','initialize called',{hypothesisId:'C',projectCount:projects.length,currentSelectedId:this.selectedProjectId});
		// #endregion
		this.projects = projects;

		if (typeof localStorage !== 'undefined') {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved && projects.some((p) => p.id === saved)) {
				this.selectedProjectId = saved;
				// #region agent log
				_dbg('globalProjectStore.ts:initialize','restored from localStorage',{hypothesisId:'C',savedId:saved});
				// #endregion
				return;
			}
		}

		this.selectedProjectId = projects.length > 0 ? projects[0].id : null;
		// #region agent log
		_dbg('globalProjectStore.ts:initialize','set default selectedProjectId',{hypothesisId:'C',selectedId:this.selectedProjectId});
		// #endregion
	}

	setSelectedProjectId(id: string | null) {
		// #region agent log
		_dbg('globalProjectStore.ts:setSelectedProjectId','setSelectedProjectId called',{hypothesisId:'B',newId:id,prevId:this.selectedProjectId});
		// #endregion
		this.selectedProjectId = id;
		try {
			if (id) localStorage.setItem(STORAGE_KEY, id);
			else localStorage.removeItem(STORAGE_KEY);
		} catch {
			// localStorage unavailable (SSR)
		}
	}

	setProjects(projects: Project[]) {
		// #region agent log
		const _prevSelId = this.selectedProjectId;
		_dbg('globalProjectStore.ts:setProjects','setProjects called',{hypothesisId:'A',projectCount:projects.length,currentSelectedId:_prevSelId,projectIds:projects.map(p=>p.id).slice(0,5)});
		// #endregion
		this.projects = projects;
		if (this.selectedProjectId && !projects.some((p) => p.id === this.selectedProjectId)) {
			// #region agent log
			_dbg('globalProjectStore.ts:setProjects','selectedProjectId NOT in list, resetting',{hypothesisId:'A',oldId:this.selectedProjectId,newId:projects.length>0?projects[0].id:null});
			// #endregion
			this.selectedProjectId = projects.length > 0 ? projects[0].id : null;
		}
	}

	updateProject(id: string, updates: Partial<Project>) {
		this.projects = this.projects.map((p) => (p.id === id ? { ...p, ...updates } : p));
	}
}

export const globalProjectStore = new GlobalProjectStore();
