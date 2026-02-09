import { error, fail, redirect } from "@sveltejs/kit";
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
	deleteBooking: async ({ url }) => {
		const backendUrl = env.MRF_BACKEND_URL;
		if (!backendUrl) {
			return fail(500, { error: "MRF_BACKEND_URL is not configured" });
		}

		const uuid = url.searchParams.get("uuid");
		if (!uuid) {
			return fail(400, { error: "Missing booking UUID" });
		}

		const response = await fetch(`${backendUrl}/admin/bookings/${uuid}`, {
			method: "DELETE",
		});

		if (!response.ok) {
			const text = await response.text();
			return fail(response.status, { error: `Failed to delete booking: ${text}` });
		}

		redirect(303, "/admin");
	},
};
