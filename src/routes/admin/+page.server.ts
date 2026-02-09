import type { PageServerLoad, Actions } from "./$types";
import type { MRFSchema } from "$lib/components/schemas";
import { env } from "$env/dynamic/private";
import { error, fail } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ url }) => {
	const backendUrl = env.MRF_BACKEND_URL;
	if (!backendUrl) {
		throw error(500, "MRF_BACKEND_URL is not configured");
	}

	const search = url.searchParams.get("search") || "";
	const page = Number(url.searchParams.get("page")) || 1;
	const pageSize = Number(url.searchParams.get("page_size")) || 10;

	let response: Response;

	if (search) {
		response = await fetch(
			`${backendUrl}/bookings/search?key=jobId&value=${encodeURIComponent(search)}`,
		);
	} else {
		response = await fetch(
			`${backendUrl}/bookings?page=${page}&page_size=${pageSize}`,
		);
	}

	if (!response.ok) {
		throw error(response.status, "Failed to fetch bookings");
	}

	const result = await response.json();
	const bookings: MRFSchema[] = search ? result : result.items;

	return {
		bookings,
		search,
		pagination: search
			? { page: 1, pageSize: bookings.length || pageSize, total: bookings.length, totalPages: 1 }
			: {
					page,
					pageSize,
					total: result.total as number,
					totalPages: result.total_pages as number,
				},
	};
};

export const actions: Actions = {
	deleteAll: async () => {
		const backendUrl = env.MRF_BACKEND_URL;
		if (!backendUrl) {
			return fail(500, { error: "MRF_BACKEND_URL is not configured" });
		}

		const response = await fetch(`${backendUrl}/admin/bookings`, {
			method: "DELETE",
		});

		if (!response.ok) {
			const text = await response.text();
			return fail(response.status, { error: `Failed to delete all bookings: ${text}` });
		}

		return { success: true };
	},

	adminSync: async ({ request }) => {
		const backendUrl = env.MRF_BACKEND_URL;
		if (!backendUrl) {
			return fail(500, { error: "MRF_BACKEND_URL is not configured" });
		}

		const formData = await request.formData();
		const startDate = formData.get("start_date") as string;
		const endDate = formData.get("end_date") as string;
		const daysBack = formData.get("days_back") as string;

		const params = new URLSearchParams();
		if (startDate) params.set("start_date", startDate);
		if (endDate) params.set("end_date", endDate);
		if (daysBack) params.set("days_back", daysBack);

		const response = await fetch(`${backendUrl}/admin/sync?${params.toString()}`, {
			method: "POST",
		});

		if (!response.ok) {
			const text = await response.text();
			return fail(response.status, { error: `Admin sync failed: ${text}` });
		}

		const result = await response.json();
		return { success: true, ...result };
	},
};
