import { writable } from 'svelte/store';
import type { Project, Document } from '@stratiqai/types';

// Create writable stores for project state
export const project = writable<Project | null>(null);
export const documents = writable<Document[]>();
export const loading = writable(false);
export const error = writable<string | null>(null);

// Helper functions to update the stores
export const setProject = (projectData: Project) => {
	project.set(projectData);
	error.set(null);
};

export const updateProject = (updates: Partial<Project>) => {
	project.update(currentProject => {
		if (currentProject) {
			return { ...currentProject, ...updates };
		}
		return currentProject;
	});
};

export const setDocuments = (docs: Document[]) => {
	documents.set(docs);
};

// Helper functions to update documents in the store
export const addDocument = (newDocument: Document) => {
	documents.update(currentDocs => {
		const existingIndex = currentDocs.findIndex(doc => doc.id === newDocument.id);
		if (existingIndex >= 0) {
			// Update existing document
			const updated = [...currentDocs];
			updated[existingIndex] = { ...updated[existingIndex], ...newDocument };
			return updated;
		} else {
			// Add new document
			return [...currentDocs, newDocument];
		}
	});
};

// export const addPageToDocument = (docHash: string, newPage: Page) => {
// 	documents.update(currentDocs => {
// 		return currentDocs.map(doc => {
// 			if (doc.id === docHash) {
// 				const existingPages = doc.pages?.items || [];
// 				const existingIndex = existingPages.findIndex(page => page.id === newPage.id);
				
// 				let updatedPages;
// 				if (existingIndex >= 0) {
// 					// Update existing page
// 					updatedPages = [...existingPages];
// 					updatedPages[existingIndex] = { ...updatedPages[existingIndex], ...newPage };
// 				} else {
// 					// Add new page
// 					updatedPages = [...existingPages, newPage];
// 				}
				
// 				return {
// 					...doc,
// 					pages: { items: updatedPages }
// 				};
// 			}
// 			return doc;
// 		});
// 	});
// };

// export const addTextToDocument = (docHash: string, newText: Text) => {
// 	documents.update(currentDocs => {
// 		return currentDocs.map(doc => {
// 			if (doc.docHash === docHash) {
// 				const existingTexts = doc.texts?.items || [];
// 				const existingIndex = existingTexts.findIndex(text => text.id === newText.id);
				
// 				let updatedTexts;
// 				if (existingIndex >= 0) {
// 					// Update existing text
// 					updatedTexts = [...existingTexts];
// 					updatedTexts[existingIndex] = { ...updatedTexts[existingIndex], ...newText };
// 				} else {
// 					// Add new text
// 					updatedTexts = [...existingTexts, newText];
// 				}
				
// 				return {
// 					...doc,
// 					texts: { items: updatedTexts }
// 				};
// 			}
// 			return doc;
// 		});
// 	});
// };

// export const addImageToDocument = (docHash: string, newImage: Image) => {
// 	documents.update(currentDocs => {
// 		return currentDocs.map(doc => {
// 			if (doc.docHash === docHash) {
// 				// For now, we'll store images in a separate property
// 				// This might need to be adjusted based on your Document type structure
// 				const existingImages = (doc as any).images?.items || [];
// 				const existingIndex = existingImages.findIndex(image => image.id === newImage.id);
				
// 				let updatedImages;
// 				if (existingIndex >= 0) {
// 					// Update existing image
// 					updatedImages = [...existingImages];
// 					updatedImages[existingIndex] = { ...updatedImages[existingIndex], ...newImage };
// 				} else {
// 					// Add new image
// 					updatedImages = [...existingImages, newImage];
// 				}
				
// 				return {
// 					...doc,
// 					images: { items: updatedImages }
// 				};
// 			}
// 			return doc;
// 		});
// 	});
// };

// export const addInsightToDocument = (docHash: string, newInsight: Insight) => {
// 	documents.update(currentDocs => {
// 		return currentDocs.map(doc => {
// 			if (doc.docHash === docHash) {
// 				const existingInsights = doc.insights?.items || [];
// 				const existingIndex = existingInsights.findIndex(insight => insight.hash === newInsight.hash);
				
// 				let updatedInsights;
// 				if (existingIndex >= 0) {
// 					// Update existing insight
// 					updatedInsights = [...existingInsights];
// 					updatedInsights[existingIndex] = { ...updatedInsights[existingIndex], ...newInsight };
// 				} else {
// 					// Add new insight
// 					updatedInsights = [...existingInsights, newInsight];
// 				}
				
// 				return {
// 					...doc,
// 					insights: { items: updatedInsights }
// 				};
// 			}
// 			return doc;
// 		});
// 	});
// };

// export const setLoading = (loadingState: boolean) => {
// 	loading.set(loadingState);
// };

// export const setError = (errorMessage: string | null) => {
// 	error.set(errorMessage);
// 	loading.set(false);
// };

// export const clear = () => {
// 	project.set(null);
// 	loading.set(false);
// 	error.set(null);
// };
