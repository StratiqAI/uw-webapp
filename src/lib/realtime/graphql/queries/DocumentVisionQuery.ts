/**
 * Vision RAG: query Pinecone by documentIds (from Project doclinks), then Gemini with images.
 * Mirrors Q_DOCUMENT_VISION_QUERY from @stratiqai/types-simple when that package is updated.
 */
export const Q_DOCUMENT_VISION_QUERY = `
  query DocumentVisionQuery($input: DocumentVisionQueryInput!) {
    documentVisionQuery(input: $input) {
      answer
      structuredOutput
      matchCount
    }
  }
`;
