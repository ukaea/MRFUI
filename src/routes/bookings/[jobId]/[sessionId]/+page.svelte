<script lang="ts">
	import { Badge } from "$lib/components/ui/badge/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import * as Card from "$lib/components/ui/card/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import { Label } from "$lib/components/ui/label/index.js";
	import { Textarea } from "$lib/components/ui/textarea/index.js";
	import * as Select from "$lib/components/ui/select/index.js";
	import { Checkbox } from "$lib/components/ui/checkbox/index.js";
	import { Collapsible } from "bits-ui";
	import { enhance, deserialize } from "$app/forms";
	import { invalidateAll } from "$app/navigation";
	import ArrowLeftIcon from "@tabler/icons-svelte/icons/arrow-left";
	import LoaderIcon from "@tabler/icons-svelte/icons/loader-2";
	import PlusIcon from "@tabler/icons-svelte/icons/plus";
	import XIcon from "@tabler/icons-svelte/icons/x";
	import ChevronDownIcon from "@tabler/icons-svelte/icons/chevron-down";
	import LockIcon from "@tabler/icons-svelte/icons/lock";
	import LockOpenIcon from "@tabler/icons-svelte/icons/lock-open";
	import FolderIcon from "@tabler/icons-svelte/icons/folder";
	import FolderOpenIcon from "@tabler/icons-svelte/icons/folder-open";
	import CircleCheckIcon from "@tabler/icons-svelte/icons/circle-check";
	import { Progress } from "$lib/components/ui/progress/index.js";
	import { MRFSchema } from "$lib/components/schemas";
	import type { MRFSchema as MRFSchemaType } from "$lib/components/schemas";

	let { data } = $props();

	// Create editable form state from the booking data
	let form = $state<MRFSchemaType>({ ...data.booking });

	// Track if form has been modified
	let isDirty = $derived(JSON.stringify(form) !== JSON.stringify(data.booking));

	let saving = $state(false);
	let saveError = $state("");
	let saveResult = $state<"idle" | "success" | "error">("idle");

	// Stage state
	const STAGES = ["Initial", "Data Export", "Ingest"] as const;
	type Stage = (typeof STAGES)[number];

	let currentStage = $derived<Stage>((form.stage as Stage) || "Initial");
	let isFormEditable = $derived(currentStage === "Initial");

	// Global lock state (locked by default)
	let formLocked = $state(true);

	function toggleLock() {
		formLocked = !formLocked;
	}

	let isDisabled = $derived(!isFormEditable || formLocked);

	// Collapsible open states
	let importedOpen = $state(true);
	let dataExportOpen = $state(false);
	let ingestOpen = $state(false);

	// Re-sync form and collapsible states when server data changes (e.g. after stage progression)
	$effect(() => {
		if (data.booking.stage !== form.stage) {
			form = { ...data.booking };
		}
	});

	$effect(() => {
		const stage = (data.booking.stage as Stage) || "Initial";
		importedOpen = stage === "Initial";
		dataExportOpen = stage === "Data Export";
		ingestOpen = stage === "Ingest";
	});

	// Stage action loading states
	let progressingStage = $state(false);
	let progressStageResult = $state<"idle" | "success" | "error">("idle");
	let progressIngestResult = $state<"idle" | "success" | "error">("idle");
	let creatingFolders = $state(false);
	let createFoldersResult = $state<"idle" | "success" | "error">("idle");
	let createFoldersMessage = $state("");
	let startingTransfer = $state(false);
	let setupDataExportResult = $state<"idle" | "success" | "error">("idle");
	let setupDataExportMessage = $state("");
	let exportStats = $state<Record<string, unknown> | null>(null);
	let transferring = $state(false);
	let transferResult = $state<"idle" | "success" | "error">("idle");
	let transferMessage = $state("");
	let transferProgress = $state(0);
	let ingesting = $state(false);
	let ingestStepsComplete = $state(0); // 0 = not started, 1-4 = steps done
	let ingestDone = $state(false);
	let ingestCatalogueUrl = $state("");
	let stageActionError = $state("");
	let stageActionSuccess = $state("");

	// Helper to convert datetime-local input value to ISO string
	function toDateTimeLocal(isoString: string): string {
		const date = new Date(isoString);
		return date.toISOString().slice(0, 16);
	}

	// Helper to convert datetime-local input back to ISO string
	function fromDateTimeLocal(localString: string): string {
		return new Date(localString).toISOString();
	}

	function addToList(field: 'sampleId' | 'splitSampleId') {
		form[field] = [...form[field], ""];
	}

	function removeFromList(field: 'sampleId' | 'splitSampleId', index: number) {
		form[field] = form[field].filter((_, i) => i !== index);
	}

	function updateListItem(field: 'sampleId' | 'splitSampleId', index: number, value: string) {
		const updated = [...form[field]];
		updated[index] = value;
		form[field] = updated;
	}

	// User handling - always arrays, edit first user
	type User = { firstName: string; lastName: string; email: string };

	function getFirstUser(users: User[]): User | undefined {
		return users[0];
	}

	function updateUser(field: 'internalUser' | 'externalUser' | 'scientificSupport', key: keyof User, value: string) {
		const current = form[field];
		if (current.length > 0) {
			const updated = [...current];
			updated[0] = { ...updated[0], [key]: value };
			(form as any)[field] = updated;
		} else {
			(form as any)[field] = [{ firstName: "", lastName: "", email: "", [key]: value }];
		}
	}

	function buildPayload(): Record<string, unknown> {
		return {
			...form,
			sampleId: form.sampleId.filter(s => s.trim()),
			splitSampleId: form.splitSampleId.filter(s => s.trim()),
		};
	}

	function handleCancel() {
		form = { ...data.booking };
		saveError = "";
		fieldErrors = {};
	}

	// Validation
	let fieldErrors = $state<Record<string, string>>({});

	function validateForm(): boolean {
		fieldErrors = {};
		const payload = buildPayload();
		const result = MRFSchema.safeParse(payload);
		if (result.success) return true;

		for (const issue of result.error.issues) {
			const key = issue.path.join(".");
			if (!fieldErrors[key]) {
				fieldErrors[key] = issue.message;
			}
		}
		return false;
	}

	function fieldError(path: string): string | undefined {
		return fieldErrors[path];
	}

	function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
		switch (status) {
			case "Completed": return "default";
			case "In Progress": return "secondary";
			case "Cancelled": return "destructive";
			case "imported": return "outline";
			default: return "outline";
		}
	}

	function stageIndex(stage: Stage): number {
		return STAGES.indexOf(stage);
	}
</script>

<div class="h-full flex-1 flex-col space-y-6 p-8 md:flex">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="outline" size="icon" href="/bookings">
				<ArrowLeftIcon class="h-4 w-4" />
			</Button>
			<div>
				<h2 class="text-2xl font-bold tracking-tight">
					Booking: {form.jobId}/{form.sessionId}
				</h2>
				<p class="text-muted-foreground">
					{form.seidDescription || `SEID ${form.seid}`}
				</p>
			</div>
		</div>
		<div class="flex items-center gap-2">
			{#if isFormEditable}
				<Button variant="ghost" size="icon" onclick={toggleLock}>
					{#if formLocked}
						<LockIcon class="size-5" />
					{:else}
						<LockOpenIcon class="size-5" />
					{/if}
				</Button>
			{/if}
			<Badge variant="outline" class="text-sm">Stage: {currentStage}</Badge>
		</div>
	</div>

	<!-- Stage 1: Initial -->
	<Collapsible.Root bind:open={importedOpen} class="rounded-xl border">
		<Collapsible.Trigger class="flex w-full items-center justify-between p-4 text-lg font-semibold hover:bg-accent/50 rounded-xl transition-colors">
			<div class="flex items-center gap-3">
				<Badge variant={currentStage === "Initial" ? "default" : "secondary"}>1</Badge>
				<span>Initial</span>
				{#if stageIndex(currentStage) > 0}
					<Badge variant="outline" class="text-xs">Completed</Badge>
				{/if}
			</div>
			<span class="text-muted-foreground transition-transform duration-200" style:transform={importedOpen ? "rotate(180deg)" : "rotate(0deg)"}>
				<ChevronDownIcon class="size-5" />
			</span>
		</Collapsible.Trigger>
		<Collapsible.Content class="border-t">
			<div class="grid gap-6 md:grid-cols-2 p-6">
				<Card.Root>
					<Card.Header>
						<Card.Title>Booking Details</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-4">
						<div class="grid grid-cols-2 gap-4">
							<div class="space-y-2">
								<Label for="jobId">Job ID</Label>
								<Input id="jobId" value={form.jobId} disabled />
							</div>
							<div class="space-y-2">
								<Label for="sessionId">Session ID</Label>
								<Input id="sessionId" value={form.sessionId} disabled />
							</div>
							<div class="space-y-2">
								<Label for="seid">SEID</Label>
								<Input id="seid" bind:value={form.seid} placeholder="e.g. 1001" disabled={isDisabled} />
								{#if fieldError('seid')}
									<p class="text-destructive text-xs">{fieldError('seid')}</p>
								{/if}
							</div>
							<div class="space-y-2">
								<Label for="seidDescription">SEID Description</Label>
								<Input id="seidDescription" bind:value={form.seidDescription} placeholder="Equipment name" disabled={isDisabled} />
							</div>
							<div class="space-y-2">
								<Label for="labLocation">Lab Location</Label>
								<Input id="labLocation" bind:value={form.labLocation} placeholder="e.g. MRF" disabled={isDisabled} />
								{#if fieldError('labLocation')}
									<p class="text-destructive text-xs">{fieldError('labLocation')}</p>
								{/if}
							</div>
							<div class="space-y-2">
								<Label for="labId">Lab ID</Label>
								<Input id="labId" bind:value={form.labId} placeholder="e.g. 0012" disabled={isDisabled} oninput={() => isDirty = true} />
							</div>
							<div class="space-y-2">
								<Label for="workCategory">Work Category</Label>
								<Select.Root type="single" bind:value={form.workCategory} disabled={isDisabled}>
									<Select.Trigger id="workCategory" class="w-full">
										{form.workCategory}
									</Select.Trigger>
									<Select.Content>
										<Select.Item value="User">User</Select.Item>
										<Select.Item value="Engineering">Engineering</Select.Item>
										<Select.Item value="Mainenance">Maintenance</Select.Item>
										<Select.Item value="Environment">Environment</Select.Item>
										<Select.Item value="Repair">Repair</Select.Item>
									</Select.Content>
								</Select.Root>
								{#if fieldError('workCategory')}
									<p class="text-destructive text-xs">{fieldError('workCategory')}</p>
								{/if}
							</div>
							<div class="space-y-2">
								<Label for="status">Status</Label>
								<Select.Root type="single" bind:value={form.status} disabled={isDisabled}>
									<Select.Trigger id="status" class="w-full">
										<Badge variant={getStatusVariant(form.status)}>{form.status}</Badge>
									</Select.Trigger>
									<Select.Content>
										<Select.Item value="imported">Imported</Select.Item>
										<Select.Item value="Scheduled">Scheduled</Select.Item>
										<Select.Item value="In Progress">In Progress</Select.Item>
										<Select.Item value="Completed">Completed</Select.Item>
										<Select.Item value="Cancelled">Cancelled</Select.Item>
									</Select.Content>
								</Select.Root>
								{#if fieldError('status')}
									<p class="text-destructive text-xs">{fieldError('status')}</p>
								{/if}
							</div>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>Schedule</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-4">
						<div class="space-y-2">
							<Label for="bookingStart">Start</Label>
							<Input
								id="bookingStart"
								type="datetime-local"
								value={toDateTimeLocal(form.bookingStart)}
								oninput={(e) => form.bookingStart = fromDateTimeLocal(e.currentTarget.value)}
								disabled={isDisabled}
							/>
							{#if fieldError('bookingStart')}
								<p class="text-destructive text-xs">{fieldError('bookingStart')}</p>
							{/if}
						</div>
						<div class="space-y-2">
							<Label for="bookingEnd">End</Label>
							<Input
								id="bookingEnd"
								type="datetime-local"
								value={toDateTimeLocal(form.bookingEnd)}
								oninput={(e) => form.bookingEnd = fromDateTimeLocal(e.currentTarget.value)}
								disabled={isDisabled}
							/>
							{#if fieldError('bookingEnd')}
								<p class="text-destructive text-xs">{fieldError('bookingEnd')}</p>
							{/if}
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>Sample Information</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-4">
						<div class="space-y-2">
							<Label>Sample ID(s)</Label>
							{#each form.sampleId as _, i}
								<div class="space-y-1">
									<div class="flex items-center gap-2">
										<Input
											value={form.sampleId[i]}
											oninput={(e) => updateListItem('sampleId', i, e.currentTarget.value)}
											placeholder="Sample ID"
											disabled={isDisabled}
										/>
										{#if !isDisabled}
											<Button variant="ghost" size="icon" class="shrink-0" onclick={() => removeFromList('sampleId', i)}>
												<XIcon class="size-4" />
											</Button>
										{/if}
									</div>
									{#if fieldError(`sampleId.${i}`)}
										<p class="text-destructive text-xs">{fieldError(`sampleId.${i}`)}</p>
									{/if}
								</div>
							{/each}
							{#if !isDisabled}
								<Button variant="outline" size="sm" onclick={() => addToList('sampleId')}>
									<PlusIcon class="size-4" />
									Add Sample ID
								</Button>
							{/if}
						</div>
						<div class="flex items-center gap-2">
							<Checkbox
								id="sampleSplit"
								checked={form.sampleSplit}
								onCheckedChange={(checked) => form.sampleSplit = checked === true}
								disabled={isDisabled}
							/>
							<Label for="sampleSplit">Sample Split</Label>
						</div>
						{#if form.sampleSplit}
							<div class="space-y-2">
								<Label>Split Sample ID(s)</Label>
								{#each form.splitSampleId as _, i}
									<div class="flex items-center gap-2">
										<Input
											value={form.splitSampleId[i]}
											oninput={(e) => updateListItem('splitSampleId', i, e.currentTarget.value)}
											placeholder="Split Sample ID"
											disabled={isDisabled}
										/>
										{#if !isDisabled}
											<Button variant="ghost" size="icon" class="shrink-0" onclick={() => removeFromList('splitSampleId', i)}>
												<XIcon class="size-4" />
											</Button>
										{/if}
									</div>
								{/each}
								{#if !isDisabled}
									<Button variant="outline" size="sm" onclick={() => addToList('splitSampleId')}>
										<PlusIcon class="size-4" />
										Add Split Sample ID
									</Button>
								{/if}
							</div>
						{/if}
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>Hazards</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-4">
						<div class="flex items-center gap-2">
							<Checkbox
								id="tritium"
								checked={form.tritium}
								onCheckedChange={(checked) => form.tritium = checked === true}
								disabled={isDisabled}
							/>
							<Label for="tritium">Tritium</Label>
						</div>
						<div class="flex items-center gap-2">
							<Checkbox
								id="beryllium"
								checked={form.beryllium}
								onCheckedChange={(checked) => form.beryllium = checked === true}
								disabled={isDisabled}
							/>
							<Label for="beryllium">Beryllium</Label>
						</div>
						<div class="flex items-center gap-2">
							<Checkbox
								id="betaGamma"
								checked={form.betaGamma}
								onCheckedChange={(checked) => form.betaGamma = checked === true}
								disabled={isDisabled}
							/>
							<Label for="betaGamma">Beta/Gamma</Label>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>Internal User</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-4">
						{@const user = getFirstUser(form.internalUser)}
						<div class="grid grid-cols-2 gap-4">
							<div class="space-y-2">
								<Label for="internalFirstName">First Name</Label>
								<Input
									id="internalFirstName"
									value={user?.firstName ?? ""}
									oninput={(e) => updateUser('internalUser', 'firstName', e.currentTarget.value)}
									disabled={isDisabled}
								/>
								{#if fieldError('internalUser.0.firstName')}
									<p class="text-destructive text-xs">{fieldError('internalUser.0.firstName')}</p>
								{/if}
							</div>
							<div class="space-y-2">
								<Label for="internalLastName">Last Name</Label>
								<Input
									id="internalLastName"
									value={user?.lastName ?? ""}
									oninput={(e) => updateUser('internalUser', 'lastName', e.currentTarget.value)}
									disabled={isDisabled}
								/>
								{#if fieldError('internalUser.0.lastName')}
									<p class="text-destructive text-xs">{fieldError('internalUser.0.lastName')}</p>
								{/if}
							</div>
						</div>
						<div class="space-y-2">
							<Label for="internalEmail">Email</Label>
							<Input
								id="internalEmail"
								type="email"
								value={user?.email ?? ""}
								oninput={(e) => updateUser('internalUser', 'email', e.currentTarget.value)}
								disabled={isDisabled}
							/>
							{#if fieldError('internalUser.0.email')}
								<p class="text-destructive text-xs">{fieldError('internalUser.0.email')}</p>
							{/if}
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>External User</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-4">
						{@const user = getFirstUser(form.externalUser)}
						<div class="grid grid-cols-2 gap-4">
							<div class="space-y-2">
								<Label for="externalFirstName">First Name</Label>
								<Input
									id="externalFirstName"
									value={user?.firstName ?? ""}
									oninput={(e) => updateUser('externalUser', 'firstName', e.currentTarget.value)}
									disabled={isDisabled}
								/>
								{#if fieldError('externalUser.0.firstName')}
									<p class="text-destructive text-xs">{fieldError('externalUser.0.firstName')}</p>
								{/if}
							</div>
							<div class="space-y-2">
								<Label for="externalLastName">Last Name</Label>
								<Input
									id="externalLastName"
									value={user?.lastName ?? ""}
									oninput={(e) => updateUser('externalUser', 'lastName', e.currentTarget.value)}
									disabled={isDisabled}
								/>
								{#if fieldError('externalUser.0.lastName')}
									<p class="text-destructive text-xs">{fieldError('externalUser.0.lastName')}</p>
								{/if}
							</div>
						</div>
						<div class="space-y-2">
							<Label for="externalEmail">Email</Label>
							<Input
								id="externalEmail"
								type="email"
								value={user?.email ?? ""}
								oninput={(e) => updateUser('externalUser', 'email', e.currentTarget.value)}
								disabled={isDisabled}
							/>
							{#if fieldError('externalUser.0.email')}
								<p class="text-destructive text-xs">{fieldError('externalUser.0.email')}</p>
							{/if}
						</div>
						<div class="space-y-2">
							<Label for="institution">Institution</Label>
							<Input
								id="institution"
								bind:value={form.institution}
								disabled={isDisabled}
							/>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>Scientific Support</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-4">
						{@const user = getFirstUser(form.scientificSupport)}
						<div class="grid grid-cols-2 gap-4">
							<div class="space-y-2">
								<Label for="supportFirstName">First Name</Label>
								<Input
									id="supportFirstName"
									value={user?.firstName ?? ""}
									oninput={(e) => updateUser('scientificSupport', 'firstName', e.currentTarget.value)}
									disabled={isDisabled}
								/>
								{#if fieldError('scientificSupport.0.firstName')}
									<p class="text-destructive text-xs">{fieldError('scientificSupport.0.firstName')}</p>
								{/if}
							</div>
							<div class="space-y-2">
								<Label for="supportLastName">Last Name</Label>
								<Input
									id="supportLastName"
									value={user?.lastName ?? ""}
									oninput={(e) => updateUser('scientificSupport', 'lastName', e.currentTarget.value)}
									disabled={isDisabled}
								/>
								{#if fieldError('scientificSupport.0.lastName')}
									<p class="text-destructive text-xs">{fieldError('scientificSupport.0.lastName')}</p>
								{/if}
							</div>
						</div>
						<div class="space-y-2">
							<Label for="supportEmail">Email</Label>
							<Input
								id="supportEmail"
								type="email"
								value={user?.email ?? ""}
								oninput={(e) => updateUser('scientificSupport', 'email', e.currentTarget.value)}
								disabled={isDisabled}
							/>
							{#if fieldError('scientificSupport.0.email')}
								<p class="text-destructive text-xs">{fieldError('scientificSupport.0.email')}</p>
							{/if}
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>Notes</Card.Title>
					</Card.Header>
					<Card.Content>
						<Textarea
							bind:value={form.notes}
							placeholder="Additional notes about this booking..."
							rows={4}
							disabled={isDisabled}
						/>
					</Card.Content>
				</Card.Root>
			</div>

			{#if currentStage === "Initial"}
				<div class="flex justify-between gap-2 border-t px-6 py-4">
					<form
						method="POST"
						action="?/progressStage&uuid={form.bookingUUID}"
						use:enhance={() => {
							if (!validateForm()) {
								stageActionError = "Please fix the validation errors before progressing";
								return async () => {};
							}
							progressingStage = true;
							stageActionError = "";
							progressStageResult = "idle";
							return async ({ result }) => {
								progressingStage = false;
								if (result.type === "success") {
									fieldErrors = {};
									progressStageResult = "success";
									await new Promise(resolve => setTimeout(resolve, 600));
									await invalidateAll();
									progressStageResult = "idle";
								} else if (result.type === "failure" && result.data) {
									stageActionError = result.data.error as string;
									progressStageResult = "error";
									setTimeout(() => { progressStageResult = "idle"; }, 3000);
								} else {
									stageActionError = "Failed to progress stage";
									progressStageResult = "error";
									setTimeout(() => { progressStageResult = "idle"; }, 3000);
								}
							};
						}}
					>
						<input type="hidden" name="stage" value="Data Export" />
						<Button
							type="submit"
							disabled={progressingStage || isDirty}
							variant={progressStageResult === "error" ? "destructive" : "default"}
							class={progressStageResult === "success" ? "bg-green-600 hover:bg-green-600 text-white" : ""}
						>
							{#if progressingStage}
								<LoaderIcon class="size-4 animate-spin" />
								Progressing...
							{:else if progressStageResult === "success"}
								Progressed!
							{:else if progressStageResult === "error"}
								Failed
							{:else}
								Progress to Data Export
							{/if}
						</Button>
					</form>
					<div class="flex items-center gap-2">
						{#if saveError}
							<span class="text-destructive text-sm">{saveError}</span>
						{/if}
						{#if stageActionError}
							<span class="text-destructive text-sm">{stageActionError}</span>
						{/if}
						<Button variant="outline" onclick={handleCancel} disabled={!isDirty || saving}>
							Cancel
						</Button>
						<form
							method="POST"
							action="?/save&uuid={form.bookingUUID}"
							use:enhance={() => {
								if (!validateForm()) {
									saveError = "Validation errors";
									saveResult = "error";
									setTimeout(() => { saveResult = "idle"; saveError = ""; }, 2000);
									return async () => {};
								}
								saving = true;
								saveError = "";
								saveResult = "idle";
								return async ({ result }) => {
									saving = false;
									if (result.type === "success") {
										fieldErrors = {};
										saveResult = "success";
										await invalidateAll();
										form = { ...data.booking };
										setTimeout(() => { saveResult = "idle"; }, 2000);
									} else if (result.type === "failure" && result.data) {
										saveError = result.data.error as string;
										saveResult = "error";
										// Conflict — SharePoint had newer data, reload to show it
										if (result.status === 409) {
											await invalidateAll();
										}
										setTimeout(() => { saveResult = "idle"; }, 3000);
									} else {
										saveError = "Failed to save booking";
										saveResult = "error";
										setTimeout(() => { saveResult = "idle"; }, 3000);
									}
								};
							}}
						>
							<input type="hidden" name="payload" value={JSON.stringify(buildPayload())} />
							<Button
								type="submit"
								disabled={!isDirty || saving}
								variant={saveResult === "success" ? "default" : saveResult === "error" ? "destructive" : "default"}
								class={saveResult === "success" ? "bg-green-600 hover:bg-green-600 text-white" : ""}
							>
								{#if saving}
									<LoaderIcon class="size-4 animate-spin" />
									Saving...
								{:else if saveResult === "success"}
									Saved
								{:else if saveResult === "error"}
									Save Failed
								{:else}
									Save Changes
								{/if}
							</Button>
						</form>
					</div>
				</div>
			{/if}
		</Collapsible.Content>
	</Collapsible.Root>

	<!-- Stage 2: Data Export -->
	<Collapsible.Root bind:open={dataExportOpen} class="rounded-xl border">
		<Collapsible.Trigger class="flex w-full items-center justify-between p-4 text-lg font-semibold hover:bg-accent/50 rounded-xl transition-colors">
			<div class="flex items-center gap-3">
				<Badge variant={currentStage === "Data Export" ? "default" : stageIndex(currentStage) > 1 ? "secondary" : "outline"}>2</Badge>
				<span>Data Export</span>
				{#if stageIndex(currentStage) > 1}
					<Badge variant="outline" class="text-xs">Completed</Badge>
				{/if}
			</div>
			<span class="text-muted-foreground transition-transform duration-200" style:transform={dataExportOpen ? "rotate(180deg)" : "rotate(0deg)"}>
				<ChevronDownIcon class="size-5" />
			</span>
		</Collapsible.Trigger>
		<Collapsible.Content class="border-t p-6">
			{#if stageIndex(currentStage) < 1}
				<p class="text-muted-foreground text-sm">Complete the Initial stage before accessing Data Export.</p>
			{:else}
				<div class="space-y-4">
					{#if stageActionError}
						<div class="text-destructive text-sm">{stageActionError}</div>
					{/if}
					{#if stageActionSuccess}
						<div class="text-sm text-green-600">{stageActionSuccess}</div>
					{/if}

					<div class="space-y-2">
						<p class="font-medium text-sm">Create the directory structure for this booking</p>
						<div class="flex items-center gap-3">
						<form
							method="POST"
							action="?/createFolders&uuid={form.bookingUUID}"
							use:enhance={() => {
								creatingFolders = true;
								createFoldersResult = "idle";
								createFoldersMessage = "";
								return async ({ result }) => {
									creatingFolders = false;
									if (result.type === "success") {
										createFoldersResult = "success";
										createFoldersMessage = "Folders created successfully";
									} else if (result.type === "failure" && result.data) {
										createFoldersResult = "error";
										createFoldersMessage = result.data.error as string;
										setTimeout(() => { createFoldersResult = "idle"; createFoldersMessage = ""; }, 3000);
									} else {
										createFoldersResult = "error";
										createFoldersMessage = "Failed to create folders";
										setTimeout(() => { createFoldersResult = "idle"; createFoldersMessage = ""; }, 3000);
									}
								};
							}}
						>
							<Button
								type="submit"
								disabled={creatingFolders || currentStage !== "Data Export"}
								variant={createFoldersResult === "error" ? "destructive" : createFoldersResult === "success" ? "default" : "outline"}
								class="w-44 {createFoldersResult === 'success' ? 'bg-green-600 hover:bg-green-600 text-white' : ''}"
							>
								{#if creatingFolders}<LoaderIcon class="size-4 animate-spin" />{/if}
								Create Folders
							</Button>
						</form>
						{#if createFoldersMessage}
							<span class={createFoldersResult === "success" ? "text-sm text-green-600" : "text-sm text-destructive"}>{createFoldersMessage}</span>
						{/if}
						</div>
						<div class="bg-muted/50 rounded-md border px-4 py-3 font-mono text-sm space-y-1">
							<div class="flex items-center gap-1.5">
								<FolderOpenIcon class="size-4 text-yellow-500 shrink-0" />
								<span>MRF</span>
								{#if createFoldersResult === "success"}<CircleCheckIcon class="size-4 text-green-500 shrink-0" />{/if}
							</div>
							<div class="flex items-center gap-1.5 pl-5">
								<span class="text-muted-foreground select-none">└─</span>
								<FolderOpenIcon class="size-4 text-yellow-500 shrink-0" />
								<span>{form.jobId}</span>
								{#if createFoldersResult === "success"}<CircleCheckIcon class="size-4 text-green-500 shrink-0" />{/if}
							</div>
							<div class="flex items-center gap-1.5 pl-10">
								<span class="text-muted-foreground select-none">└─</span>
								<FolderOpenIcon class="size-4 text-yellow-500 shrink-0" />
								<span>{form.seid}</span>
								{#if createFoldersResult === "success"}<CircleCheckIcon class="size-4 text-green-500 shrink-0" />{/if}
							</div>
							<div class="flex items-center gap-1.5 pl-16">
								<span class="text-muted-foreground select-none">└─</span>
								<FolderIcon class="size-4 text-yellow-500 shrink-0" />
								<span>{form.sessionId}</span>
								{#if createFoldersResult === "success"}<CircleCheckIcon class="size-4 text-green-500 shrink-0" />{/if}
							</div>
						</div>
					</div>

					<div class="space-y-2 border-t pt-4">
						<p class="font-medium text-sm">Configure data export for this booking</p>
						<div class="flex items-center gap-3">
							<form
								method="POST"
								action="?/setupDataExport&uuid={form.bookingUUID}"
								use:enhance={() => {
									startingTransfer = true;
									setupDataExportResult = "idle";
									setupDataExportMessage = "";
									exportStats = null;
									return async ({ result }) => {
										startingTransfer = false;
										if (result.type === "success" && result.data) {
											setupDataExportResult = "success";
											setupDataExportMessage = "Data export setup successfully";
											exportStats = (result.data as { stats: Record<string, unknown> }).stats ?? null;
										} else if (result.type === "failure" && result.data) {
											setupDataExportResult = "error";
											setupDataExportMessage = result.data.error as string;
											setTimeout(() => { setupDataExportResult = "idle"; setupDataExportMessage = ""; }, 3000);
										} else {
											setupDataExportResult = "error";
											setupDataExportMessage = "Failed to setup data export";
											setTimeout(() => { setupDataExportResult = "idle"; setupDataExportMessage = ""; }, 3000);
										}
									};
								}}
							>
								<Button
									type="submit"
									disabled={startingTransfer || currentStage !== "Data Export"}
									variant={setupDataExportResult === "error" ? "destructive" : setupDataExportResult === "success" ? "default" : "outline"}
									class="w-44 {setupDataExportResult === 'success' ? 'bg-green-600 hover:bg-green-600 text-white' : ''}"
								>
									{#if startingTransfer}<LoaderIcon class="size-4 animate-spin" />{/if}
									Setup Data Export
								</Button>
							</form>
							{#if setupDataExportMessage && setupDataExportResult === "error"}
								<span class="text-sm text-destructive">{setupDataExportMessage}</span>
							{/if}
						</div>
						{#if exportStats}
							<div class="bg-muted/50 rounded-md border px-4 py-3 space-y-1 text-sm">
								<div>
									<span class="text-muted-foreground">Total Number of Files:</span> <span class="font-medium">{exportStats.files}</span>
								</div>
								<div>
									<span class="text-muted-foreground">Total Size:</span> <span class="font-medium">{exportStats.size_mb} MB</span>
								</div>
							</div>
							<div class="space-y-2 pt-3">
								<form
									method="POST"
									action="?/transfer&uuid={form.bookingUUID}"
									use:enhance={() => {
										transferring = true;
										transferResult = "idle";
										transferMessage = "";
										transferProgress = 0;
										setTimeout(() => { transferProgress = 85; }, 50);
										return async ({ result }) => {
											await new Promise(resolve => setTimeout(resolve, 3000));
											transferring = false;
											if (result.type === "success") {
												transferProgress = 100;
												transferResult = "success";
											} else if (result.type === "failure" && result.data) {
												transferProgress = 100;
												transferResult = "error";
												transferMessage = result.data.error as string;
												setTimeout(() => { transferResult = "idle"; transferProgress = 0; transferMessage = ""; }, 3000);
											} else {
												transferProgress = 100;
												transferResult = "error";
												transferMessage = "Failed to start transfer";
												setTimeout(() => { transferResult = "idle"; transferProgress = 0; transferMessage = ""; }, 3000);
											}
										};
									}}
								>
									<Button
										type="submit"
										disabled={transferring || transferResult === "success" || currentStage !== "Data Export"}
										variant={transferResult === "error" ? "destructive" : transferResult === "success" ? "default" : "outline"}
										class="w-44 {transferResult === 'success' ? 'bg-green-600 hover:bg-green-600 text-white' : ''}"
									>
										{#if transferring}
											<LoaderIcon class="size-4 animate-spin" />
											Transferring
										{:else if transferResult === "success"}
											Complete
										{:else}
											Start Transfer
										{/if}
									</Button>
								</form>
								{#if transferring || transferResult !== "idle"}
									<Progress
										value={transferProgress}
										class="h-3 {transferResult === 'success' ? '[&>[data-slot=progress-indicator]]:bg-green-500' : transferResult === 'error' ? '[&>[data-slot=progress-indicator]]:bg-destructive' : ''}"
									/>
								{/if}
								{#if transferMessage}
									<span class="text-sm text-destructive">{transferMessage}</span>
								{/if}
							</div>
						{/if}
					</div>

					{#if currentStage === "Data Export"}
						<div class="flex items-center gap-3 border-t pt-4">
							<form
								method="POST"
								action="?/progressStage&uuid={form.bookingUUID}"
								use:enhance={() => {
									progressingStage = true;
									stageActionError = "";
									progressIngestResult = "idle";
									return async ({ result }) => {
										progressingStage = false;
										if (result.type === "success") {
											progressIngestResult = "success";
											await new Promise(resolve => setTimeout(resolve, 600));
											await invalidateAll();
											progressIngestResult = "idle";
										} else if (result.type === "failure" && result.data) {
											stageActionError = result.data.error as string;
											progressIngestResult = "error";
											setTimeout(() => { progressIngestResult = "idle"; }, 3000);
										} else {
											stageActionError = "Failed to progress stage";
											progressIngestResult = "error";
											setTimeout(() => { progressIngestResult = "idle"; }, 3000);
										}
									};
								}}
							>
								<input type="hidden" name="stage" value="Ingest" />
								<Button
									type="submit"
									disabled={progressingStage}
									variant={progressIngestResult === "error" ? "destructive" : "default"}
									class={progressIngestResult === "success" ? "bg-green-600 hover:bg-green-600 text-white" : ""}
								>
									{#if progressingStage}
										<LoaderIcon class="size-4 animate-spin" />
										Progressing...
									{:else if progressIngestResult === "success"}
										Progressed!
									{:else if progressIngestResult === "error"}
										Failed
									{:else}
										Progress to Ingest
									{/if}
								</Button>
							</form>
							<form
								method="POST"
								action="?/progressStage&uuid={form.bookingUUID}"
								use:enhance={() => {
									progressingStage = true;
									stageActionError = "";
									return async ({ result }) => {
										progressingStage = false;
										if (result.type === "success") {
											await invalidateAll();
										} else if (result.type === "failure" && result.data) {
											stageActionError = result.data.error as string;
										} else {
											stageActionError = "Failed to progress stage";
										}
									};
								}}
							>
								<input type="hidden" name="stage" value="Initial" />
								<Button type="submit" variant="outline" disabled={progressingStage}>
									Revert to Initial
								</Button>
							</form>
						</div>
					{/if}
				</div>
			{/if}
		</Collapsible.Content>
	</Collapsible.Root>

	<!-- Stage 3: Ingest -->
	<Collapsible.Root bind:open={ingestOpen} class="rounded-xl border">
		<Collapsible.Trigger class="flex w-full items-center justify-between p-4 text-lg font-semibold hover:bg-accent/50 rounded-xl transition-colors">
			<div class="flex items-center gap-3">
				<Badge variant={currentStage === "Ingest" ? "default" : "outline"}>3</Badge>
				<span>Ingest</span>
			</div>
			<span class="text-muted-foreground transition-transform duration-200" style:transform={ingestOpen ? "rotate(180deg)" : "rotate(0deg)"}>
				<ChevronDownIcon class="size-5" />
			</span>
		</Collapsible.Trigger>
		<Collapsible.Content class="border-t p-6">
			{#if stageIndex(currentStage) < 2}
				<p class="text-muted-foreground text-sm">Complete earlier stages before accessing Ingest.</p>
			{:else}
				<div class="space-y-4">
					<p class="text-muted-foreground text-sm">
						Send to data catalogue and finalize this booking
					</p>

					{#if stageActionError}
						<div class="text-destructive text-sm">{stageActionError}</div>
					{/if}
					{#if stageActionSuccess}
						<div class="text-sm text-green-600">{stageActionSuccess}</div>
					{/if}

					<div class="space-y-3">
						<div class="flex items-center gap-3">
						<Button
							disabled={ingesting || ingestDone}
							onclick={async () => {
								ingesting = true;
								ingestStepsComplete = 0;
								ingestDone = false;
								ingestCatalogueUrl = "";
								stageActionError = "";

								// Step 1: Process
								const fd1 = new FormData();
								fd1.set("payload", JSON.stringify(buildPayload()));
								const processRes = await fetch(`?/processIngest&uuid=${form.bookingUUID}`, {
									method: "POST",
									body: fd1,
								});
								const processResult = deserialize(await processRes.text());
								if (processResult.type === "failure" || processResult.type === "error") {
									stageActionError = (processResult.type === "failure" ? processResult.data?.error : processResult.error?.message) ?? "Processing failed";
									ingesting = false;
									return;
								}
								const normalised = ((processResult as unknown) as { type: "success"; data: { data: unknown } }).data?.data;
								ingestStepsComplete = 1;

								// Step 2: Map
								const fd2 = new FormData();
								fd2.set("data", JSON.stringify(normalised));
								const mapRes = await fetch(`?/mapIngest&uuid=${form.bookingUUID}`, {
									method: "POST",
									body: fd2,
								});
								const mapResult = deserialize(await mapRes.text());
								if (mapResult.type === "failure" || mapResult.type === "error") {
									stageActionError = (mapResult.type === "failure" ? mapResult.data?.error : mapResult.error?.message) ?? "Mapping failed";
									ingesting = false;
									return;
								}
								const mapped = ((mapResult as unknown) as { type: "success"; data: { data: unknown } }).data?.data;
								ingestStepsComplete = 2;

								// Step 3: Validating (dummy)
								await new Promise(r => setTimeout(r, 700));
								ingestStepsComplete = 3;

								// Step 4: Ingest to data catalogue
								const fd3 = new FormData();
								fd3.set("data", JSON.stringify(mapped));
								const submitRes = await fetch(`?/submitIngest&uuid=${form.bookingUUID}`, {
									method: "POST",
									body: fd3,
								});
								const submitResult = deserialize(await submitRes.text());
								if (submitResult.type === "failure" || submitResult.type === "error") {
									stageActionError = (submitResult.type === "failure" ? submitResult.data?.error : submitResult.error?.message) ?? "Ingestion failed";
									ingesting = false;
									return;
								}
								const submitData = ((submitResult as unknown) as { type: "success"; data: { data: unknown } }).data?.data;
								ingestStepsComplete = 4;
								ingestDone = true;
								ingestCatalogueUrl = (submitData as { url?: string })?.url ?? `${form.bookingUUID}`;
								ingesting = false;
							}}
						>
							{#if ingesting}
								<LoaderIcon class="size-4 animate-spin" />
								Ingesting...
							{:else}
								Ingest to Data Catalogue
							{/if}
						</Button>
							<form
								method="POST"
								action="?/progressStage&uuid={form.bookingUUID}"
								use:enhance={() => {
									progressingStage = true;
									stageActionError = "";
									return async ({ result }) => {
										progressingStage = false;
										if (result.type === "success") {
											await invalidateAll();
										} else if (result.type === "failure" && result.data) {
											stageActionError = result.data.error as string;
										} else {
											stageActionError = "Failed to progress stage";
										}
									};
								}}
							>
								<input type="hidden" name="stage" value="Data Export" />
								<Button type="submit" variant="outline" disabled={progressingStage}>
									Revert to Data Export
								</Button>
							</form>
						</div>
						{#if ingesting || ingestStepsComplete > 0}
							<div class="bg-muted/50 rounded-md border px-4 py-3 space-y-2 text-sm">
								{#each [
									"Processing",
									"Mapping",
									"Validating",
									"Ingesting",
								] as step, i}
									<div class="flex items-center gap-2">
										{#if ingestStepsComplete > i}
											<CircleCheckIcon class="size-4 text-green-500 shrink-0" />
										{:else}
											<LoaderIcon class="size-4 animate-spin text-muted-foreground shrink-0" />
										{/if}
										<span class={ingestStepsComplete > i ? "text-foreground" : "text-muted-foreground"}>{step}</span>
									</div>
								{/each}
							</div>
						{/if}
						{#if ingestDone}
							<p class="text-sm text-muted-foreground">
								Data ingestion complete: <a href={ingestCatalogueUrl} class="text-primary underline underline-offset-2">{ingestCatalogueUrl}</a>
							</p>
						{/if}
					</div>
				</div>
			{/if}
		</Collapsible.Content>
	</Collapsible.Root>
</div>
