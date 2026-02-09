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
	import { enhance } from "$app/forms";
	import { invalidateAll } from "$app/navigation";
	import ArrowLeftIcon from "@tabler/icons-svelte/icons/arrow-left";
	import LoaderIcon from "@tabler/icons-svelte/icons/loader-2";
	import PlusIcon from "@tabler/icons-svelte/icons/plus";
	import XIcon from "@tabler/icons-svelte/icons/x";
	import ChevronDownIcon from "@tabler/icons-svelte/icons/chevron-down";
	import type { MRFSchema } from "$lib/components/schemas";

	let { data } = $props();

	// Create editable form state from the booking data
	let form = $state<MRFSchema>({ ...data.booking });

	// Track if form has been modified
	let isDirty = $derived(JSON.stringify(form) !== JSON.stringify(data.booking));

	let saving = $state(false);
	let saveError = $state("");

	// Stage state
	const STAGES = ["Initial", "Data Export", "Ingest"] as const;
	type Stage = (typeof STAGES)[number];

	let currentStage = $derived<Stage>((form.stage as Stage) || "Initial");
	let isFormEditable = $derived(currentStage === "Initial");

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
	let creatingFolders = $state(false);
	let startingTransfer = $state(false);
	let ingesting = $state(false);
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
		<Badge variant="outline" class="text-sm">Stage: {currentStage}</Badge>
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
								<Input id="seid" bind:value={form.seid} placeholder="e.g. 1001" disabled={!isFormEditable} />
							</div>
							<div class="space-y-2">
								<Label for="seidDescription">SEID Description</Label>
								<Input id="seidDescription" bind:value={form.seidDescription} placeholder="Equipment name" disabled={!isFormEditable} />
							</div>
							<div class="space-y-2">
								<Label for="labLocation">Lab Location</Label>
								<Input id="labLocation" bind:value={form.labLocation} placeholder="e.g. MRF" disabled={!isFormEditable} />
							</div>
							<div class="space-y-2">
								<Label for="workCategory">Work Category</Label>
								<Select.Root type="single" bind:value={form.workCategory} disabled={!isFormEditable}>
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
							</div>
							<div class="space-y-2">
								<Label for="status">Status</Label>
								<Select.Root type="single" bind:value={form.status} disabled={!isFormEditable}>
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
								onchange={(e) => form.bookingStart = fromDateTimeLocal(e.currentTarget.value)}
								disabled={!isFormEditable}
							/>
						</div>
						<div class="space-y-2">
							<Label for="bookingEnd">End</Label>
							<Input
								id="bookingEnd"
								type="datetime-local"
								value={toDateTimeLocal(form.bookingEnd)}
								onchange={(e) => form.bookingEnd = fromDateTimeLocal(e.currentTarget.value)}
								disabled={!isFormEditable}
							/>
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
								<div class="flex items-center gap-2">
									<Input
										value={form.sampleId[i]}
										onchange={(e) => updateListItem('sampleId', i, e.currentTarget.value)}
										placeholder="Sample ID"
										disabled={!isFormEditable}
									/>
									{#if isFormEditable}
										<Button variant="ghost" size="icon" class="shrink-0" onclick={() => removeFromList('sampleId', i)}>
											<XIcon class="size-4" />
										</Button>
									{/if}
								</div>
							{/each}
							{#if isFormEditable}
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
								disabled={!isFormEditable}
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
											onchange={(e) => updateListItem('splitSampleId', i, e.currentTarget.value)}
											placeholder="Split Sample ID"
											disabled={!isFormEditable}
										/>
										{#if isFormEditable}
											<Button variant="ghost" size="icon" class="shrink-0" onclick={() => removeFromList('splitSampleId', i)}>
												<XIcon class="size-4" />
											</Button>
										{/if}
									</div>
								{/each}
								{#if isFormEditable}
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
								disabled={!isFormEditable}
							/>
							<Label for="tritium">Tritium</Label>
						</div>
						<div class="flex items-center gap-2">
							<Checkbox
								id="beryllium"
								checked={form.beryllium}
								onCheckedChange={(checked) => form.beryllium = checked === true}
								disabled={!isFormEditable}
							/>
							<Label for="beryllium">Beryllium</Label>
						</div>
						<div class="flex items-center gap-2">
							<Checkbox
								id="betaGamma"
								checked={form.betaGamma}
								onCheckedChange={(checked) => form.betaGamma = checked === true}
								disabled={!isFormEditable}
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
									onchange={(e) => updateUser('internalUser', 'firstName', e.currentTarget.value)}
									disabled={!isFormEditable}
								/>
							</div>
							<div class="space-y-2">
								<Label for="internalLastName">Last Name</Label>
								<Input
									id="internalLastName"
									value={user?.lastName ?? ""}
									onchange={(e) => updateUser('internalUser', 'lastName', e.currentTarget.value)}
									disabled={!isFormEditable}
								/>
							</div>
						</div>
						<div class="space-y-2">
							<Label for="internalEmail">Email</Label>
							<Input
								id="internalEmail"
								type="email"
								value={user?.email ?? ""}
								onchange={(e) => updateUser('internalUser', 'email', e.currentTarget.value)}
								disabled={!isFormEditable}
							/>
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
									onchange={(e) => updateUser('externalUser', 'firstName', e.currentTarget.value)}
									disabled={!isFormEditable}
								/>
							</div>
							<div class="space-y-2">
								<Label for="externalLastName">Last Name</Label>
								<Input
									id="externalLastName"
									value={user?.lastName ?? ""}
									onchange={(e) => updateUser('externalUser', 'lastName', e.currentTarget.value)}
									disabled={!isFormEditable}
								/>
							</div>
						</div>
						<div class="space-y-2">
							<Label for="externalEmail">Email</Label>
							<Input
								id="externalEmail"
								type="email"
								value={user?.email ?? ""}
								onchange={(e) => updateUser('externalUser', 'email', e.currentTarget.value)}
								disabled={!isFormEditable}
							/>
						</div>
						<div class="space-y-2">
							<Label for="institution">Institution</Label>
							<Input
								id="institution"
								bind:value={form.institution}
								disabled={!isFormEditable}
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
									onchange={(e) => updateUser('scientificSupport', 'firstName', e.currentTarget.value)}
									disabled={!isFormEditable}
								/>
							</div>
							<div class="space-y-2">
								<Label for="supportLastName">Last Name</Label>
								<Input
									id="supportLastName"
									value={user?.lastName ?? ""}
									onchange={(e) => updateUser('scientificSupport', 'lastName', e.currentTarget.value)}
									disabled={!isFormEditable}
								/>
							</div>
						</div>
						<div class="space-y-2">
							<Label for="supportEmail">Email</Label>
							<Input
								id="supportEmail"
								type="email"
								value={user?.email ?? ""}
								onchange={(e) => updateUser('scientificSupport', 'email', e.currentTarget.value)}
								disabled={!isFormEditable}
							/>
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
							disabled={!isFormEditable}
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
						<Button type="submit" disabled={progressingStage}>
							{#if progressingStage}
								<LoaderIcon class="size-4 animate-spin" />
								Progressing...
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
								saving = true;
								saveError = "";
								return async ({ result }) => {
									saving = false;
									if (result.type === "success") {
										await invalidateAll();
									} else if (result.type === "failure" && result.data) {
										saveError = result.data.error as string;
									} else {
										saveError = "Failed to save booking";
									}
								};
							}}
						>
							<input type="hidden" name="payload" value={JSON.stringify(buildPayload())} />
							<Button type="submit" disabled={!isDirty || saving}>
								{#if saving}
									<LoaderIcon class="size-4 animate-spin" />
									Saving...
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
					<p class="text-muted-foreground text-sm">
						Create the directory structure and transfer data for this booking.
					</p>

					{#if stageActionError}
						<div class="text-destructive text-sm">{stageActionError}</div>
					{/if}
					{#if stageActionSuccess}
						<div class="text-sm text-green-600">{stageActionSuccess}</div>
					{/if}

					<div class="flex items-center gap-3">
						<form
							method="POST"
							action="?/createFolders&uuid={form.bookingUUID}"
							use:enhance={() => {
								creatingFolders = true;
								stageActionError = "";
								stageActionSuccess = "";
								return async ({ result }) => {
									creatingFolders = false;
									if (result.type === "success") {
										stageActionSuccess = "Folders created successfully";
									} else if (result.type === "failure" && result.data) {
										stageActionError = result.data.error as string;
									} else {
										stageActionError = "Failed to create folders";
									}
								};
							}}
						>
							<Button type="submit" variant="outline" disabled={creatingFolders || currentStage !== "Data Export"}>
								{#if creatingFolders}
									<LoaderIcon class="size-4 animate-spin" />
									Creating...
								{:else}
									Create Folders
								{/if}
							</Button>
						</form>

						<form
							method="POST"
							action="?/startDataTransfer&uuid={form.bookingUUID}"
							use:enhance={() => {
								startingTransfer = true;
								stageActionError = "";
								stageActionSuccess = "";
								return async ({ result }) => {
									startingTransfer = false;
									if (result.type === "success") {
										stageActionSuccess = "Data transfer started";
									} else if (result.type === "failure" && result.data) {
										stageActionError = result.data.error as string;
									} else {
										stageActionError = "Failed to start data transfer";
									}
								};
							}}
						>
							<Button type="submit" variant="outline" disabled={startingTransfer || currentStage !== "Data Export"}>
								{#if startingTransfer}
									<LoaderIcon class="size-4 animate-spin" />
									Transferring...
								{:else}
									Start Data Export
								{/if}
							</Button>
						</form>
					</div>

					{#if currentStage === "Data Export"}
						<div class="flex items-center gap-3 border-t pt-4">
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
								<input type="hidden" name="stage" value="Ingest" />
								<Button type="submit" disabled={progressingStage}>
									{#if progressingStage}
										<LoaderIcon class="size-4 animate-spin" />
										Progressing...
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
						Send data to SciCat and finalize this booking
					</p>

					{#if stageActionError}
						<div class="text-destructive text-sm">{stageActionError}</div>
					{/if}
					{#if stageActionSuccess}
						<div class="text-sm text-green-600">{stageActionSuccess}</div>
					{/if}

					<div class="flex items-center gap-3">
						<form
							method="POST"
							action="?/ingest&uuid={form.bookingUUID}"
							use:enhance={() => {
								ingesting = true;
								stageActionError = "";
								stageActionSuccess = "";
								return async ({ result }) => {
									ingesting = false;
									if (result.type === "success") {
										stageActionSuccess = "Data ingested successfully";
										await invalidateAll();
									} else if (result.type === "failure" && result.data) {
										stageActionError = result.data.error as string;
									} else {
										stageActionError = "Failed to ingest";
									}
								};
							}}
						>
							<Button type="submit" disabled={ingesting}>
								{#if ingesting}
									<LoaderIcon class="size-4 animate-spin" />
									Ingesting...
								{:else}
									Ingest to SciCat
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
							<input type="hidden" name="stage" value="Data Export" />
							<Button type="submit" variant="outline" disabled={progressingStage}>
								Revert to Data Export
							</Button>
						</form>				
					</div>
				</div>
			{/if}
		</Collapsible.Content>
	</Collapsible.Root>
</div>
