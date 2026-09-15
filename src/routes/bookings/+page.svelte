<script lang="ts">
	import BookingSearch from "$lib/components/booking-search.svelte";
	import DataTable from "$lib/components/data-table.svelte";
	import * as ToggleGroup from "$lib/components/ui/toggle-group/index.js";
	import { goto } from "$app/navigation";
	import { page } from "$app/state";

	let { data } = $props();

	let authEnabled = $derived(page.data.authEnabled ?? false);
	let userEmail = $derived(page.data.user?.email?.toLowerCase() ?? "");
	let canFilter = $derived(authEnabled && !!userEmail);

	let filteredBookings = $derived(
		canFilter && data.view === "mine"
			? data.bookings.filter((b) =>
					Array.isArray(b.scientificSupport) &&
					b.scientificSupport.some(
						(u) => u.email?.toLowerCase() === userEmail,
					),
				)
			: data.bookings,
	);

	let filteredPagination = $derived(
		canFilter && data.view === "mine"
			? {
					page: 1,
					pageSize: filteredBookings.length || 10,
					total: filteredBookings.length,
					totalPages: 1,
				}
			: data.pagination,
	);

	function switchView(newView: string) {
		// Keep the active search filters when switching views, but start at page 1
		const params = new URLSearchParams(page.url.searchParams);
		params.set("view", newView);
		params.delete("page");
		goto(`/bookings?${params.toString()}`, { noScroll: true });
	}
</script>

<div class="h-full flex-1 flex-col py-4 sm:py-6 md:flex md:py-8">
	<div class="mb-8 px-4 lg:px-6">
		<h2 class="text-2xl font-bold tracking-tight">Bookings</h2>
		<p class="text-muted-foreground">
			Manage and view lab allocations.
		</p>
	</div>

	<BookingSearch filters={data.filters}>
		{#snippet actions()}
			<ToggleGroup.Root type="single" value={data.view} onValueChange={(v) => { if (v) switchView(v); }} variant="outline">
				<ToggleGroup.Item value="mine">My Bookings</ToggleGroup.Item>
				<ToggleGroup.Item value="all">All Bookings</ToggleGroup.Item>
			</ToggleGroup.Root>
		{/snippet}
	</BookingSearch>

	<DataTable data={filteredBookings} serverPagination={filteredPagination} />
</div>
