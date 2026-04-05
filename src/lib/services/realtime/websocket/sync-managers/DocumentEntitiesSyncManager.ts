/**
 * DocumentEntitiesSyncManager
 * 
 * Manages fetching and syncing document entities (texts, tables, images) for a project.
 * This manager fetches documents with their nested entities using getDocument query
 * and populates the projectEntitiesStore.
 */

import { browser } from '$app/environment';
import type { Text, Table, Image } from '@stratiqai/types-simple';
import { S_ON_CREATE_TEXT, S_ON_CREATE_TABLE, S_ON_CREATE_IMAGE } from '@stratiqai/types-simple';
import { print } from 'graphql';
import { gql } from '$lib/services/realtime/graphql/requestHandler';
import {
	addProjectText,
	addProjectTable,
	addProjectImage,
	setProjectEntities,
	clearProjectEntities
} from '$lib/stores/projectEntitiesStore';
import { addSubscription, removeSubscription, ensureConnection } from '$lib/stores/appSyncClientStore';
import type { SubscriptionSpec } from '$lib/services/realtime/websocket/types';
import { createLogger } from '$lib/utils/logger';

const log = createLogger('documents');

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
	private subscriptionSpecs: SubscriptionSpec<any>[] = [];

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
				log.warn(`Document ${documentId} not found`);
				return { texts: [], tables: [], images: [] };
			}

			return {
				texts: document.texts?.items ?? [],
				tables: document.tables?.items ?? [],
				images: document.images?.items ?? []
			};
		} catch (err) {
			log.warn(`Failed to fetch document ${documentId} with entities:`, err);
			return { texts: [], tables: [], images: [] };
		}
	}

	/**
	 * Sets up real-time WebSocket subscriptions for a document so new entities
	 * created during cloud processing are pushed into the store automatically.
	 */
	private async setupSubscriptionsForDocument(documentId: string): Promise<void> {
		if (!this.idToken || !this.projectId) return;

		const projectId = this.projectId;

		const specs: SubscriptionSpec<any>[] = [
			{
				query: print(S_ON_CREATE_TEXT),
				variables: { parentId: documentId },
				path: 'onCreateText',
				next: (text: Text) => {
					if (projectId) addProjectText(projectId, text);
				},
				error: (err: any) => {
					log.error(`[DocumentEntitiesSyncManager] Text subscription error for ${documentId}:`, err);
				}
			},
			{
				query: print(S_ON_CREATE_TABLE),
				variables: { parentId: documentId },
				path: 'onCreateTable',
				next: (table: Table) => {
					if (projectId) addProjectTable(projectId, table);
				},
				error: (err: any) => {
					log.error(`[DocumentEntitiesSyncManager] Table subscription error for ${documentId}:`, err);
				}
			},
			{
				query: print(S_ON_CREATE_IMAGE),
				variables: { parentId: documentId },
				path: 'onCreateImage',
				next: (image: Image) => {
					if (projectId) addProjectImage(projectId, image);
				},
				error: (err: any) => {
					log.error(`[DocumentEntitiesSyncManager] Image subscription error for ${documentId}:`, err);
				}
			}
		];

		try {
			await ensureConnection(this.idToken);
			for (const spec of specs) {
				await addSubscription(this.idToken, spec);
			}
			this.subscriptionSpecs.push(...specs);
		} catch (err) {
			log.error(`[DocumentEntitiesSyncManager] Failed to set up subscriptions for ${documentId}:`, err);
		}
	}

	/**
	 * Removes all active subscriptions.
	 */
	private teardownSubscriptions(): void {
		for (const spec of this.subscriptionSpecs) {
			removeSubscription(spec);
		}
		this.subscriptionSpecs = [];
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
			this.teardownSubscriptions();

			if (documentIds.length === 0) {
				clearProjectEntities(projectId);
				this._status = 'ready';
				return;
			}

			const results = await Promise.all(
				documentIds.map(docId => this.fetchEntitiesForDocument(docId))
			);

			// Batch all fetched entities into a single store write
			const allTexts: Text[] = [];
			const allTables: Table[] = [];
			const allImages: Image[] = [];
			for (const result of results) {
				allTexts.push(...result.texts);
				allTables.push(...result.tables);
				allImages.push(...result.images);
			}
			setProjectEntities(projectId, {
				texts: allTexts,
				tables: allTables,
				images: allImages
			});

			await Promise.all(
				documentIds.map(docId => this.setupSubscriptionsForDocument(docId))
			);

			this._status = 'ready';
		} catch (err) {
			log.error('Failed to fetch document entities:', err);
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

			await this.setupSubscriptionsForDocument(documentId);
		} catch (err) {
			log.error(`Failed to fetch entities for document ${documentId}:`, err);
			throw err;
		}
	}

	/**
	 * Cleans up resources.
	 */
	cleanup(): void {
		this.teardownSubscriptions();
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
