/**
 * DocumentEntitiesSyncManager
 *
 * Manages fetching and syncing document entities (texts, tables, images) for a project.
 *
 * Now uses the unified wsClient.ts singleton (via BaseSyncManager) and publishes
 * all data to ValidatedTopicStore instead of the legacy projectEntitiesStore.
 *
 * Topic paths:
 *   documents/{projectId}/{docId}/texts/{textId}
 *   documents/{projectId}/{docId}/tables/{tableId}
 *   documents/{projectId}/{docId}/images/{imageId}
 */

import { browser } from '$app/environment';
import type { Text, Table, Image } from '@stratiqai/types-simple';
import { S_ON_CREATE_TEXT, S_ON_CREATE_TABLE, S_ON_CREATE_IMAGE } from '@stratiqai/types-simple';
import { print } from 'graphql';
import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
import type { SubscriptionSpec } from '../types';
import { BaseSyncManager, type BaseSyncManagerOptions } from './BaseSyncManager';
import { createLogger } from '$lib/utils/logger';

const log = createLogger('documents');

export const store = validatedTopicStore;

// ── Topic path helpers ──────────────────────────────────────────────

function textTopic(projectId: string, docId: string, textId: string): string {
	return `documents/${projectId}/${docId}/texts/${textId}`;
}

function tableTopic(projectId: string, docId: string, tableId: string): string {
	return `documents/${projectId}/${docId}/tables/${tableId}`;
}

function imageTopic(projectId: string, docId: string, imageId: string): string {
	return `documents/${projectId}/${docId}/images/${imageId}`;
}

function documentBaseTopic(projectId: string): string {
	return `documents/${projectId}`;
}

// ── Inline query (kept local to this manager) ───────────────────────

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
          id entityType tenantId ownerId createdAt updatedAt deletedAt parentId pageNum text
        }
        nextToken
      }
      tables(limit: 100) {
        items {
          id entityType tenantId ownerId createdAt updatedAt deletedAt parentId pageNum description
        }
        nextToken
      }
      images(limit: 100) {
        items {
          id entityType tenantId ownerId createdAt updatedAt deletedAt
          s3Bucket s3Key mimeType sizeBytes parentId pageNum imageId
          topLeftX topLeftY bottomRightX bottomRightY imageAnnotation
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

export interface DocumentEntitiesManagerOptions extends BaseSyncManagerOptions {
	projectId: string;
	documentIds: string[];
}

interface FetchResult {
	texts: Text[];
	tables: Table[];
	images: Image[];
}

export class DocumentEntitiesSyncManager extends BaseSyncManager {
	private projectId: string | null = null;
	private documentIds: string[] = [];
	private subscriptionSpecs: SubscriptionSpec<any>[] = [];

	protected get managerName() {
		return 'DocumentEntitiesSyncManager';
	}

	private constructor() {
		super();
	}

	static createInactive(): DocumentEntitiesSyncManager {
		return new DocumentEntitiesSyncManager();
	}

	static async create(options: DocumentEntitiesManagerOptions): Promise<DocumentEntitiesSyncManager> {
		const manager = new DocumentEntitiesSyncManager();
		await manager.initialize(options);
		return manager;
	}

	protected async doInitialize(options: DocumentEntitiesManagerOptions): Promise<void> {
		if (!browser) return;

		const { projectId, documentIds } = options;
		if (!projectId) throw new Error('DocumentEntitiesSyncManager requires a projectId.');

		this.projectId = projectId;
		this.documentIds = documentIds;

		await this.fetchAndPublishAll();
	}

	protected doCleanup(): void {
		this.teardownSubscriptions();
		if (this.projectId) {
			store.clearAllAt(documentBaseTopic(this.projectId));
		}
		this.projectId = null;
		this.documentIds = [];
	}

	protected async doRefetch(): Promise<void> {
		if (!this.projectId) return;
		await this.fetchAndPublishAll();
	}

	// ── Fetch & publish ───────────────────────────────────────────────

	private async fetchAndPublishAll(): Promise<void> {
		if (!this.projectId) return;

		this.teardownSubscriptions();

		if (this.documentIds.length === 0) {
			store.clearAllAt(documentBaseTopic(this.projectId));
			return;
		}

		const results = await Promise.all(
			this.documentIds.map((docId) => this.fetchEntitiesForDocument(docId))
		);

		const projectId = this.projectId;
		for (let i = 0; i < this.documentIds.length; i++) {
			const docId = this.documentIds[i];
			const result = results[i];

			for (const text of result.texts) {
				store.publish(textTopic(projectId, docId, text.id), text, { source: 'http' });
			}
			for (const table of result.tables) {
				store.publish(tableTopic(projectId, docId, table.id), table, { source: 'http' });
			}
			for (const image of result.images) {
				store.publish(imageTopic(projectId, docId, image.id), image, { source: 'http' });
			}
		}

		await Promise.all(
			this.documentIds.map((docId) => this.setupSubscriptionsForDocument(docId))
		);
	}

	private async fetchEntitiesForDocument(documentId: string): Promise<FetchResult> {
		try {
			const result = await this.queryClient!.query<{ getDocument: DocumentWithEntities | null }>(
				Q_GET_DOCUMENT_WITH_ENTITIES,
				{ id: documentId }
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

	// ── Subscriptions ─────────────────────────────────────────────────

	private async setupSubscriptionsForDocument(documentId: string): Promise<void> {
		if (!this.subscriptionClient || !this.projectId) return;

		const projectId = this.projectId;

		const specs: SubscriptionSpec<any>[] = [
			{
				query: print(S_ON_CREATE_TEXT),
				variables: { parentId: documentId },
				path: 'onCreateText',
				next: (text: Text) => {
					if (projectId) {
						store.publish(textTopic(projectId, documentId, text.id), text);
					}
				},
				error: (err: unknown) => {
					log.error(`Text subscription error for ${documentId}:`, err);
				}
			},
			{
				query: print(S_ON_CREATE_TABLE),
				variables: { parentId: documentId },
				path: 'onCreateTable',
				next: (table: Table) => {
					if (projectId) {
						store.publish(tableTopic(projectId, documentId, table.id), table);
					}
				},
				error: (err: unknown) => {
					log.error(`Table subscription error for ${documentId}:`, err);
				}
			},
			{
				query: print(S_ON_CREATE_IMAGE),
				variables: { parentId: documentId },
				path: 'onCreateImage',
				next: (image: Image) => {
					if (projectId) {
						store.publish(imageTopic(projectId, documentId, image.id), image);
					}
				},
				error: (err: unknown) => {
					log.error(`Image subscription error for ${documentId}:`, err);
				}
			}
		];

		for (const spec of specs) {
			this.subscriptionClient.addSubscription(spec);
		}
		this.subscriptionSpecs.push(...specs);
	}

	private teardownSubscriptions(): void {
		if (this.subscriptionClient) {
			for (const spec of this.subscriptionSpecs) {
				this.subscriptionClient.removeSubscription(spec);
			}
		}
		this.subscriptionSpecs = [];
	}

	// ── Public helpers ────────────────────────────────────────────────

	async refresh(): Promise<void> {
		if (!this.projectId) {
			throw new Error('Manager not initialized.');
		}
		await this.fetchAndPublishAll();
	}

	async addDocument(documentId: string): Promise<void> {
		if (!this.projectId) {
			throw new Error('Manager not initialized.');
		}

		if (this.documentIds.includes(documentId)) return;
		this.documentIds.push(documentId);

		const result = await this.fetchEntitiesForDocument(documentId);
		const projectId = this.projectId;

		for (const text of result.texts) {
			store.publish(textTopic(projectId, documentId, text.id), text, { source: 'http' });
		}
		for (const table of result.tables) {
			store.publish(tableTopic(projectId, documentId, table.id), table, { source: 'http' });
		}
		for (const image of result.images) {
			store.publish(imageTopic(projectId, documentId, image.id), image, { source: 'http' });
		}

		await this.setupSubscriptionsForDocument(documentId);
	}
}
