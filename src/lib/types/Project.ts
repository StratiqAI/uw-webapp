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

import type { Doclink, Project as StratiqProject } from '@stratiqai/types-simple';

// Type alias for backward compatibility - Doclink is the correct type name
export type ProjectDocumentLink = Doclink;

export interface ProjectDocumentLinkConnection {
	items: Doclink[];
	nextToken?: string | null;
}

// Extend the Project type from stratiqai-types-simple to include GraphQL Connection format
// Note: Project.doclinks is the correct field name (not projectDocumentLinks)
export interface Project extends Omit<StratiqProject, 'doclinks'> {
	// Legacy field name for backward compatibility - maps to doclinks
	projectDocumentLinks?: ProjectDocumentLinkConnection | Doclink[] | null;
	// Correct field name from GraphQL schema
	doclinks?: ProjectDocumentLinkConnection | Doclink[] | null;
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
