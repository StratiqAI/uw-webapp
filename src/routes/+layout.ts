// src/routes/+layout.ts
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = ({ data }) => {
	// console.log('In file +layout.ts');
	// console.log('data', data);
	return data;
};
