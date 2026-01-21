/**
 * DocumentEntitiesSyncManager
 * 
 * Manages fetching and syncing document entities (texts, tables, images) for a project.
 * This manager fetches documents with their nested entities using getDocument query
 * and populates the projectEntitiesStore.
 */

import { browser } from '$app/environment';
import type { Text, Table, Image } from '@stratiqai/types-simple';
import { gql } from '$lib/realtime/graphql/requestHandler';
import {
	addProjectText,
	addProjectTable,
	addProjectImage,
	clearProjectEntities
} from '$lib/stores/projectEntitiesStore';

/**
 * GraphQL query to fetch a document with its texts, tables, and images
 */
const Q_GET_DOCUMENT_WITH_ENTITIES = `
  query GetDocumentWithEntities($id: ID!) {
    getDocument(id: $id) {
      id
      entityType
      tenantId
      ownerId
      createdAt
      updatedAt
      s3Bucket
      s3Key
      mimeType
      sizeBytes
      texts(limit: 100) {
        items {
          id
          entityType
          tenantId
          ownerId
          createdAt
          updatedAt
          deletedAt
          parentId
          pageNum
          text
        }
        nextToken
      }
      tables(limit: 100) {
        items {
          id
          entityType
          tenantId
          ownerId
          createdAt
          updatedAt
          deletedAt
          parentId
          pageNum
          description
        }
        nextToken
      }
      images(limit: 100) {
        items {
          id
          entityType
          tenantId
          ownerId
          createdAt
          updatedAt
          deletedAt
          s3Bucket
          s3Key
          mimeType
          sizeBytes
          parentId
          pageNum
          imageId
          topLeftX
          topLeftY
          bottomRightX
          bottomRightY
          imageAnnotation
        }
        nextToken
      }
    }
  }
`;

interface DocumentWithEntities {
	id: string;
	texts?: { items: Text[]; nextToken?: string };
	tables?: { items: Table[]; nextToken?: string };
	images?: { items: Image[]; nextToken?: string };
}

export type DocumentEntitiesManagerOptions = {
	/** The user's authentication token required for GraphQL requests. */
	idToken: string;
	/** The project ID to associate entities with in the store. */
	projectId: string;
	/** List of document IDs (SHA256 hashes) to fetch entities for. */
	documentIds: string[];
};

type ManagerStatus = 'inactive' | 'loading' | 'ready' | 'error';

interface FetchResult {
	texts: Text[];
	tables: Table[];
	images: Image[];
}

export class DocumentEntitiesSyncManager {
	private idToken: string | null = null;
	private projectId: string | null = null;
	private documentIds: string[] = [];

	// --- Operational State ---
	private _status: ManagerStatus = 'inactive';
	private _error: string | null = null;

	private constructor() {}

	/**
	 * Creates an instance of the manager without initializing it.
	 */
	static createInactive(): DocumentEntitiesSyncManager {
		return new DocumentEntitiesSyncManager();
	}

	/**
	 * Creates and initializes an instance of the manager, fetching all entities.
	 */
	static async create(options: DocumentEntitiesManagerOptions): Promise<DocumentEntitiesSyncManager> {
		const manager = new DocumentEntitiesSyncManager();
		await manager.fetchAll(options);
		return manager;
	}

	/**
	 * Fetches all entities (texts, tables, images) for a single document using getDocument query.
	 */
	private async fetchEntitiesForDocument(documentId: string): Promise<FetchResult> {
		if (!this.idToken) {
			throw new Error('idToken is required');
		}

		try {
			const result = await gql<{ getDocument: DocumentWithEntities | null }>(
				Q_GET_DOCUMENT_WITH_ENTITIES,
				{ id: documentId },
				this.idToken
			);

			const document = result.getDocument;
			if (!document) {
				console.warn(`Document ${documentId} not found`);
				return { texts: [], tables: [], images: [] };
			}

			return {
				texts: document.texts?.items ?? [],
				tables: document.tables?.items ?? [],
				images: document.images?.items ?? []
			};
		} catch (err) {
			console.warn(`Failed to fetch document ${documentId} with entities:`, err);
			return { texts: [], tables: [], images: [] };
		}
	}

	/**
	 * Fetches all entities for all documents and populates the store.
	 */
	async fetchAll(options: DocumentEntitiesManagerOptions): Promise<void> {
		if (!browser) return;

		const { idToken, projectId, documentIds } = options;

		if (!idToken) {
			throw new Error('DocumentEntitiesSyncManager requires an idToken.');
		}

		if (!projectId) {
			throw new Error('DocumentEntitiesSyncManager requires a projectId.');
		}

		this.idToken = idToken;
		this.projectId = projectId;
		this.documentIds = documentIds;
		this._status = 'loading';
		this._error = null;

		try {
			// Clear existing entities before fetching fresh data
			clearProjectEntities(projectId);

			if (documentIds.length === 0) {
				this._status = 'ready';
				return;
			}

			// Fetch entities for all documents in parallel
			const results = await Promise.all(
				documentIds.map(docId => this.fetchEntitiesForDocument(docId))
			);

			// Add all fetched entities to the store
			for (const result of results) {
				for (const text of result.texts) {
					addProjectText(projectId, text);
				}
				for (const table of result.tables) {
					addProjectTable(projectId, table);
				}
				for (const image of result.images) {
					addProjectImage(projectId, image);
				}
			}

			this._status = 'ready';
		} catch (err) {
			console.error('Failed to fetch document entities:', err);
			this._error = err instanceof Error ? err.message : 'Failed to load document entities';
			this._status = 'error';
			throw err;
		}
	}

	/**
	 * Refetch entities for all documents (useful for refresh).
	 */
	async refresh(): Promise<void> {
		if (!this.idToken || !this.projectId) {
			throw new Error('Manager not initialized. Call fetchAll first.');
		}

		await this.fetchAll({
			idToken: this.idToken,
			projectId: this.projectId,
			documentIds: this.documentIds
		});
	}

	/**
	 * Add a new document and fetch its entities.
	 */
	async addDocument(documentId: string): Promise<void> {
		if (!this.idToken || !this.projectId) {
			throw new Error('Manager not initialized. Call fetchAll first.');
		}

		if (this.documentIds.includes(documentId)) {
			return; // Already tracking this document
		}

		this.documentIds.push(documentId);

		try {
			const result = await this.fetchEntitiesForDocument(documentId);

			for (const text of result.texts) {
				addProjectText(this.projectId, text);
			}
			for (const table of result.tables) {
				addProjectTable(this.projectId, table);
			}
			for (const image of result.images) {
				addProjectImage(this.projectId, image);
			}
		} catch (err) {
			console.error(`Failed to fetch entities for document ${documentId}:`, err);
			throw err;
		}
	}

	/**
	 * Cleans up resources.
	 */
	cleanup(): void {
		if (this.projectId) {
			clearProjectEntities(this.projectId);
		}
		this.idToken = null;
		this.projectId = null;
		this.documentIds = [];
		this._status = 'inactive';
		this._error = null;
	}

	/** The current operational status of the manager. */
	get status(): ManagerStatus {
		return this._status;
	}

	/** Returns true if the manager is successfully initialized and ready. */
	get isReady(): boolean {
		return this._status === 'ready';
	}

	/** Returns true if an async operation is currently in progress. */
	get isLoading(): boolean {
		return this._status === 'loading';
	}

	/** Returns the error message from the last failed operation, if any. */
	get lastError(): string | null {
		return this._error;
	}
}
