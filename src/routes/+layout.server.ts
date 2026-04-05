// src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { createLogger } from '$lib/utils/logger';

const log = createLogger('app');
import { gql } from '$lib/services/realtime/graphql/requestHandler';
import { Q_LIST_PROJECTS } from '@stratiqai/types-simple';
import type { Project } from '@stratiqai/types-simple';

export const load: LayoutServerLoad = async ({ locals, cookies }) => {
  const idToken = cookies.get('id_token');

  let projects: Project[] = [];
  if (idToken) {
    try {
      const response = await gql<{ listProjects: { items: Project[]; nextToken?: string | null } }>(
        Q_LIST_PROJECTS,
        { limit: 50 },
        idToken
      );
      projects = response?.listProjects?.items || [];
    } catch (err) {
      log.error('Failed to load projects for layout:', err);
    }
  }

  return { 
    currentUser: locals.currentUser,
    idToken: idToken || null,
    projects
  };
};
