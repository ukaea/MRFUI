import { z } from "zod/v4";

const userSchema = z.object({
	firstName: z.string(),
	lastName: z.string(),
	email: z.string(),
});

export const MRFSchema = z.object({
	bookingUUID: z.uuid(),
	labLocation: z.string().default("MRF"),
	seid: z.string(),
	seidDescription: z.string().optional(),
	jobId: z.string(),
	sessionId: z.string(),
	sampleId: z.array(z.string()),
	bookingStart: z.string(),
	bookingEnd: z.string(),
	internalUser: z.array(userSchema),
	externalUser: z.array(userSchema),
	institution: z.string().optional(),
	scientificSupport: z.array(userSchema),
	notes: z.string().optional(),
	workCategory: z.string(),
	status: z.string(),
	sampleSplit: z.boolean(),
	splitSampleId: z.array(z.string()),
	tritium: z.boolean(),
	beryllium: z.boolean(),
	betaGamma: z.boolean(),
	modified: z.string().optional(),
	stage: z.enum(["Initial", "Data Export", "Ingest"]).default("Initial"),
});

export type MRFSchema = z.infer<typeof MRFSchema>;

// Alias for backwards compatibility
export type Schema = MRFSchema;