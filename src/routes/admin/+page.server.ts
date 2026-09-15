import type { PageServerLoad, Actions } from "./$types";
import { env } from "$env/dynamic/private";
import { fail } from "@sveltejs/kit";
import { readFilters } from "$lib/booking-filters";
import { bearer, searchBookings } from "$lib/server/bookings";

export const load: PageServerLoad = async ({ url, locals }) => {
	const filters = readFilters(url.searchParams);
	const page = Number(url.searchParams.get("page")) || 1;
	const pageSize = Number(url.searchParams.get("page_size")) || 10;

	const { bookings, pagination } = await searchBookings({
		token: locals.accessToken,
		filters,
		page,
		pageSize,
	});

	return { bookings, filters, pagination };
};

export const actions: Actions = {
	deleteAll: async ({ locals }) => {
		const backendUrl = env.MRF_BACKEND_URL;
		if (!backendUrl) {
			return fail(500, { error: "MRF_BACKEND_URL is not configured" });
		}

		const response = await fetch(`${backendUrl}/admin/bookings`, {
			method: "DELETE",
			headers: bearer(locals.accessToken),
		});

		if (!response.ok) {
			const text = await response.text();
			return fail(response.status, { error: `Failed to delete all bookings: ${text}` });
		}

		return { success: true };
	},

	adminSync: async ({ request, locals }) => {
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
			headers: bearer(locals.accessToken),
		});

		if (!response.ok) {
			const text = await response.text();
			return fail(response.status, { error: `Admin sync failed: ${text}` });
		}

		const result = await response.json();
		return { success: true, ...result };
	},
};
