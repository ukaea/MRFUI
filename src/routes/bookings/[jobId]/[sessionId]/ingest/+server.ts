import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { env } from "$env/dynamic/private";
import jq from "node-jq";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

function removeEmpty(obj: unknown): unknown {
	if (Array.isArray(obj)) {
		return obj.map(removeEmpty).filter((v) => v !== null && v !== undefined && v !== "");
	}
	if (obj !== null && typeof obj === "object") {
		const result: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
			if (v === null || v === undefined || v === "") continue;
			result[k] = removeEmpty(v);
		}
		return result;
	}
	return obj;
}

function normalise(payload: Record<string, unknown>): Record<string, unknown> {
	const cleaned = removeEmpty(payload) as Record<string, unknown>;

	if ("seid" in cleaned) {
		cleaned.seId = cleaned.seid;
		delete cleaned.seid;
	}
	if ("seidDescription" in cleaned) {
		cleaned.seIdDescription = cleaned.seidDescription;
		delete cleaned.seidDescription;
	}

	cleaned.labId = "MRF";

	return cleaned;
}

async function savePayload(filename: string, data: unknown): Promise<void> {
	const payloadDir = join(process.cwd(), "payloads");
	await mkdir(payloadDir, { recursive: true });
	await writeFile(join(payloadDir, filename), JSON.stringify(data, null, 2));
}

export const POST: RequestHandler = async ({ request, url }) => {
	const step = url.searchParams.get("step");
	const uuid = url.searchParams.get("uuid") ?? "unknown";

	if (step === "process") {
		const body = await request.json();
		if (!body.payload) {
			throw error(400, "Missing payload");
		}
		const normalised = normalise(body.payload);
		await savePayload(`${uuid}_1_normalised.json`, normalised);
		return json({ success: true, data: normalised });
	}

	if (step === "map") {
		const jqUrl = env.INGEST_JQ_URL;
		if (!jqUrl) {
			throw error(500, "INGEST_JQ_URL is not configured");
		}

		const body = await request.json();
		if (!body.data) {
			throw error(400, "Missing data");
		}

		const jqResponse = await fetch(jqUrl);
		if (!jqResponse.ok) {
			throw error(500, `Failed to fetch JQ script: ${jqResponse.statusText}`);
		}
		const jqScript = await jqResponse.text();

		const mapped = await jq.run(jqScript, body.data, { input: "json", output: "json" });
		await savePayload(`${uuid}_2_mapped.json`, mapped);
		return json({ success: true, data: mapped });
	}

	throw error(400, `Unknown step: ${step}`);
};
