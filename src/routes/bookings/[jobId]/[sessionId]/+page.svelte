<script lang="ts">
	import { Badge } from "$lib/components/ui/badge/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import * as Card from "$lib/components/ui/card/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import { Label } from "$lib/components/ui/label/index.js";
	import { Textarea } from "$lib/components/ui/textarea/index.js";
	import * as Select from "$lib/components/ui/select/index.js";
	import { Checkbox } from "$lib/components/ui/checkbox/index.js";
	import { enhance } from "$app/forms";
	import { invalidateAll } from "$app/navigation";
	import ArrowLeftIcon from "@tabler/icons-svelte/icons/arrow-left";
	import LoaderIcon from "@tabler/icons-svelte/icons/loader-2";
	import PlusIcon from "@tabler/icons-svelte/icons/plus";
	import XIcon from "@tabler/icons-svelte/icons/x";
	import type { MRFSchema } from "$lib/components/schemas";

	let { data } = $props();

	// Create editable form state from the booking data
	let form = $state<MRFSchema>({ ...data.booking });

	// Track if form has been modified
	let isDirty = $derived(JSON.stringify(form) !== JSON.stringify(data.booking));

	let saving = $state(false);
	let saveError = $state("");


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

	function handleProgress() {
		alert("Booking progressed");
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
	</div>

	<div class="grid gap-6 md:grid-cols-2">
		<Card.Root>
			<Card.Header>
				<Card.Title>Booking Details</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2">
						<Label for="jobId">Job ID</Label>
						<Input id="jobId" bind:value={form.jobId} placeholder="e.g. 25001" />
					</div>
					<div class="space-y-2">
						<Label for="sessionId">Session ID</Label>
						<Input id="sessionId" bind:value={form.sessionId} placeholder="e.g. SES-001" />
					</div>
					<div class="space-y-2">
						<Label for="seid">SEID</Label>
						<Input id="seid" bind:value={form.seid} placeholder="e.g. 1001" />
					</div>
					<div class="space-y-2">
						<Label for="seidDescription">SEID Description</Label>
						<Input id="seidDescription" bind:value={form.seidDescription} placeholder="Equipment name" />
					</div>
					<div class="space-y-2">
						<Label for="labLocation">Lab Location</Label>
						<Input id="labLocation" bind:value={form.labLocation} placeholder="e.g. MRF" />
					</div>
					<div class="space-y-2">
						<Label for="workCategory">Work Category</Label>
						<Select.Root type="single" bind:value={form.workCategory}>
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
						<Select.Root type="single" bind:value={form.status}>
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
					/>
				</div>
				<div class="space-y-2">
					<Label for="bookingEnd">End</Label>
					<Input
						id="bookingEnd"
						type="datetime-local"
						value={toDateTimeLocal(form.bookingEnd)}
						onchange={(e) => form.bookingEnd = fromDateTimeLocal(e.currentTarget.value)}
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
							/>
							<Button variant="ghost" size="icon" class="shrink-0" onclick={() => removeFromList('sampleId', i)}>
								<XIcon class="size-4" />
							</Button>
						</div>
					{/each}
					<Button variant="outline" size="sm" onclick={() => addToList('sampleId')}>
						<PlusIcon class="size-4" />
						Add Sample ID
					</Button>
				</div>
				<div class="flex items-center gap-2">
					<Checkbox
						id="sampleSplit"
						checked={form.sampleSplit}
						onCheckedChange={(checked) => form.sampleSplit = checked === true}
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
								/>
								<Button variant="ghost" size="icon" class="shrink-0" onclick={() => removeFromList('splitSampleId', i)}>
									<XIcon class="size-4" />
								</Button>
							</div>
						{/each}
						<Button variant="outline" size="sm" onclick={() => addToList('splitSampleId')}>
							<PlusIcon class="size-4" />
							Add Split Sample ID
						</Button>
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
					/>
					<Label for="tritium">Tritium</Label>
				</div>
				<div class="flex items-center gap-2">
					<Checkbox
						id="beryllium"
						checked={form.beryllium}
						onCheckedChange={(checked) => form.beryllium = checked === true}
					/>
					<Label for="beryllium">Beryllium</Label>
				</div>
				<div class="flex items-center gap-2">
					<Checkbox
						id="betaGamma"
						checked={form.betaGamma}
						onCheckedChange={(checked) => form.betaGamma = checked === true}
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
						/>
					</div>
					<div class="space-y-2">
						<Label for="internalLastName">Last Name</Label>
						<Input
							id="internalLastName"
							value={user?.lastName ?? ""}
							onchange={(e) => updateUser('internalUser', 'lastName', e.currentTarget.value)}
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
						/>
					</div>
					<div class="space-y-2">
						<Label for="externalLastName">Last Name</Label>
						<Input
							id="externalLastName"
							value={user?.lastName ?? ""}
							onchange={(e) => updateUser('externalUser', 'lastName', e.currentTarget.value)}
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
					/>
				</div>
				<div class="space-y-2">
					<Label for="institution">Institution</Label>
					<Input
						id="institution"
						bind:value={form.institution}
						placeholder="e.g. TU Delft"
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
						/>
					</div>
					<div class="space-y-2">
						<Label for="supportLastName">Last Name</Label>
						<Input
							id="supportLastName"
							value={user?.lastName ?? ""}
							onchange={(e) => updateUser('scientificSupport', 'lastName', e.currentTarget.value)}
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
					/>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root class="md:col-span-2">
			<Card.Header>
				<Card.Title>Notes</Card.Title>
			</Card.Header>
			<Card.Content>
				<Textarea
					bind:value={form.notes}
					placeholder="Additional notes about this booking..."
					rows={4}
				/>
			</Card.Content>
		</Card.Root>
	</div>

	<div class="flex justify-between gap-2 pt-4 border-t">
		<Button variant="default" onclick={handleProgress}>
			Progress Booking
		</Button>
		<div class="flex items-center gap-2">
			{#if saveError}
				<span class="text-destructive text-sm">{saveError}</span>
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
					return async ({ result, update }) => {
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
</div>
