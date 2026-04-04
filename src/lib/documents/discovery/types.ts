import type { Text, Table, Image } from '@stratiqai/types-simple';

export type { Text, Table, Image };

export interface ProjectDocument {
	id: string;
	filename: string;
}

export interface ExtractedTable {
	id: string;
	sourceTextId: string;
	pageNum: number | null;
	markdown: string;
	headers: string[];
	rows: string[][];
}

export type ViewCategory = 'documents' | 'texts' | 'tables' | 'images' | null;

export interface CategoryColorScheme {
	bg: string;
	bgSelected: string;
	border: string;
	borderSelected: string;
	ring: string;
	text: string;
	deltaBg: string;
	hoverShadow?: string;
}

export interface CategoryConfig {
	key: Exclude<ViewCategory, null>;
	label: string;
	icon: string;
	light: CategoryColorScheme;
	dark: CategoryColorScheme;
}
