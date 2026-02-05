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
};
