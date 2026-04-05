/**
 * Deal Room (Investor VDR) types for UI and API responses.
 * Align with GraphQL schema; use fallbacks when backend is unavailable.
 */

export type NDAStatus = 'PENDING' | 'SIGNED';

export interface NDAAgreement {
  id: string;
  parentId: string;
  ownerId?: string;
  status: NDAStatus;
  signedAt?: string | null;
  signedDocumentId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Invitation {
  id: string;
  parentId: string;
  email?: string;
  status?: string;
  role?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Question {
  id: string;
  parentId: string;
  authorId?: string;
  questionText?: string;
  isPublic?: boolean;
  documentId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Announcement {
  id: string;
  parentId: string;
  body?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BuyerEngagement {
  dealId: string;
  userId: string;
  totalTimeSeconds?: number | null;
  documentViewCount: number;
  downloadCount: number;
  lastActiveAt?: string | null;
}

export interface DocumentAnalytics {
  dealId: string;
  documentId: string;
  viewCount: number;
  downloadCount: number;
  uniqueViewerCount?: number;
}

export interface MatchScore {
  id: string;
  parentId: string;
  investorProfileId?: string;
  score?: number;
  rationale?: string | null;
  suggestedAction?: string | null;
  createdAt?: string;
}

export interface DocumentSearchResult {
  documentId: string;
  pageNum: number;
  snippet: string;
}

export interface DealProject {
  id: string;
  name?: string;
  description?: string;
  headline?: string | null;
  summary?: string | null;
  photoUrls?: string[] | null;
  mapEmbedUrl?: string | null;
  brokerContactName?: string | null;
  brokerContactEmail?: string | null;
  brokerContactPhone?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  dealTags?: Record<string, unknown> | null;
  status?: string;
}
