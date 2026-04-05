/**
 * Deal Room (Investor VDR) service: GraphQL operations with fallbacks for demo when backend is unavailable.
 */

import { gql } from '$lib/services/realtime/graphql/requestHandler';
import type {
  NDAAgreement,
  Invitation,
  Question,
  Announcement,
  BuyerEngagement,
  DocumentAnalytics,
  MatchScore,
  DocumentSearchResult,
  DealProject
} from './types';
import { createLogger } from '$lib/utils/logger';

const log = createLogger('dealRoom');

const DEAL_FIELDS = `
  id name description status
  headline summary photoUrls mapEmbedUrl
  brokerContactName brokerContactEmail brokerContactPhone
  logoUrl primaryColor secondaryColor dealTags
`;

export interface DealRoomResult<T> {
  data: T;
  fromFallback: boolean;
  error?: string;
}

async function withFallback<T>(
  fn: () => Promise<T>,
  fallback: T
): Promise<DealRoomResult<T>> {
  try {
    const data = await fn();
    return { data, fromFallback: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn('Backend call failed, using fallback:', message);
    return { data: fallback, fromFallback: true, error: message };
  }
}

export async function getDealProject(
  projectId: string,
  idToken: string
): Promise<DealRoomResult<DealProject | null>> {
  const query = `
    query GetDealProject($id: ID!) {
      getProject(id: $id) {
        ${DEAL_FIELDS}
      }
    }
  `;
  return withFallback(
    async () => {
      const res = await gql<{ getProject: DealProject | null }>(query, { id: projectId }, idToken);
      return res?.getProject ?? null;
    },
    {
      id: projectId,
      name: 'Deal Room',
      headline: 'Sample Commercial Deal',
      summary: 'Demo deal room. Connect the backend to see live data.',
      photoUrls: [],
      brokerContactName: 'Broker Name',
      brokerContactEmail: 'broker@example.com',
      status: 'ACTIVE'
    }
  );
}

export async function listNDAAgreements(
  parentId: string,
  idToken: string
): Promise<DealRoomResult<NDAAgreement[]>> {
  const query = `
    query ListNDAAgreements($parentId: ID!) {
      listNDAAgreements(parentId: $parentId) {
        items { id parentId ownerId status signedAt signedDocumentId createdAt updatedAt }
        nextToken
      }
    }
  `;
  return withFallback(
    async () => {
      const res = await gql<{ listNDAAgreements: { items: NDAAgreement[] } }>(
        query,
        { parentId },
        idToken
      );
      return res?.listNDAAgreements?.items ?? [];
    },
    []
  );
}

export async function updateNDAAgreement(
  key: { id: string; parentId: string },
  input: { status?: string; signedDocumentId?: string },
  idToken: string
): Promise<DealRoomResult<NDAAgreement | null>> {
  const mutation = `
    mutation UpdateNDAAgreement($key: CompositeKeyInput!, $input: UpdateNDAAgreementInput!) {
      updateNDAAgreement(key: $key, input: $input) {
        id parentId ownerId status signedAt signedDocumentId createdAt updatedAt
      }
    }
  `;
  return withFallback(
    async () => {
      const res = await gql<{ updateNDAAgreement: NDAAgreement }>(
        mutation,
        { key, input },
        idToken
      );
      return res?.updateNDAAgreement ?? null;
    },
    null
  );
}

export async function listInvitations(
  parentId: string,
  idToken: string
): Promise<DealRoomResult<Invitation[]>> {
  const query = `
    query ListInvitations($parentId: ID!) {
      listInvitations(parentId: $parentId) {
        items { id parentId email status role createdAt updatedAt }
        nextToken
      }
    }
  `;
  return withFallback(
    async () => {
      const res = await gql<{ listInvitations: { items: Invitation[] } }>(
        query,
        { parentId },
        idToken
      );
      return res?.listInvitations?.items ?? [];
    },
    [
      { id: 'demo-1', parentId, email: 'buyer@example.com', status: 'SENT', role: 'BUYER' }
    ]
  );
}

export async function listQuestions(
  parentId: string,
  idToken: string
): Promise<DealRoomResult<Question[]>> {
  const query = `
    query ListQuestions($parentId: ID!) {
      listQuestions(parentId: $parentId) {
        items { id parentId authorId questionText isPublic documentId createdAt updatedAt }
        nextToken
      }
    }
  `;
  return withFallback(
    async () => {
      const res = await gql<{ listQuestions: { items: Question[] } }>(
        query,
        { parentId },
        idToken
      );
      return res?.listQuestions?.items ?? [];
    },
    [
      {
        id: 'demo-q1',
        parentId,
        authorId: 'user',
        title: 'Sample question',
        body: 'This is a demo Q&A. Backend will show real questions.',
        isPublic: true,
        createdAt: new Date().toISOString()
      }
    ]
  );
}

export async function listAnnouncements(
  parentId: string,
  idToken: string
): Promise<DealRoomResult<Announcement[]>> {
  const query = `
    query ListAnnouncements($parentId: ID!) {
      listAnnouncements(parentId: $parentId) {
        items { id parentId body createdAt updatedAt }
        nextToken
      }
    }
  `;
  return withFallback(
    async () => {
      const res = await gql<{ listAnnouncements: { items: Announcement[] } }>(
        query,
        { parentId },
        idToken
      );
      return res?.listAnnouncements?.items ?? [];
    },
    [
      {
        id: 'demo-a1',
        parentId,
        title: 'Welcome to the Deal Room',
        body: 'Demo announcement. Connect backend for live updates.',
        createdAt: new Date().toISOString()
      }
    ]
  );
}

export async function listBuyerEngagements(
  dealId: string,
  idToken: string
): Promise<DealRoomResult<BuyerEngagement[]>> {
  const query = `
    query ListBuyerEngagements($dealId: ID!) {
      listBuyerEngagements(dealId: $dealId) {
        dealId userId totalTimeSeconds documentViewCount downloadCount lastActiveAt
      }
    }
  `;
  return withFallback(
    async () => {
      const res = await gql<{ listBuyerEngagements: BuyerEngagement[] }>(
        query,
        { dealId },
        idToken
      );
      return res?.listBuyerEngagements ?? [];
    },
    [
      {
        dealId,
        userId: 'user-1',
        documentViewCount: 12,
        downloadCount: 2,
        lastActiveAt: new Date().toISOString()
      }
    ]
  );
}

export async function getDocumentAnalytics(
  dealId: string,
  documentId: string,
  idToken: string
): Promise<DealRoomResult<DocumentAnalytics | null>> {
  const query = `
    query GetDocumentAnalytics($dealId: ID!, $documentId: ID!) {
      getDocumentAnalytics(dealId: $dealId, documentId: $documentId) {
        dealId documentId viewCount downloadCount uniqueViewerCount
      }
    }
  `;
  return withFallback(
    async () => {
      const res = await gql<{ getDocumentAnalytics: DocumentAnalytics | null }>(
        query,
        { dealId, documentId },
        idToken
      );
      return res?.getDocumentAnalytics ?? null;
    },
    { dealId, documentId, viewCount: 0, downloadCount: 0, uniqueViewerCount: 0 }
  );
}

export async function listMatchScores(
  parentId: string,
  idToken: string
): Promise<DealRoomResult<MatchScore[]>> {
  const query = `
    query ListMatchScores($parentId: ID!) {
      listMatchScores(parentId: $parentId) {
        items { id parentId investorProfileId score rationale suggestedAction createdAt }
        nextToken
      }
    }
  `;
  return withFallback(
    async () => {
      const res = await gql<{ listMatchScores: { items: MatchScore[] } }>(
        query,
        { parentId },
        idToken
      );
      return res?.listMatchScores?.items ?? [];
    },
    []
  );
}

export async function searchDocuments(
  dealId: string,
  queryText: string,
  idToken: string,
  limit = 20
): Promise<DealRoomResult<DocumentSearchResult[]>> {
  const query = `
    query SearchDocuments($dealId: ID!, $query: String!, $limit: Int) {
      searchDocuments(dealId: $dealId, query: $query, limit: $limit) {
        documentId pageNum snippet
      }
    }
  `;
  return withFallback(
    async () => {
      const res = await gql<{ searchDocuments: DocumentSearchResult[] }>(
        query,
        { dealId, query: queryText, limit },
        idToken
      );
      return res?.searchDocuments ?? [];
    },
    []
  );
}

export async function createQuestion(
  input: { parentId: string; authorId?: string; questionText: string; documentId?: string; isPublic?: boolean },
  idToken: string
): Promise<DealRoomResult<Question | null>> {
  const mutation = `
    mutation CreateQuestion($input: CreateQuestionInput!) {
      createQuestion(input: $input) {
        id parentId authorId questionText isPublic documentId createdAt updatedAt
      }
    }
  `;
  return withFallback(
    async () => {
      const res = await gql<{ createQuestion: Question }>(mutation, { input }, idToken);
      return res?.createQuestion ?? null;
    },
    null
  );
}

export async function createAnnouncement(
  input: { parentId: string; body: string },
  idToken: string
): Promise<DealRoomResult<Announcement | null>> {
  const mutation = `
    mutation CreateAnnouncement($input: CreateAnnouncementInput!) {
      createAnnouncement(input: $input) {
        id parentId body createdAt updatedAt
      }
    }
  `;
  return withFallback(
    async () => {
      const res = await gql<{ createAnnouncement: Announcement }>(mutation, { input }, idToken);
      return res?.createAnnouncement ?? null;
    },
    null
  );
}

export async function createInvitation(
  input: { parentId: string; email: string; role?: string },
  idToken: string
): Promise<DealRoomResult<Invitation | null>> {
  const mutation = `
    mutation CreateInvitation($input: CreateInvitationInput!) {
      createInvitation(input: $input) {
        id parentId email status role createdAt updatedAt
      }
    }
  `;
  return withFallback(
    async () => {
      const res = await gql<{ createInvitation: Invitation }>(mutation, { input }, idToken);
      return res?.createInvitation ?? null;
    },
    null
  );
}
