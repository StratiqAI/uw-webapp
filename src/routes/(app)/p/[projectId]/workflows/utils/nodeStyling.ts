import type { NodeType } from '../types/node';

export function getElementColor(type: NodeType, darkMode: boolean): string {
	if (type === 'comment') {
		return darkMode ? 'bg-amber-900/30' : 'bg-amber-50';
	}
	if (darkMode) {
		return 'bg-slate-600';
	} else {
		return 'bg-white';
	}
}

export function getElementBorderColor(type: NodeType, darkMode: boolean): string {
	if (type === 'comment') {
		return darkMode ? 'border-amber-600/50' : 'border-amber-300';
	}
	if (darkMode) {
		switch (type) {
			case 'input':
			case 'process':
				return 'border-slate-400';
			case 'output':
				return 'border-emerald-300';
			case 'ai':
				return 'border-indigo-300';
		}
	} else {
		switch (type) {
			case 'input':
			case 'process':
				return 'border-slate-300';
			case 'output':
				return 'border-emerald-300';
			case 'ai':
				return 'border-indigo-300';
		}
	}
}

export function getNodeIconBgColor(type: NodeType, darkMode: boolean): string {
	if (type === 'comment') {
		return darkMode ? 'bg-amber-800/50' : 'bg-amber-100';
	}
	if (darkMode) {
		switch (type) {
			case 'input':
			case 'process':
				return 'bg-slate-600';
			case 'output':
				return 'bg-emerald-800';
			case 'ai':
				return 'bg-indigo-800';
		}
	} else {
		switch (type) {
			case 'input':
			case 'process':
				return 'bg-slate-100';
			case 'output':
				return 'bg-emerald-50';
			case 'ai':
				return 'bg-indigo-50';
		}
	}
}

export function getNodeIconTextColor(type: NodeType, darkMode: boolean): string {
	if (type === 'comment') {
		return darkMode ? 'text-amber-200' : 'text-amber-700';
	}
	if (darkMode) {
		switch (type) {
			case 'input':
			case 'process':
				return 'text-slate-100';
			case 'output':
				return 'text-emerald-200';
			case 'ai':
				return 'text-indigo-200';
		}
	} else {
		switch (type) {
			case 'input':
			case 'process':
				return 'text-slate-700';
			case 'output':
				return 'text-emerald-700';
			case 'ai':
				return 'text-indigo-700';
		}
	}
}

export function getNodeLabelColor(darkMode: boolean): string {
	return darkMode ? 'text-slate-100' : 'text-slate-900';
}

export function getNodeAccentColor(type: NodeType, darkMode: boolean): string {
	if (type === 'comment') {
		return '';
	}
	if (darkMode) {
		switch (type) {
			case 'input':
			case 'process':
				return '';
			case 'output':
				return 'ring-emerald-500/40';
			case 'ai':
				return 'ring-indigo-500/40';
		}
	} else {
		switch (type) {
			case 'input':
			case 'process':
				return '';
			case 'output':
				return 'ring-emerald-200';
			case 'ai':
				return 'ring-indigo-200';
		}
	}
}

export function getSidebarButtonColor(type: NodeType, darkMode: boolean): string {
	if (darkMode) {
		return 'bg-slate-700/50 hover:bg-slate-700 border-slate-600';
	} else {
		return 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300';
	}
}

export function getIconBgColor(type: NodeType, darkMode: boolean): string {
	if (type === 'comment') {
		return darkMode ? 'bg-amber-800/50' : 'bg-amber-100';
	}
	switch (type) {
		case 'input':
		case 'process':
			return darkMode ? 'bg-slate-600' : 'bg-slate-100';
		case 'output':
			return darkMode ? 'bg-emerald-700' : 'bg-emerald-50';
		case 'ai':
			return darkMode ? 'bg-indigo-700' : 'bg-indigo-50';
	}
}

export function getIconTextColor(type: NodeType, darkMode: boolean): string {
	if (type === 'comment') {
		return darkMode ? 'text-amber-200' : 'text-amber-700';
	}
	switch (type) {
		case 'input':
		case 'process':
			return darkMode ? 'text-slate-200' : 'text-slate-700';
		case 'output':
			return darkMode ? 'text-emerald-300' : 'text-emerald-700';
		case 'ai':
			return darkMode ? 'text-indigo-300' : 'text-indigo-700';
	}
}

export function getLabelTextColor(darkMode: boolean): string {
	return darkMode ? 'text-slate-200' : 'text-slate-900';
}
