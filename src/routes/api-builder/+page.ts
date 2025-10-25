// +page.ts
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ data, parent }) => {
  const parentData = await parent();
  
  return {
    currentUser: parentData.currentUser,
    idToken: data.idToken
  };
};
