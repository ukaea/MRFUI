<script lang="ts">
	import DataTable from "$lib/components/data-table.svelte";
	import { Button } from "$lib/components/ui/button/index.js";
	import Input from "$lib/components/ui/input/input.svelte";
	import * as ToggleGroup from "$lib/components/ui/toggle-group/index.js";
	import SearchIcon from "@tabler/icons-svelte/icons/search";
	import XIcon from "@tabler/icons-svelte/icons/x";
	import { goto } from "$app/navigation";
	import { page } from "$app/state";

	let { data } = $props();

	let searchValue = $state(data.search ?? "");
	let viewMode = $state<string>(data.view ?? "mine");

	let authEnabled = $derived(page.data.authEnabled ?? false);
	let userEmail = $derived(page.data.user?.email?.toLowerCase() ?? "");
	let canFilter = $derived(authEnabled && !!userEmail);

	let filteredBookings = $derived(
		canFilter && viewMode === "mine"
			? data.bookings.filter((b) =>
					Array.isArray(b.scientificSupport) &&
					b.scientificSupport.some(
						(u) => u.email?.toLowerCase() === userEmail,
					),
				)
			: data.bookings,
	);

	// $effect(() => {
	// 	console.log("Filtered bookings:", filteredBookings);
	// });

	let filteredPagination = $derived(
		canFilter && viewMode === "mine"
			? {
					page: 1,
					pageSize: filteredBookings.length || 10,
					total: filteredBookings.length,
					totalPages: 1,
				}
			: data.pagination,
	);

	function switchView(newView: string) {
		viewMode = newView;
		goto(`/bookings?view=${newView}`);
	}

	function submitSearch() {
		const trimmed = searchValue.trim();
		if (trimmed) {
			goto(`/bookings?search=${encodeURIComponent(trimmed)}&view=${viewMode}`);
		} else {
			goto(`/bookings?view=${viewMode}`);
		}
	}

	function clearSearch() {
		searchValue = "";
		goto(`/bookings?view=${viewMode}`);
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
		<ToggleGroup.Root type="single" value={viewMode} onValueChange={(v) => { if (v) switchView(v); }} variant="outline">
			<ToggleGroup.Item value="mine">My Bookings</ToggleGroup.Item>
			<ToggleGroup.Item value="all">All Bookings</ToggleGroup.Item>
		</ToggleGroup.Root>
	</div>

	<DataTable data={filteredBookings} serverPagination={filteredPagination} />
</div>
