import { readFile } from "fs/promises";
import { join } from "path";
import type { PageServerLoad } from "./$types";
import type { MRFSchema } from "$lib/components/schemas";

export const load: PageServerLoad = async () => {
	const filePath = join(process.cwd(), "exampleData/bookings/bookings.json");
	const fileContents = await readFile(filePath, "utf-8");
	const bookings: MRFSchema[] = JSON.parse(fileContents);

	const total = bookings.length;
	const inProgress = bookings.filter((b) => b.status === "In Progress").length;
	const completed = bookings.filter((b) => b.status === "Completed").length;
	const scheduled = bookings.filter((b) => b.status === "Scheduled").length;
	const cancelled = bookings.filter((b) => b.status === "Cancelled").length;

	return {
		stats: {
			total,
			inProgress,
			completed,
			scheduled,
			cancelled,
		},
	};
};
