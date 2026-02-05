<script lang="ts">
	import * as Drawer from "$lib/components/ui/drawer/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import { IsMobile } from "$lib/hooks/is-mobile.svelte.js";
	import { Label } from "$lib/components/ui/label/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import { Badge } from "$lib/components/ui/badge/index.js";
	import type { MRFSchema } from "./schemas.js";

	const isMobile = new IsMobile();

	let { item }: { item: MRFSchema } = $props();

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleString();
	}

	function formatUser(user: { firstName: string; lastName: string; email: string } | { firstName: string; lastName: string; email: string }[] | undefined) {
		if (!user) return "—";
		if (Array.isArray(user)) {
			return user.map((u) => `${u.firstName} ${u.lastName}`).join(", ");
		}
		return `${user.firstName} ${user.lastName}`;
	}

	const hasHazards = item.tritium || item.beryllium || item.betaGamma;
</script>

<Drawer.Root direction={isMobile.current ? "bottom" : "right"}>
	<Drawer.Trigger>
		{#snippet child({ props })}
			<Button variant="link" class="text-foreground w-fit px-0 text-left" {...props}>
				{item.seid}
			</Button>
		{/snippet}
	</Drawer.Trigger>
	<Drawer.Content>
		<Drawer.Header class="gap-1">
			<Drawer.Title>SEID: {item.seid}</Drawer.Title>
			<Drawer.Description>{item.seidDescription || "Equipment details"}</Drawer.Description>
		</Drawer.Header>
		<div class="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
			{#if hasHazards}
				<div class="flex items-center gap-2 rounded-lg border border-yellow-500 bg-yellow-50 p-3 dark:bg-yellow-950">
					<span class="font-medium text-yellow-800 dark:text-yellow-200">Hazards:</span>
					<div class="flex gap-2">
						{#if item.tritium}
							<Badge variant="destructive">Tritium</Badge>
						{/if}
						{#if item.beryllium}
							<Badge variant="destructive">Beryllium</Badge>
						{/if}
						{#if item.betaGamma}
							<Badge variant="destructive">Beta/Gamma</Badge>
						{/if}
					</div>
				</div>
			{/if}
			<Separator />
			<div class="grid gap-4">
				<div class="grid grid-cols-2 gap-4">
					<div class="flex flex-col gap-1">
						<Label class="text-muted-foreground">Job ID</Label>
						<span class="font-medium">{item.jobId || "—"}</span>
					</div>
					<div class="flex flex-col gap-1">
						<Label class="text-muted-foreground">Session ID</Label>
						<span class="font-medium">{item.sessionId || "—"}</span>
					</div>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div class="flex flex-col gap-1">
						<Label class="text-muted-foreground">Work Category</Label>
						<Badge variant="outline" class="w-fit">{item.workCategory}</Badge>
					</div>
					<div class="flex flex-col gap-1">
						<Label class="text-muted-foreground">Status</Label>
						<Badge variant={item.status === "Completed" ? "default" : item.status === "In Progress" ? "secondary" : item.status === "Cancelled" ? "destructive" : "outline"} class="w-fit">{item.status}</Badge>
					</div>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div class="flex flex-col gap-1">
						<Label class="text-muted-foreground">Lab Location</Label>
						<span class="font-medium">{item.labLocation}</span>
					</div>
				</div>
				<Separator />
				<div class="flex flex-col gap-1">
					<Label class="text-muted-foreground">Booking Start</Label>
					<span class="font-medium">{formatDate(item.bookingStart)}</span>
				</div>
				<div class="flex flex-col gap-1">
					<Label class="text-muted-foreground">Booking End</Label>
					<span class="font-medium">{formatDate(item.bookingEnd)}</span>
				</div>
				<Separator />
				{#if item.internalUser}
					<div class="flex flex-col gap-1">
						<Label class="text-muted-foreground">Internal User</Label>
						<span class="font-medium">{formatUser(item.internalUser)}</span>
					</div>
				{/if}
				{#if item.externalUser}
					<div class="flex flex-col gap-1">
						<Label class="text-muted-foreground">External User</Label>
						<span class="font-medium">{formatUser(item.externalUser)}</span>
					</div>
					{#if item.institution}
						<div class="flex flex-col gap-1">
							<Label class="text-muted-foreground">Institution</Label>
							<span class="font-medium">{item.institution}</span>
						</div>
					{/if}
				{/if}
				{#if item.scientificSupport}
					<div class="flex flex-col gap-1">
						<Label class="text-muted-foreground">Scientific Support</Label>
						<span class="font-medium">{formatUser(item.scientificSupport)}</span>
					</div>
				{/if}
				{#if item.notes}
					<Separator />
					<div class="flex flex-col gap-1">
						<Label class="text-muted-foreground">Notes</Label>
						<span class="font-medium">{item.notes}</span>
					</div>
				{/if}
			</div>
		</div>
		<Drawer.Footer>
			{#if item.bookingUUID}
				<Button href="/bookings/{item.jobId}/{item.sessionId}?uuid={item.bookingUUID}">View Details</Button>
			{/if}
			<Drawer.Close>
				{#snippet child({ props })}
					<Button variant="outline" {...props}>Close</Button>
				{/snippet}
			</Drawer.Close>
		</Drawer.Footer>
	</Drawer.Content>
</Drawer.Root>
