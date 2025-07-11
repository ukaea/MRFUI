import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import adapter from '@sveltejs/adapter-node';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig();
const config = {
	preprocess: vitePreprocess(),
	kit: { adapter: adapter() }
};

export default config;
