// src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, cookies }) => {
  // Get idToken from cookies to pass to client
  const idToken = cookies.get('id_token');
  
  return { 
    currentUser: locals.currentUser,
    idToken: idToken || null
  };
};
