import { env } from "$env/dynamic/private";
import { error } from "@sveltejs/kit";
import type { MRFSchema } from "$lib/components/schemas";
import { toBackendParams, type BookingFilters } from "$lib/booking-filters";

export function bearer(token: string | null): Record<string, string> {
	return token ? { Authorization: `Bearer ${token}` } : {};
}

/** FastAPI sends 400s as a string and 422 validation errors as a list. */
function formatDetail(detail: unknown): string {
	if (typeof detail === "string") return detail;
	if (Array.isArray(detail)) {
		return detail
			.map((d) => `${(d?.loc ?? []).filter((l: unknown) => l !== "query").join(".")} ${d?.msg ?? ""}`.trim())
			.join("; ");
	}
	return "unknown error";
}

/**
 * Fetch a page of bookings matching `filters` from the backend search endpoint.
 * With no filters this returns every booking, newest booking start first.
 */
export async function searchBookings({
	token,
	filters,
	page,
	pageSize,
}: {
	token: string | null;
	filters: BookingFilters;
	page: number;
	pageSize: number;
}) {
	const backendUrl = env.MRF_BACKEND_URL;
	if (!backendUrl) {
		throw error(500, "MRF_BACKEND_URL is not configured");
	}

	const params = toBackendParams(filters);
	params.set("page", String(page));
	params.set("page_size", String(pageSize));

	const response = await fetch(`${backendUrl}/bookings/search?${params.toString()}`, {
		headers: bearer(token),
	});

	if (!response.ok) {
		// 400/422 carry a useful validation message (e.g. a malformed filter value)
		if (response.status === 400 || response.status === 422) {
			const body = await response.json().catch(() => null);
			throw error(400, `Invalid search filters: ${formatDetail(body?.detail)}`);
		}
		throw error(response.status, "Failed to fetch bookings");
	}

	const result = await response.json();
	return {
		bookings: result.items as MRFSchema[],
		pagination: {
			page: result.page as number,
			pageSize: result.page_size as number,
			total: result.total as number,
			totalPages: Math.max(1, result.total_pages as number),
		},
	};
}
