// +page.ts
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
  const { project, idToken, isNewProject, currentUser } = await parent();
  
  return {
    project,
    idToken,
    isNewProject,
    currentUser
  };
};