// src/routes/bookings/+page.server.ts
import type { PageServerLoad } from "./$types";
import type { MRFSchema } from "$lib/components/schemas";
import { env } from "$env/dynamic/private";
import { error } from "@sveltejs/kit";

function bearer(token: string | null): Record<string, string> {
	return token ? { Authorization: `Bearer ${token}` } : {};
}

export const load: PageServerLoad = async ({ url, locals }) => {
	const backendUrl = env.MRF_BACKEND_URL;
	if (!backendUrl) {
		throw error(500, "MRF_BACKEND_URL is not configured");
	}

	const search = url.searchParams.get("search") || "";
	const view = url.searchParams.get("view") || "mine";
	const page = Number(url.searchParams.get("page")) || 1;
	const pageSize = Number(url.searchParams.get("page_size")) || 10;

	const auth = bearer(locals.accessToken);
	let response: Response;

	if (search) {
		response = await fetch(
			`${backendUrl}/bookings/search?key=jobId&value=${encodeURIComponent(search)}`,
			{ headers: auth },
		);
	} else if (view === "mine") {
		// Fetch all bookings so the client can filter by user email
		response = await fetch(
			`${backendUrl}/bookings?page=1&page_size=1000`,
			{ headers: auth },
		);
	} else {
		response = await fetch(
			`${backendUrl}/bookings?page=${page}&page_size=${pageSize}`,
			{ headers: auth },
		);
	}

	if (!response.ok) {
		throw error(response.status, "Failed to fetch bookings");
	}

	const result = await response.json();
	const bookings: MRFSchema[] = search ? result : result.items;
	const isUnpaginated = search || view === "mine";

	return {
		bookings,
		search,
		view,
		pagination: isUnpaginated
			? { page: 1, pageSize: bookings.length || pageSize, total: bookings.length, totalPages: 1 }
			: {
					page,
					pageSize,
					total: result.total as number,
					totalPages: result.total_pages as number,
				},
	};
};
