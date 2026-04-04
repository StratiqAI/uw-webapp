export const Q_INSIGHT_BY_DOCHASH = `
    query listInsightsByDocument($docHash: ID!) {
        listInsightsByDocument(
            docHash: $docHash
        ) {
            items {
                category
                name
                value
                confidence
                pageId
            }
        }
    }`
;