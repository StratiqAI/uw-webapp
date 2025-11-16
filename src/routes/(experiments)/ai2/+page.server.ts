// +page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	const idToken = cookies.get('id_token');
	if (!idToken) {
		throw error(401, 'Not Authorized');
	}

	return {
		idToken
	};
};
