import type { LayoutServerLoad } from "./$types";
import { env } from "$env/dynamic/private";

export const load: LayoutServerLoad = async ({ locals }) => {
	const authnEnabled = env.AUTHN_ENABLE !== "false";
	return {
		user: locals.user ?? null,
		authEnabled: authnEnabled,
	};
};
