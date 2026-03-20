import { betterAuth } from "better-auth";
import { genericOAuth, keycloak } from "better-auth/plugins";
import { env } from "$env/dynamic/private";

export const auth = betterAuth({
	secret: env.BETTER_AUTH_SECRET,
	baseURL: env.BETTER_AUTH_URL || "http://localhost:5173",
	plugins: [
		genericOAuth({
			config: [
				keycloak({
					clientId: env.KEYCLOAK_CLIENT_ID,
					clientSecret: env.KEYCLOAK_CLIENT_SECRET,
					issuer: `${env.KEYCLOAK_URL}/realms/${env.KEYCLOAK_REALM}`,
					scopes: ["openid", "profile", "email", "offline_access"],
				}),
			],
		}),
	],
});
