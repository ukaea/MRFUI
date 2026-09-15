import { error, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { MRFSchema } from "$lib/components/schemas";
import type { MRFSchema as MRFSchemaType, SyncStatus } from "$lib/components/schemas";
import { env } from "$env/dynamic/private";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import jq from "node-jq";

const STRIP_FIELDS = new Set(["spModified", "spCreated", "status", "stage", "dbCreatedAt", "dbUpdatedAt"]);

function removeEmpty(obj: unknown): unknown {
	if (Array.isArray(obj)) {
		return obj.map(removeEmpty).filter((v) => v !== null && v !== undefined && v !== "");
	}
	if (obj !== null && typeof obj === "object") {
		const result: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
			if (v === null || v === undefined || v === "") continue;
			if (Array.isArray(v) && v.length === 0) continue;
			result[k] = removeEmpty(v);
		}
		return result;
	}
	return obj;
}

function normalise(payload: Record<string, unknown>): Record<string, unknown> {
	const cleaned = removeEmpty(payload) as Record<string, unknown>;
	for (const field of STRIP_FIELDS) delete cleaned[field];
	if ("seid" in cleaned) { cleaned.seId = cleaned.seid; delete cleaned.seid; }
	if ("seidDescription" in cleaned) { cleaned.seIdDescription = cleaned.seidDescription; delete cleaned.seidDescription; }
	return cleaned;
}

async function savePayload(uuid: string, suffix: string, data: unknown): Promise<void> {
	const payloadDir = join(process.cwd(), "payloads");
	await mkdir(payloadDir, { recursive: true });
	await writeFile(join(payloadDir, `${uuid}_${suffix}.json`), JSON.stringify(data, null, 2));
}

function bearer(token: string | null): Record<string, string> {
	return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchSyncStatus(backendUrl: string, uuid: string, token: string | null): Promise<SyncStatus | null> {
	const response = await fetch(`${backendUrl}/bookings/${uuid}/sync`, { headers: bearer(token) });
	return response.ok ? await response.json() : null;
}

async function changeSync(url: URL, locals: App.Locals, action: "start" | "stop") {
	const backendUrl = env.MRF_BACKEND_URL;
	if (!backendUrl) {
		return fail(500, { error: "MRF_BACKEND_URL is not configured" });
	}

	const uuid = url.searchParams.get("uuid");
	if (!uuid) {
		return fail(400, { error: "Missing booking UUID" });
	}

	const response = await fetch(`${backendUrl}/bookings/${uuid}/sync/${action}`, {
		method: "POST",
		headers: bearer(locals.accessToken),
	});

	if (!response.ok) {
		const body = await response.json().catch(() => null);
		const detail = typeof body?.detail === "string" ? body.detail : response.statusText;
		return fail(response.status, { error: `Failed to ${action} sync: ${detail}` });
	}

	const sync: SyncStatus = await response.json();
	return { success: true, sync };
}

export const load: PageServerLoad = async ({ url, locals }) => {
	const backendUrl = env.MRF_BACKEND_URL;
	if (!backendUrl) {
		throw error(500, "MRF_BACKEND_URL is not configured");
	}

	const uuid = url.searchParams.get("uuid");
	if (!uuid) {
		throw error(400, "Missing booking UUID");
	}

	const sync = fetchSyncStatus(backendUrl, uuid, locals.accessToken);

	// Refresh the booking from SharePoint before returning it
	const refreshResponse = await fetch(`${backendUrl}/bookings/${uuid}/refresh`, {
		method: "POST",
		headers: bearer(locals.accessToken),
	});

	if (refreshResponse.ok) {
		const booking: MRFSchemaType = await refreshResponse.json();
		return { booking, sync: await sync };
	}

	// Fall back to reading the existing booking if refresh fails
	const response = await fetch(`${backendUrl}/bookings/${uuid}`, {
		headers: bearer(locals.accessToken),
	});
	if (!response.ok) {
		throw error(response.status, `Booking not found: ${uuid}`);
	}

	const booking: MRFSchemaType = await response.json();

	return { booking, sync: await sync };
};

export const actions: Actions = {
	save: async ({ request, url, locals }) => {
		const backendUrl = env.MRF_BACKEND_URL;
		if (!backendUrl) {
			return fail(500, { error: "MRF_BACKEND_URL is not configured" });
		}

		const uuid = url.searchParams.get("uuid");
		if (!uuid) {
			return fail(400, { error: "Missing booking UUID" });
		}

		const formData = await request.formData();
		const payload = JSON.parse(formData.get("payload") as string);

		const result = MRFSchema.safeParse(payload);
		if (!result.success) {
			const messages = result.error.issues.map(
				(i) => `${i.path.join(".")}: ${i.message}`
			);
			return fail(400, { error: `Validation failed: ${messages.join(", ")}` });
		}

		// Check if SharePoint has newer data before saving
		const auth = bearer(locals.accessToken);
		const refreshResponse = await fetch(`${backendUrl}/bookings/${uuid}/refresh`, {
			method: "POST",
			headers: auth,
		});

		if (refreshResponse.ok) {
			const refreshed = await refreshResponse.json();
			const currentSpModified = payload.spModified;
			const refreshedSpModified = refreshed.spModified;
			if (currentSpModified && refreshedSpModified && refreshedSpModified !== currentSpModified) {
				// SharePoint was updated — refresh already wrote to DB, reject the save
				return fail(409, {
					error: "This booking was updated in the Booking System. Refresh to get the latest data.",
				});
			}
		}

		const response = await fetch(`${backendUrl}/bookings/${uuid}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json", ...auth },
			body: JSON.stringify(result.data),
		});

		if (!response.ok) {
			const text = await response.text();
			return fail(response.status, { error: `Failed to update booking: ${text}` });
		}

		return { success: true };
	},

	progressStage: async ({ request, url, locals }) => {
		const backendUrl = env.MRF_BACKEND_URL;
		if (!backendUrl) {
			return fail(500, { error: "MRF_BACKEND_URL is not configured" });
		}

		const uuid = url.searchParams.get("uuid");
		if (!uuid) {
			return fail(400, { error: "Missing booking UUID" });
		}

		const formData = await request.formData();
		const newStage = formData.get("stage") as string;

		const validTransitions: Record<string, string[]> = {
			"Initial": ["Sync"],
			"Sync": ["Initial", "Ingest"],
			"Ingest": ["Sync"],
		};

		const auth = bearer(locals.accessToken);

		const getResponse = await fetch(`${backendUrl}/bookings/${uuid}`, { headers: auth });
		if (!getResponse.ok) {
			return fail(getResponse.status, { error: "Booking not found" });
		}
		const booking = await getResponse.json();
		const currentStage = booking.stage || "Initial";

		if (!validTransitions[currentStage]?.includes(newStage)) {
			return fail(400, {
				error: `Invalid stage transition from ${currentStage} to ${newStage}`,
			});
		}

		const response = await fetch(`${backendUrl}/bookings/${uuid}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json", ...auth },
			body: JSON.stringify({ ...booking, stage: newStage }),
		});

		if (!response.ok) {
			const text = await response.text();
			return fail(response.status, { error: `Failed to progress stage: ${text}` });
		}

		return { success: true };
	},

	createFolders: async ({ url, locals }) => {
		const fileServiceUrl = env.FILE_SERVICE_URL;
		if (!fileServiceUrl) {
			return fail(500, { error: "FILE_SERVICE_URL is not configured" });
		}

		const backendUrl = env.MRF_BACKEND_URL;
		if (!backendUrl) {
			return fail(500, { error: "MRF_BACKEND_URL is not configured" });
		}

		const uuid = url.searchParams.get("uuid");
		if (!uuid) {
			return fail(400, { error: "Missing booking UUID" });
		}

		const auth = bearer(locals.accessToken);

		const bookingResponse = await fetch(`${backendUrl}/bookings/${uuid}`, { headers: auth });
		if (!bookingResponse.ok) {
			return fail(bookingResponse.status, { error: "Booking not found" });
		}
		const booking = await bookingResponse.json();

		const { jobId, seid, sessionId } = booking;
		if (!jobId || !seid || !sessionId) {
			return fail(400, { error: "Booking is missing jobId, seid, or sessionId" });
		}

		const folderPath = `MRF/${jobId}/${seid}/${sessionId}`;
		const response = await fetch(
			`${fileServiceUrl}/folders/create?path=${encodeURIComponent(folderPath)}`,
			{
				method: "POST",
				headers: { Accept: "application/json", ...auth },
			},
		);

		if (!response.ok) {
			const text = await response.text();
			return fail(response.status, { error: `Failed to create folders: ${text}` });
		}

		const result = await response.json();
		return { success: true, ...result };
	},

	startSync: async ({ url, locals }) => changeSync(url, locals, "start"),

	stopSync: async ({ url, locals }) => changeSync(url, locals, "stop"),

	processIngest: async ({ request, url }) => {
		const uuid = url.searchParams.get("uuid");
		if (!uuid) return fail(400, { error: "Missing booking UUID" });

		const formData = await request.formData();
		const raw = formData.get("payload") as string;
		if (!raw) return fail(400, { error: "Missing payload" });

		const normalised = normalise(JSON.parse(raw));
		await savePayload(uuid, "1_normalised", normalised);

		return { success: true, data: normalised };
	},

	mapIngest: async ({ request, url }) => {
		const uuid = url.searchParams.get("uuid");
		if (!uuid) return fail(400, { error: "Missing booking UUID" });

		const jqUrl = env.INGEST_JQ_URL;
		if (!jqUrl) return fail(500, { error: "INGEST_JQ_URL is not configured" });

		const formData = await request.formData();
		const raw = formData.get("data") as string;
		if (!raw) return fail(400, { error: "Missing data" });

		const jqResponse = await fetch(jqUrl);
		if (!jqResponse.ok) return fail(500, { error: `Failed to fetch JQ script: ${jqResponse.statusText}` });
		const jqScript = await jqResponse.text();

		const mapped = await jq.run(jqScript, JSON.parse(raw), { input: "json", output: "json" }) as Record<string, unknown>;
		mapped.accessGroups = ["HIVE"];
		mapped.ownerGroup = "HIVE";
		await savePayload(uuid, "2_mapped", mapped);

		return { success: true, data: mapped };
	},

	submitIngest: async ({ request, url, locals }) => {
		const uuid = url.searchParams.get("uuid");
		if (!uuid) return fail(400, { error: "Missing booking UUID" });

		const metacatUrl = env.METACAT_URL;
		if (!metacatUrl) return fail(500, { error: "METACAT_URL is not configured" });

		const formData = await request.formData();
		const raw = formData.get("data") as string;
		if (!raw) return fail(400, { error: "Missing data" });

		const response = await fetch(`${metacatUrl}/datasets`, {
			method: "POST",
			headers: { "Content-Type": "application/json", ...bearer(locals.accessToken) },
			body: raw,
		});

		if (!response.ok) {
			const text = await response.text();
			return fail(response.status, { error: `Failed to ingest to data catalogue: ${text}` });
		}

		const result = await response.json() as Record<string, unknown>;
		const scicatUrl = env.SCICAT_URL;
		const datasetId = result.pid ?? result.id ?? result._id;
		const catalogueUrl = scicatUrl && datasetId
			? `${scicatUrl}/datasets/${encodeURIComponent(String(datasetId))}`
			: undefined;

		return { success: true, data: result, catalogueUrl };
	},

	ingest: async ({ request, url }) => {
		const uuid = url.searchParams.get("uuid");
		if (!uuid) {
			return fail(400, { error: "Missing booking UUID" });
		}

		const formData = await request.formData();
		const raw = formData.get("payload") as string;
		if (!raw) {
			return fail(400, { error: "Missing payload" });
		}

		const booking = JSON.parse(raw);

		// Rename fields
		booking.seId = booking.seid;
		delete booking.seid;
		booking.seIdDescription = booking.seidDescription;
		delete booking.seidDescription;

		const payloadDir = join(process.cwd(), "payloads");
		await mkdir(payloadDir, { recursive: true });
		const filePath = join(payloadDir, `payload_${uuid}.json`);
		await writeFile(filePath, JSON.stringify(booking, null, 2));

		return { success: true, file: filePath };
	},
};
