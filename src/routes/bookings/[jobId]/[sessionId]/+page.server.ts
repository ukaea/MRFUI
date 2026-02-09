import { error, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import type { MRFSchema } from "$lib/components/schemas";
import { env } from "$env/dynamic/private";

export const load: PageServerLoad = async ({ url }) => {
	const backendUrl = env.MRF_BACKEND_URL;
	if (!backendUrl) {
		throw error(500, "MRF_BACKEND_URL is not configured");
	}

	const uuid = url.searchParams.get("uuid");
	if (!uuid) {
		throw error(400, "Missing booking UUID");
	}

	const response = await fetch(`${backendUrl}/bookings/${uuid}`);
	if (!response.ok) {
		throw error(response.status, `Booking not found: ${uuid}`);
	}

	const booking: MRFSchema = await response.json();

	return { booking };
};

export const actions: Actions = {
	save: async ({ request, url }) => {
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

		const response = await fetch(
			`${backendUrl}/bookings/${uuid}`,
			{
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			},
		);

		if (!response.ok) {
			const text = await response.text();
			return fail(response.status, {
				error: `Failed to update booking: ${text}`,
			});
		}

		return { success: true };
	},

	progressStage: async ({ request, url }) => {
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

		const getResponse = await fetch(`${backendUrl}/bookings/${uuid}`);
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
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ ...booking, stage: newStage }),
		});

		if (!response.ok) {
			const text = await response.text();
			return fail(response.status, {
				error: `Failed to progress stage: ${text}`,
			});
		}

		return { success: true };
	},

	createFolders: async ({ url }) => {
		const backendUrl = env.MRF_BACKEND_URL;
		if (!backendUrl) {
			return fail(500, { error: "MRF_BACKEND_URL is not configured" });
		}

		const uuid = url.searchParams.get("uuid");
		if (!uuid) {
			return fail(400, { error: "Missing booking UUID" });
		}

		const response = await fetch(
			`${backendUrl}/bookings/${uuid}/create-folders`,
			{ method: "POST" },
		);

		if (!response.ok) {
			const text = await response.text();
			return fail(response.status, {
				error: `Failed to create folders: ${text}`,
			});
		}

		const result = await response.json();
		return { success: true, ...result };
	},

	startDataTransfer: async ({ url }) => {
		const backendUrl = env.MRF_BACKEND_URL;
		if (!backendUrl) {
			return fail(500, { error: "MRF_BACKEND_URL is not configured" });
		}

		const uuid = url.searchParams.get("uuid");
		if (!uuid) {
			return fail(400, { error: "Missing booking UUID" });
		}

		const response = await fetch(
			`${backendUrl}/bookings/${uuid}/start-transfer`,
			{ method: "POST" },
		);

		if (!response.ok) {
			const text = await response.text();
			return fail(response.status, {
				error: `Failed to start data transfer: ${text}`,
			});
		}

		const result = await response.json();
		return { success: true, ...result };
	},

	ingest: async ({ url }) => {
		const backendUrl = env.MRF_BACKEND_URL;
		if (!backendUrl) {
			return fail(500, { error: "MRF_BACKEND_URL is not configured" });
		}

		const uuid = url.searchParams.get("uuid");
		if (!uuid) {
			return fail(400, { error: "Missing booking UUID" });
		}

		const response = await fetch(
			`${backendUrl}/bookings/${uuid}/ingest`,
			{ method: "POST" },
		);

		if (!response.ok) {
			const text = await response.text();
			return fail(response.status, {
				error: `Failed to ingest: ${text}`,
			});
		}

		const result = await response.json();
		return { success: true, ...result };
	},
};
