<script lang="ts">
	import DataTable from "$lib/components/data-table.svelte";
	import { Button } from "$lib/components/ui/button/index.js";
	import Input from "$lib/components/ui/input/input.svelte";
	import { Label } from "$lib/components/ui/label/index.js";
	import * as Card from "$lib/components/ui/card/index.js";
	import RefreshIcon from "@tabler/icons-svelte/icons/refresh";
	import LoaderIcon from "@tabler/icons-svelte/icons/loader-2";
	import SearchIcon from "@tabler/icons-svelte/icons/search";
	import TrashIcon from "@tabler/icons-svelte/icons/trash";
	import XIcon from "@tabler/icons-svelte/icons/x";
	import { enhance } from "$app/forms";
	import { goto } from "$app/navigation";

	let { data } = $props();

	let deletingAll = $state(false);
	let deleteMessage = $state("");
	let syncing = $state(false);
	let syncMessage = $state("");
	let searchValue = $state(data.search ?? "");

	function submitSearch() {
		const trimmed = searchValue.trim();
		if (trimmed) {
			goto(`/admin?search=${encodeURIComponent(trimmed)}`);
		} else {
			goto("/admin");
		}
	}

	function clearSearch() {
		searchValue = "";
		goto("/admin");
	}
</script>

<div class="h-full flex-1 flex-col py-4 sm:py-6 md:flex md:py-8">
	<div class="mb-8 px-4 lg:px-6">
		<h2 class="text-2xl font-bold tracking-tight">Admin Panel</h2>
		<p class="text-muted-foreground">
			Administrative actions for bookings management.
		</p>
	</div>

	<div class="flex items-center justify-between px-4 lg:px-6">
		<div class="flex items-center gap-2">
			<div class="relative w-48">
				<SearchIcon class="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
				<Input
					type="text"
					placeholder="Search by Job ID..."
					class="pl-9 pr-9"
					bind:value={searchValue}
					onkeydown={(e: KeyboardEvent) => {
						if (e.key === "Enter") {
							e.preventDefault();
							submitSearch();
						}
					}}
				/>
				{#if searchValue}
					<button
						type="button"
						class="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 -translate-y-1/2"
						onclick={clearSearch}
					>
						<XIcon class="size-4" />
					</button>
				{/if}
			</div>
			<Button variant="outline" onclick={submitSearch}>Search</Button>
		</div>
		<div class="flex items-center gap-3">
			{#if deleteMessage}
				<span class="text-muted-foreground text-sm">{deleteMessage}</span>
			{/if}
			<form
				method="POST"
				action="?/deleteAll"
				use:enhance={() => {
					deletingAll = true;
					deleteMessage = "";
					return async ({ result, update }) => {
						deletingAll = false;
						if (result.type === "success") {
							deleteMessage = "All bookings deleted";
							await update();
						} else if (result.type === "failure" && result.data) {
							deleteMessage = result.data.error as string;
						} else {
							deleteMessage = "Delete failed";
						}
					};
				}}
			>
				<Button
					type="submit"
					variant="destructive"
					disabled={deletingAll}
					onclick={(e: MouseEvent) => {
						if (!confirm("Are you sure you want to delete ALL bookings? This cannot be undone.")) {
							e.preventDefault();
						}
					}}
				>
					{#if deletingAll}
						<LoaderIcon class="size-4 animate-spin" />
						Deleting...
					{:else}
						<TrashIcon class="size-4" />
						Delete All Bookings
					{/if}
				</Button>
			</form>
		</div>
	</div>

	<!-- Admin Sync Section -->
	<div class="px-4 pt-4 lg:px-6">
		<Card.Root>
			<Card.Header>
				<Card.Title>Admin Sync</Card.Title>
				<Card.Description>Sync bookings with configurable date parameters.</Card.Description>
			</Card.Header>
			<Card.Content>
				<form
					method="POST"
					action="?/adminSync"
					class="flex flex-wrap items-end gap-4"
					use:enhance={() => {
						syncing = true;
						syncMessage = "";
						return async ({ result }) => {
							syncing = false;
							if (result.type === "success" && result.data) {
								syncMessage = "Sync completed successfully";
							} else if (result.type === "failure" && result.data) {
								syncMessage = result.data.error as string;
							} else {
								syncMessage = "Sync failed";
							}
						};
					}}
				>
					<div class="space-y-2">
						<Label for="start_date">Start Date</Label>
						<Input id="start_date" name="start_date" type="datetime-local" class="w-56" />
					</div>
					<div class="space-y-2">
						<Label for="end_date">End Date</Label>
						<Input id="end_date" name="end_date" type="datetime-local" class="w-56" />
					</div>
					<div class="space-y-2">
						<Label for="days_back">Days Back</Label>
						<Input id="days_back" name="days_back" type="number" min="0" placeholder="e.g. 30" class="w-32" />
					</div>
					<Button type="submit" variant="outline" disabled={syncing}>
						{#if syncing}
							<LoaderIcon class="size-4 animate-spin" />
							Syncing...
						{:else}
							<RefreshIcon class="size-4" />
							Sync
						{/if}
					</Button>
					{#if syncMessage}
						<span class="text-muted-foreground text-sm">{syncMessage}</span>
					{/if}
				</form>
			</Card.Content>
		</Card.Root>
	</div>

	<DataTable data={data.bookings} serverPagination={data.pagination} basePath="/admin" />
</div>
