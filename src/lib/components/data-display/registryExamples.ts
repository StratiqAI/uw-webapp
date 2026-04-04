/**
 * Example Component Registrations
 * 
 * This file demonstrates how to register custom components
 * for specific schemas or topic patterns.
 * 
 * Import this file in your app initialization to register components.
 */

import { uiRegistry } from '$lib/stores/componentRegistry';
// import PropertyCard from '$lib/components/custom/PropertyCard.svelte';
// import ProFormaEditor from '$lib/components/custom/ProFormaEditor.svelte';
// import AlertBanner from '$lib/components/custom/AlertBanner.svelte';

/**
 * Register custom components for specific schemas
 */
export function registerCustomComponents() {
	// Example: Register a Property Card component for property schema
	// uiRegistry.register('cre:property', PropertyCard, {
	// 	showActions: true,
	// 	compact: false
	// });

	// Example: Register a Pro Forma Editor for financial schemas
	// uiRegistry.register('cre:financials', ProFormaEditor, {
	// 	editable: true,
	// 	showCharts: true
	// });

	// Example: Register a pattern-based component for system alerts
	// uiRegistry.registerPattern(/^sys:alert:/, AlertBanner, {
	// 	dismissible: true,
	// 	autoHide: false
	// });

	// Example: Register for a specific topic pattern
	// uiRegistry.registerPattern(/^prop:\d+$/, PropertyCard, {
	// 	showActions: false
	// });
}

/**
 * Initialize component registry
 * Call this during app startup
 */
export function initializeComponentRegistry() {
	registerCustomComponents();
	console.log('[ComponentRegistry] Registered schemas:', uiRegistry.getRegisteredSchemas());
}

