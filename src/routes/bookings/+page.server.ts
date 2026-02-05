// src/routes/bookings/+page.server.ts
import type { PageServerLoad, Actions } from "./$types";
import type { MRFSchema } from "$lib/components/schemas";
import { env } from "$env/dynamic/private";
import { error, fail } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ url }) => {
	const backendUrl = env.MRF_BACKEND_URL;
	if (!backendUrl) {
		throw error(500, "MRF_BACKEND_URL is not configured");
	}

	const page = Number(url.searchParams.get("page")) || 1;
	const pageSize = Number(url.searchParams.get("page_size")) || 10;

	const response = await fetch(
		`${backendUrl}/bookings?page=${page}&page_size=${pageSize}`,
	);
	if (!response.ok) {
		throw error(response.status, "Failed to fetch bookings");
	}

	const result = await response.json();
	const bookings: MRFSchema[] = result.items;

	return {
		bookings,
		pagination: {
			page,
			pageSize,
			total: result.total as number,
			totalPages: result.total_pages as number,
		},
	};
};

export const actions: Actions = {
	sync: async () => {
		const backendUrl = env.MRF_BACKEND_URL;
		if (!backendUrl) {
			return fail(500, { error: "MRF_BACKEND_URL is not configured" });
		}

		const response = await fetch(`${backendUrl}/sync`, {
			method: "POST",
		});

		if (!response.ok) {
			return fail(response.status, { error: "Sync failed" });
		}

		const result = await response.json();
		return { success: true, records_synced: result.records_synced };
	},
};