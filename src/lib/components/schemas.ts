import { z } from "zod";

const userSchema = z.object({
	firstName: z.string().min(1, "First name is required"),
	lastName: z.string().min(1, "Last name is required"),
	email: z.email("Invalid email address"),
});

export const MRFSchema = z.object({
	bookingUUID: z.uuid(),
	labLocation: z.string().min(1, "Lab location is required").default("MRF"),
	labId: z.string().optional(),
	seid: z.string().min(1, "SEID is required"),
	seidDescription: z.string().optional(),
	jobId: z.string().min(1, "Job ID is required"),
	sessionId: z.string().min(1, "Session ID is required"),
	sampleId: z.array(z.string()).default([]),
	bookingStart: z.string().min(1, "Start date is required"),
	bookingEnd: z.string().min(1, "End date is required"),
	internalUser: z.array(userSchema).default([]),
	externalUser: z.array(userSchema),
	institution: z.string().optional(),
	scientificSupport: z.array(userSchema),
	notes: z.string().optional(),
	workCategory: z.string().min(1, "Work category is required"),
	status: z.string().min(1, "Status is required"),
	sampleSplit: z.boolean(),
	splitSampleId: z.array(z.string()),
	tritium: z.boolean(),
	beryllium: z.boolean(),
	betaGamma: z.boolean(),
	spModified: z.string().optional(),
	spCreated: z.string().optional(),
	dbCreatedAt: z.string().optional(),
	dbUpdatedAt: z.string().optional(),
	stage: z.enum(["Initial", "Sync", "Ingest"]).default("Initial"),
});

export type MRFSchema = z.infer<typeof MRFSchema>;

// Alias for backwards compatibility
export type Schema = MRFSchema;

/** Whether NiFi is syncing a booking's folder, as returned by the backend. */
export interface SyncStatus {
	bookingUUID: string;
	/** Relative to the sync source root, e.g. "MRF/12345/0084/67890" */
	folder: string | null;
	enabled: boolean;
	startedAt: string | null;
	stoppedAt: string | null;
	updatedBy: string | null;
}
