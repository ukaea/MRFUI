import { auth } from "$lib/server/auth";
import { error, redirect } from "@sveltejs/kit";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { env } from "$env/dynamic/private";
import type { Handle } from "@sveltejs/kit";


const UNPROTECTED_PATHS = ["/api/auth", "/login"];

function decodeJwtPayload(token: string): Record<string, unknown> {
	try {
		return JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
	} catch {
		return {};
	}
}

async function fetchUserGroupsFromUserInfo(accessToken: string): Promise<string[]> {
	const userInfoUrl = `${env.KEYCLOAK_URL}/realms/${env.KEYCLOAK_REALM}/protocol/openid-connect/userinfo`;
	try {
		const res = await fetch(userInfoUrl, {
			headers: { Authorization: `Bearer ${accessToken}` },
		});
		if (!res.ok) return [];
		const info = await res.json();
		return (info.groups as string[] | undefined) ?? [];
	} catch {
		return [];
	}
}

/** Returns groups from the JWT first; falls back to the userinfo endpoint if absent. */
async function getUserGroups(accessToken: string): Promise<string[]> {
	const payload = decodeJwtPayload(accessToken);
	const tokenGroups = (payload.groups as string[] | undefined);
	if (tokenGroups && tokenGroups.length > 0) return tokenGroups;
	return fetchUserGroupsFromUserInfo(accessToken);
}

function groupMatches(groups: string[], requiredGroup: string): boolean {
	return groups.some((g) => g === requiredGroup || g === `/${requiredGroup}`);
}

export const handle: Handle = async ({ event, resolve }) => {
	const authnEnabled = env.AUTHN_ENABLE !== "false";
	const authzEnabled = env.AUTHZ_ENABLE !== "false";
	const requiredGroup = env.AUTHZ_REQUIRED_GROUP;

	const isUnprotected = UNPROTECTED_PATHS.some((p) =>
		event.url.pathname.startsWith(p),
	);

	if (!isUnprotected && authnEnabled) {
		const session = await auth.api.getSession({
			headers: event.request.headers,
		});

		if (!session) {
			redirect(
				303,
				`/login?callbackURL=${encodeURIComponent(event.url.pathname + event.url.search)}`,
			);
		}

		event.locals.user = session.user;
		event.locals.session = session.session;

		const ctx = await auth.$context;
		const accounts = await ctx.internalAdapter.findAccountByUserId(
			session.user.id,
		);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const keycloakAccount = accounts?.find((a: any) => a.providerId === "keycloak");

		if (keycloakAccount) {
			const now = new Date();
			const expiresAt = keycloakAccount.accessTokenExpiresAt
				? new Date(keycloakAccount.accessTokenExpiresAt)
				: null;

			// Refresh if expired or within 30 seconds of expiry
			const needsRefresh =
				expiresAt && now.getTime() >= expiresAt.getTime() - 30_000;

			if (needsRefresh && keycloakAccount.refreshToken) {
				try {
					const tokenResponse = await fetch(
						`${env.KEYCLOAK_URL}/realms/${env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
						{
							method: "POST",
							headers: { "Content-Type": "application/x-www-form-urlencoded" },
							body: new URLSearchParams({
								grant_type: "refresh_token",
								refresh_token: keycloakAccount.refreshToken,
								client_id: env.KEYCLOAK_CLIENT_ID ?? "",
								client_secret: env.KEYCLOAK_CLIENT_SECRET ?? "",
							}),
						},
					);

					if (tokenResponse.ok) {
						const tokens = await tokenResponse.json();
						await ctx.internalAdapter.updateAccount(keycloakAccount.id, {
							accessToken: tokens.access_token,
							refreshToken: tokens.refresh_token ?? keycloakAccount.refreshToken,
							accessTokenExpiresAt: new Date(
								Date.now() + tokens.expires_in * 1000,
							),
						});
						event.locals.accessToken = tokens.access_token;
					} else {
						// Refresh failed — force re-login
						redirect(303, `/login?callbackURL=${encodeURIComponent(event.url.pathname + event.url.search)}`);
					}
				} catch {
					redirect(303, `/login?callbackURL=${encodeURIComponent(event.url.pathname + event.url.search)}`);
				}
			} else {
				event.locals.accessToken = keycloakAccount.accessToken ?? null;
			}

			// Authorisation: check group membership (JWT first, userinfo fallback)
			if (authzEnabled && requiredGroup && event.locals.accessToken) {
				const groups = await getUserGroups(event.locals.accessToken);
				console.log("User groups:", groups);
				if (!groupMatches(groups, requiredGroup)) {
					throw error(403, `Access denied: you must be a member of the '${requiredGroup}' group.`);
				}
			}
		}
	}

	return svelteKitHandler({ auth, event, resolve, building: false });
};
