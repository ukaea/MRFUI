<script lang="ts">
	import DataTable from "$lib/components/data-table.svelte";
	import { Button } from "$lib/components/ui/button/index.js";
	import RefreshIcon from "@tabler/icons-svelte/icons/refresh";
	import LoaderIcon from "@tabler/icons-svelte/icons/loader-2";
	import { enhance } from "$app/forms";

	let { data } = $props();

	let syncing = $state(false);
	let syncMessage = $state("");
</script>

<div class="h-full flex-1 flex-col space-y-8 py-4 sm:py-6 md:flex md:py-8">
	<div class="flex items-center justify-between px-4 lg:px-6">
		<div>
			<h2 class="text-2xl font-bold tracking-tight">Bookings</h2>
			<p class="text-muted-foreground">
				Manage and view lab allocations.
			</p>
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
						Sync
					{/if}
				</Button>
			</form>
		</div>
	</div>

	<DataTable data={data.bookings} serverPagination={data.pagination} />
</div>
