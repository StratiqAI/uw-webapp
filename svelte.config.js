import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import adapterNode from '@sveltejs/adapter-node';
import adapterAmplify from 'amplify-adapter';
import adapterVercel from '@sveltejs/adapter-vercel';

// load .env locally (optional)
import 'dotenv/config';

const isVercel = Boolean(process.env.VERCEL);
const isAmplify = Boolean(process.env.AWS_APP_ID || process.env.AWS_BRANCH);

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: isVercel
			? adapterVercel({
					// ✅ INTEGRATED CHANGE START:
					// Configure Vercel function limits.
					// These settings require a Vercel Pro or Enterprise plan.
					memory: 2048,     // Increase memory allocation (implicit CPU boost)
					maxDuration: 60, // Set execution timeout to 60 seconds
					runtime: 'nodejs24.x' // Explicitly set the runtime (optional, good practice)
					// ✅ INTEGRATED CHANGE END
				})
			: isAmplify
				? adapterAmplify({
						// any Amplify‐specific options here
					})
				: adapterNode({
						// fallback for local dev or other hosts
						out: 'build',
						precompress: false
					})
	}
};

export default config;