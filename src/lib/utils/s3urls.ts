import type { DocumentAndPages } from "$lib/types/cloud/Document";

export function getPageS3Url(s3Bucket: string, docHash: string, pageNumber: number) {
  return `https://${s3Bucket}.s3.us-west-2.amazonaws.com/${docHash}/pages/${pageNumber}.pdf`;
}

/**
 * Given a document object with pages and S3 info, returns an array of S3 URLs for each page.
 * @param {object} data - The document data object.
 * @returns {Array<{url: string, id: string, docHash: string, pageNumber: number}>}
 */
export function getPageS3Urls(data: DocumentAndPages) {
  if (!data?.pages?.items || !data.s3Bucket || !data.docHash) return [];
  return data.pages.items.map(page => ({
    url: getPageS3Url(data.s3Bucket, data.docHash, page.pageNumber),
    id: page.id,
    docHash: page.docHash,
    pageNumber: page.pageNumber
  }));
}
