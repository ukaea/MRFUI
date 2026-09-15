// src/routes/bookings/+page.server.ts
import type { PageServerLoad } from "./$types";
import { env } from "$env/dynamic/private";
import { readFilters } from "$lib/booking-filters";
import { searchBookings } from "$lib/server/bookings";

export const load: PageServerLoad = async ({ url, locals }) => {
	const filters = readFilters(url.searchParams);
	const view = url.searchParams.get("view") || "mine";
	const page = Number(url.searchParams.get("page")) || 1;
	const pageSize = Number(url.searchParams.get("page_size")) || 10;

	if (view === "mine") {
		// The page filters these to bookings where the user is scientific support
		// (exact email match), so fetch them unpaginated. Narrowing by email here
		// keeps the result set small; the client does the exact match.
		const email = env.AUTHN_ENABLE !== "false" ? locals.user?.email : undefined;
		const { bookings } = await searchBookings({
			token: locals.accessToken,
			filters: email && !filters.scientificSupport ? { ...filters, scientificSupport: email } : filters,
			page: 1,
			pageSize: 1000,
		});
		return {
			bookings,
			filters,
			view,
			pagination: { page: 1, pageSize: bookings.length || pageSize, total: bookings.length, totalPages: 1 },
		};
	}

	const { bookings, pagination } = await searchBookings({
		token: locals.accessToken,
		filters,
		page,
		pageSize,
	});

	return { bookings, filters, view, pagination };
};
