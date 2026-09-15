import type { PageServerLoad } from "./$types";
import { readFilters } from "$lib/booking-filters";
import { searchBookings } from "$lib/server/bookings";

export const load: PageServerLoad = async ({ url, locals }) => {
    const page = Number(url.searchParams.get("page")) || 1;
    const pageSize = Number(url.searchParams.get("page_size")) || 10;

    const { bookings, pagination } = await searchBookings({
        token: locals.accessToken,
        filters: readFilters(url.searchParams),
        page,
        pageSize,
    });

    // Calculate stats based on the current fetched set
    return {
        stats: {
            // Using the backend total for the "Total" card
            totalCount: pagination.total,
            initial: bookings.filter((b) => b.stage === "Initial").length,
            dataExport: bookings.filter((b) => b.stage === "Data Export").length,
            ingest: bookings.filter((b) => b.stage === "Ingest").length,
        },
        bookings // Passing the actual items if you need to render the list too
    };
};
