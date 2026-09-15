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
	/** Shown in the always-visible row rather than under "More filters". */
	primary?: boolean;
	placeholder?: string;
	options?: FilterOption[];
}

const YES_NO: FilterOption[] = [
	{ value: "true", label: "Yes" },
	{ value: "false", label: "No" },
];

export const FILTERS: FilterDef[] = [
	{ key: "jobId", label: "Job ID", kind: "text", primary: true, placeholder: "e.g. 12345" },
	{ key: "seid", label: "SEID", kind: "text", primary: true, placeholder: "e.g. SE-001" },
	{ key: "bookingStartFrom", label: "Start date from", kind: "date", primary: true },
	{ key: "bookingStartTo", label: "Start date to", kind: "date", primary: true },

	{ key: "sessionId", label: "Session ID", kind: "text" },
	{ key: "sampleId", label: "Sample ID", kind: "text" },
	{ key: "splitSampleId", label: "Split sample ID", kind: "text" },
	{ key: "seidDescription", label: "SEID description", kind: "text" },
	{ key: "scientificSupport", label: "Scientific support", kind: "text", placeholder: "Name or email" },
	{ key: "internalUser", label: "Internal user", kind: "text", placeholder: "Name or email" },
	{ key: "externalUser", label: "External user", kind: "text", placeholder: "Name or email" },
	{ key: "labId", label: "Lab ID", kind: "text" },
	{ key: "labLocation", label: "Lab location", kind: "text" },
	{ key: "workCategory", label: "Work category", kind: "text" },
	{ key: "status", label: "Status", kind: "text" },
	{ key: "notes", label: "Notes", kind: "text" },
	{ key: "bookingEndFrom", label: "End date from", kind: "date" },
	{ key: "bookingEndTo", label: "End date to", kind: "date" },
	{
		key: "stage",
		label: "Stage",
		kind: "select",
		options: [
			{ value: "Initial", label: "Initial" },
			{ value: "Data Export", label: "Data Export" },
			{ value: "Ingest", label: "Ingest" },
		],
	},
	{ key: "tritium", label: "Tritium", kind: "select", options: YES_NO },
	{ key: "beryllium", label: "Beryllium", kind: "select", options: YES_NO },
	{ key: "betaGamma", label: "Beta/Gamma", kind: "select", options: YES_NO },
	{ key: "sampleSplit", label: "Sample split", kind: "select", options: YES_NO },
];

export const FILTER_KEYS = FILTERS.map((f) => f.key);

/** Active filters, keyed by filter key. Absent keys are not filtered on. */
export type BookingFilters = Record<string, string>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const FILTERS_BY_KEY = new Map(FILTERS.map((f) => [f.key, f]));

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
