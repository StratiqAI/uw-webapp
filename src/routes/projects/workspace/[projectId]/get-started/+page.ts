// +page.ts
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	const { project, idToken, isNewProject, currentUser } = await parent(); // <- data from +layout.server.ts

	return {
		project: project,
		idToken: idToken,
		isNewProject: isNewProject,
		currentUser: currentUser // Pass currentUser from server-side data
	};
};
