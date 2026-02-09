import { error } from "@sveltejs/kit"; // Use SvelteKit's error helper
import type { PageServerLoad } from "./$types";
import type { MRFSchema } from "$lib/components/schemas";
import { env } from "$env/dynamic/private";

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
        throw error(response.status, "Failed to fetch bookings from backend");
    }

    const result = await response.json();

    // Normalizing the data: 
    // If searching, result is the array. If listing, it's result.items.
    const bookings: MRFSchema[] = search ? result : (result.items || []);

    // Calculate stats based on the current fetched set
    return {
        stats: {
            // Using result.total from backend for the "Total" card if available
            totalCount: search ? bookings.length : (result.total || 0),
            initial: bookings.filter((b) => b.stage === "Initial").length,
            dataExport: bookings.filter((b) => b.stage === "Data Export").length,
            ingest: bookings.filter((b) => b.stage === "Ingest").length,
        },
        bookings // Passing the actual items if you need to render the list too
    };
};
