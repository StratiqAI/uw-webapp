// Enums matching GraphQL schema
export type SharingMode = 'PRIVATE' | 'PUBLIC' | 'TENANT' | 'SPECIFIC_USERS';
export type AssetType = 'RESIDENTIAL' | 'MULTIFAMILY' | 'RETAIL' | 'OFFICE' | 'HISTORIC' | 'INDUSTRIAL' | 'LAND' | 'OTHER';

export interface ProjectDetail {
	id: string;
	projectId: string;
	ownerId: string;
	tenant?: string | null;
	description?: string | null;
	streetAddress?: string | null;
	city?: string | null;
	state?: string | null;
	zip?: string | null;
	assetType?: AssetType | null;
	sharingMode?: SharingMode | null;
	createdAt?: string; // AWSDateTime
	updatedAt?: string; // AWSDateTime
}

export interface ProjectDocument {
	id: string;
	projectId: string;
	ownerId: string;
	tenant?: string | null;
	filename: string;
	openAIFileId?: string | null;
	sharingMode?: SharingMode | null;
	createdAt?: string; // AWSDateTime
	updatedAt?: string; // AWSDateTime
}

export interface ProjectDocumentConnection {
	items: ProjectDocument[];
	nextToken?: string | null;
}

import type { ProjectDocumentLink, Project as StratiqProject } from '@stratiqai/types';

export interface ProjectDocumentLinkConnection {
	items: ProjectDocumentLink[];
	nextToken?: string | null;
}

// Extend the Project type from stratiqai-types to include GraphQL Connection format
export interface Project extends Omit<StratiqProject, 'projectDocumentLinks'> {
	projectDocumentLinks?: ProjectDocumentLinkConnection | ProjectDocumentLink[] | null;
	documents?: ProjectDocumentConnection | null; // Legacy - deprecated
}

export interface CreateProjectInput {
	name: string;
}

export interface ShareProjectInput {
	projectId: string;
	sharingMode: SharingMode;
	allowedUsers?: string[];
}

export interface UpdateProjectInput {
	projectId: string;
	name?: string;
}

export interface CreateProjectDetailInput {
	projectId: string;
	description?: string;
	streetAddress?: string;
	city?: string;
	state?: string;
	zip?: string;
	assetType?: AssetType;
}

export interface UpdateProjectDetailInput {
	id: string;
	projectId?: string;
	description?: string;
	streetAddress?: string;
	city?: string;
	state?: string;
	zip?: string;
	assetType?: AssetType;
}

export interface CreateProjectDocumentInput {
	projectId: string;
	filename: string;
	openAIFileId?: string;
}

export interface UpdateProjectDocumentInput {
	id: string;
	projectId?: string;
	filename?: string;
	openAIFileId?: string;
}
