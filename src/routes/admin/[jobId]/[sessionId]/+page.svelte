<script lang="ts">
	import { Badge } from "$lib/components/ui/badge/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import * as Card from "$lib/components/ui/card/index.js";
	import { enhance } from "$app/forms";
	import ArrowLeftIcon from "@tabler/icons-svelte/icons/arrow-left";
	import TrashIcon from "@tabler/icons-svelte/icons/trash";
	import LoaderIcon from "@tabler/icons-svelte/icons/loader-2";

	let { data } = $props();

	let deleting = $state(false);
	let deleteError = $state("");

	const booking = $derived(data.booking);

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString(undefined, {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	}

	function formatUser(users: { firstName: string; lastName: string; email: string }[]): string {
		if (!users || users.length === 0) return "—";
		const u = users[0];
		const name = [u.firstName, u.lastName].filter(Boolean).join(" ");
		return name ? `${name} (${u.email})` : u.email || "—";
	}
</script>

<div class="h-full flex-1 flex-col space-y-6 p-8 md:flex">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="outline" size="icon" href="/admin">
				<ArrowLeftIcon class="h-4 w-4" />
			</Button>
			<div>
				<h2 class="text-2xl font-bold tracking-tight">
					Booking: {booking.jobId}/{booking.sessionId}
				</h2>
				<p class="text-muted-foreground">
					{booking.seidDescription || `SEID ${booking.seid}`}
				</p>
			</div>
		</div>
		<div class="flex items-center gap-3">
			{#if deleteError}
				<span class="text-destructive text-sm">{deleteError}</span>
			{/if}
			<form
				method="POST"
				action="?/deleteBooking&uuid={booking.bookingUUID}"
				use:enhance={() => {
					deleting = true;
					deleteError = "";
					return async ({ result }) => {
						deleting = false;
						if (result.type === "failure" && result.data) {
							deleteError = result.data.error as string;
						} else if (result.type !== "redirect") {
							deleteError = "Failed to delete booking";
						}
					};
				}}
			>
				<Button
					type="submit"
					variant="destructive"
					disabled={deleting}
					onclick={(e: MouseEvent) => {
						if (!confirm("Are you sure you want to delete this booking? This cannot be undone.")) {
							e.preventDefault();
						}
					}}
				>
					{#if deleting}
						<LoaderIcon class="size-4 animate-spin" />
						Deleting...
					{:else}
						<TrashIcon class="size-4" />
						Delete Booking
					{/if}
				</Button>
			</form>
		</div>
	</div>

	<div class="grid gap-6 md:grid-cols-2">
		<Card.Root>
			<Card.Header>
				<Card.Title>Booking Details</Card.Title>
			</Card.Header>
			<Card.Content>
				<dl class="space-y-3 text-sm">
					<div class="flex justify-between">
						<dt class="text-muted-foreground">Job ID</dt>
						<dd class="font-medium">{booking.jobId}</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-muted-foreground">Session ID</dt>
						<dd class="font-medium">{booking.sessionId}</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-muted-foreground">SEID</dt>
						<dd class="font-medium">{booking.seid}</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-muted-foreground">SEID Description</dt>
						<dd class="font-medium">{booking.seidDescription || "—"}</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-muted-foreground">Lab Location</dt>
						<dd class="font-medium">{booking.labLocation}</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-muted-foreground">Work Category</dt>
						<dd class="font-medium">{booking.workCategory}</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-muted-foreground">Status</dt>
						<dd><Badge variant="outline">{booking.status}</Badge></dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-muted-foreground">Stage</dt>
						<dd><Badge variant="outline">{booking.stage || "Initial"}</Badge></dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-muted-foreground">UUID</dt>
						<dd class="font-mono text-xs">{booking.bookingUUID}</dd>
					</div>
				</dl>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Schedule</Card.Title>
			</Card.Header>
			<Card.Content>
				<dl class="space-y-3 text-sm">
					<div class="flex justify-between">
						<dt class="text-muted-foreground">Booking Start</dt>
						<dd class="font-medium">{formatDate(booking.bookingStart)}</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-muted-foreground">Booking End</dt>
						<dd class="font-medium">{formatDate(booking.bookingEnd)}</dd>
					</div>
					{#if booking.modified}
						<div class="flex justify-between">
							<dt class="text-muted-foreground">Last Modified</dt>
							<dd class="font-medium">{formatDate(booking.modified)}</dd>
						</div>
					{/if}
				</dl>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Sample Information</Card.Title>
			</Card.Header>
			<Card.Content>
				<dl class="space-y-3 text-sm">
					<div class="flex justify-between">
						<dt class="text-muted-foreground">Sample ID(s)</dt>
						<dd class="font-medium">{booking.sampleId.length ? booking.sampleId.join(", ") : "—"}</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-muted-foreground">Sample Split</dt>
						<dd class="font-medium">{booking.sampleSplit ? "Yes" : "No"}</dd>
					</div>
					{#if booking.sampleSplit && booking.splitSampleId.length}
						<div class="flex justify-between">
							<dt class="text-muted-foreground">Split Sample ID(s)</dt>
							<dd class="font-medium">{booking.splitSampleId.join(", ")}</dd>
						</div>
					{/if}
				</dl>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Hazards</Card.Title>
			</Card.Header>
			<Card.Content>
				<dl class="space-y-3 text-sm">
					<div class="flex justify-between">
						<dt class="text-muted-foreground">Tritium</dt>
						<dd><Badge variant={booking.tritium ? "destructive" : "secondary"}>{booking.tritium ? "Yes" : "No"}</Badge></dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-muted-foreground">Beryllium</dt>
						<dd><Badge variant={booking.beryllium ? "destructive" : "secondary"}>{booking.beryllium ? "Yes" : "No"}</Badge></dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-muted-foreground">Beta/Gamma</dt>
						<dd><Badge variant={booking.betaGamma ? "destructive" : "secondary"}>{booking.betaGamma ? "Yes" : "No"}</Badge></dd>
					</div>
				</dl>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Users</Card.Title>
			</Card.Header>
			<Card.Content>
				<dl class="space-y-3 text-sm">
					<div class="flex justify-between">
						<dt class="text-muted-foreground">Internal User</dt>
						<dd class="font-medium">{formatUser(booking.internalUser)}</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-muted-foreground">External User</dt>
						<dd class="font-medium">{formatUser(booking.externalUser)}</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-muted-foreground">Scientific Support</dt>
						<dd class="font-medium">{formatUser(booking.scientificSupport)}</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-muted-foreground">Institution</dt>
						<dd class="font-medium">{booking.institution || "—"}</dd>
					</div>
				</dl>
			</Card.Content>
		</Card.Root>

		{#if booking.notes}
			<Card.Root>
				<Card.Header>
					<Card.Title>Notes</Card.Title>
				</Card.Header>
				<Card.Content>
					<p class="text-sm whitespace-pre-wrap">{booking.notes}</p>
				</Card.Content>
			</Card.Root>
		{/if}
	</div>
</div>
