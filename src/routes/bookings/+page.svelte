<script lang="ts">
	import DataTable from "$lib/components/data-table.svelte";
	import { Button } from "$lib/components/ui/button/index.js";
	import Input from "$lib/components/ui/input/input.svelte";
	import RefreshIcon from "@tabler/icons-svelte/icons/refresh";
	import LoaderIcon from "@tabler/icons-svelte/icons/loader-2";
	import SearchIcon from "@tabler/icons-svelte/icons/search";
	import XIcon from "@tabler/icons-svelte/icons/x";
	import { enhance } from "$app/forms";
	import { goto } from "$app/navigation";
    import Book from "@tabler/icons-svelte/icons/book";

	let { data } = $props();

	let syncing = $state(false);
	let syncMessage = $state("");
	let searchValue = $state(data.search ?? "");

	function submitSearch() {
		const trimmed = searchValue.trim();
		if (trimmed) {
			goto(`/bookings?search=${encodeURIComponent(trimmed)}`);
		} else {
			goto("/bookings");
		}
	}

	function clearSearch() {
		searchValue = "";
		goto("/bookings");
	}
</script>

<div class="h-full flex-1 flex-col py-4 sm:py-6 md:flex md:py-8">
	<div class="mb-8 px-4 lg:px-6">
		<h2 class="text-2xl font-bold tracking-tight">Bookings</h2>
		<p class="text-muted-foreground">
			Manage and view lab allocations.
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
			{#if syncMessage}
				<span class="text-muted-foreground text-sm">{syncMessage}</span>
			{/if}
			<form
				method="POST"
				action="?/sync"
				use:enhance={() => {
					syncing = true;
					syncMessage = "";
					return async ({ result }) => {
						syncing = false;
						if (result.type === "success" && result.data) {
							syncMessage = `Synced ${result.data.records_synced} records`;
						} else if (result.type === "failure" && result.data) {
							syncMessage = result.data.error as string;
						} else {
							syncMessage = "Sync failed";
						}
					};
				}}
			>
				<Button type="submit" variant="outline" disabled={syncing}>
					{#if syncing}
						<LoaderIcon class="size-4 animate-spin" />
						Syncing...
					{:else}
						<RefreshIcon class="size-4" />
						Sync Bookings
					{/if}
				</Button>
			</form>
		</div>
	</div>

	<DataTable data={data.bookings} serverPagination={data.pagination} />
</div>
