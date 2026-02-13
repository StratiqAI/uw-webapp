/**
 * Store for Deal Room sample/demo data.
 * When enabled, deal room components use this data instead of calling the API.
 */

import { getSampleData, type SampleData } from '$lib/deal-room/sampleData';

const state = $state<{
	enabled: boolean;
	projectId: string | null;
	data: SampleData | null;
}>({
	enabled: false,
	projectId: null,
	data: null
});

export const dealRoomSampleStore = {
	get enabled() {
		return state.enabled;
	},
	get projectId() {
		return state.projectId;
	},
	get data() {
		return state.data;
	},

	/** Populate and enable sample data for the given project. */
	enable(projectId: string) {
		state.data = getSampleData(projectId);
		state.projectId = projectId;
		state.enabled = true;
	},

	/** Disable sample data; components will use API again. */
	disable() {
		state.enabled = false;
		state.projectId = null;
		state.data = null;
	},

	/** True when sample data is enabled and for this projectId. */
	isActive(projectId: string) {
		return state.enabled && state.projectId === projectId && state.data !== null;
	}
};
