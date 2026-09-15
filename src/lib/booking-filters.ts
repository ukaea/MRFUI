// Search filters supported by the MRFBackend `GET /bookings/search` endpoint.
// Keys match the backend query parameter names so they can be forwarded as-is,
// and are also used as the page URL query parameters (so searches are shareable).

export interface FilterOption {
	value: string;
	label: string;
}

export interface FilterDef {
	key: string;
	label: string;
	kind: "text" | "date" | "select";
	placeholder?: string;
	options?: FilterOption[];
}

/** Filters shown in the search bar. */
export const FILTERS: FilterDef[] = [
	{ key: "jobId", label: "Job ID", kind: "text", placeholder: "e.g. 12345" },
	{ key: "seid", label: "SEID", kind: "text", placeholder: "e.g. SE-001" },
	{ key: "bookingStartFrom", label: "Start date from", kind: "date" },
	{ key: "bookingStartTo", label: "Start date to", kind: "date" },
];

/**
 * Not offered in the search bar, but still sent to the backend: the bookings
 * page narrows the "My Bookings" view by the signed-in user's email.
 */
const HIDDEN_FILTERS: FilterDef[] = [
	{ key: "scientificSupport", label: "Scientific support", kind: "text" },
];

export const FILTER_KEYS = FILTERS.map((f) => f.key);

/** Active filters, keyed by filter key. Absent keys are not filtered on. */
export type BookingFilters = Record<string, string>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const FILTERS_BY_KEY = new Map([...FILTERS, ...HIDDEN_FILTERS].map((f) => [f.key, f]));

/** Read valid, non-empty filters from page URL query parameters. */
export function readFilters(params: URLSearchParams): BookingFilters {
	const filters: BookingFilters = {};
	for (const def of FILTERS) {
		const value = params.get(def.key)?.trim();
		if (!value) continue;
		if (def.kind === "date" && !DATE_RE.test(value)) continue;
		if (def.options && !def.options.some((o) => o.value === value)) continue;
		filters[def.key] = value;
	}

	// Legacy `?search=` links searched by Job ID only.
	const legacy = params.get("search")?.trim();
	if (legacy && !filters.jobId) filters.jobId = legacy;

	return filters;
}

/**
 * Convert filters to backend query parameters. Date filters are whole days in
 * the UI, so "from" starts at the beginning of the day and "to" includes the
 * entire day.
 */
export function toBackendParams(filters: BookingFilters): URLSearchParams {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(filters)) {
		const def = FILTERS_BY_KEY.get(key);
		if (!def || !value) continue;
		if (def.kind === "date") {
			params.set(key, key.endsWith("From") ? `${value}T00:00:00` : `${value}T23:59:59.999999`);
		} else {
			params.set(key, value);
		}
	}
	return params;
}

/** Human-readable "Label: value" for an active filter. */
export function describeFilter(key: string, value: string): string {
	const def = FILTERS_BY_KEY.get(key);
	if (!def) return `${key}: ${value}`;
	const shown = def.options?.find((o) => o.value === value)?.label ?? value;
	return `${def.label}: ${shown}`;
}
