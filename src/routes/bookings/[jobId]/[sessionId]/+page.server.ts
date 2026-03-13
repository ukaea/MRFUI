import { error, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { MRFSchema } from "$lib/components/schemas";
import type { MRFSchema as MRFSchemaType } from "$lib/components/schemas";
import { env } from "$env/dynamic/private";

function bearer(token: string | null): Record<string, string> {
	return token ? { Authorization: `Bearer ${token}` } : {};
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

	const response = await fetch(`${backendUrl}/bookings/${uuid}`, {
		headers: bearer(locals.accessToken),
	});
	if (!response.ok) {
		throw error(response.status, `Booking not found: ${uuid}`);
	}

	const booking: MRFSchemaType = await response.json();

	return { booking };
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

		const response = await fetch(`${backendUrl}/bookings/${uuid}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json", ...bearer(locals.accessToken) },
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
			"Initial": ["Data Export"],
			"Data Export": ["Initial", "Ingest"],
			"Ingest": ["Data Export"],
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

	startDataTransfer: async ({ url, locals }) => {
		const backendUrl = env.MRF_BACKEND_URL;
		if (!backendUrl) {
			return fail(500, { error: "MRF_BACKEND_URL is not configured" });
		}

		const uuid = url.searchParams.get("uuid");
		if (!uuid) {
			return fail(400, { error: "Missing booking UUID" });
		}

		const response = await fetch(`${backendUrl}/bookings/${uuid}/start-transfer`, {
			method: "POST",
			headers: bearer(locals.accessToken),
		});

		if (!response.ok) {
			const text = await response.text();
			return fail(response.status, { error: `Failed to start data transfer: ${text}` });
		}

		const result = await response.json();
		return { success: true, ...result };
	},

	ingest: async ({ url, locals }) => {
		const backendUrl = env.MRF_BACKEND_URL;
		if (!backendUrl) {
			return fail(500, { error: "MRF_BACKEND_URL is not configured" });
		}

		const uuid = url.searchParams.get("uuid");
		if (!uuid) {
			return fail(400, { error: "Missing booking UUID" });
		}

		const response = await fetch(`${backendUrl}/bookings/${uuid}/ingest`, {
			method: "POST",
			headers: bearer(locals.accessToken),
		});

		if (!response.ok) {
			const text = await response.text();
			return fail(response.status, { error: `Failed to ingest: ${text}` });
		}

		const result = await response.json();
		return { success: true, ...result };
	},
};
