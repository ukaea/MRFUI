<script lang="ts">
	import type { Snippet } from "svelte";
	import { untrack } from "svelte";
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import { Button } from "$lib/components/ui/button/index.js";
	import { Badge } from "$lib/components/ui/badge/index.js";
	import { Label } from "$lib/components/ui/label/index.js";
	import Input from "$lib/components/ui/input/input.svelte";
	import * as Select from "$lib/components/ui/select/index.js";
	import SearchIcon from "@tabler/icons-svelte/icons/search";
	import XIcon from "@tabler/icons-svelte/icons/x";
	import {
		FILTERS,
		FILTER_KEYS,
		describeFilter,
		type BookingFilters,
		type FilterDef,
	} from "$lib/booking-filters";

	let {
		filters,
		actions,
	}: {
		/** Filters currently applied (from the page URL). */
		filters: BookingFilters;
		/** Extra controls rendered in their own row above the filters. */
		actions?: Snippet;
	} = $props();

	const ANY = "__any";

	// Draft values being edited; reset whenever the applied filters change
	// (e.g. after navigating, removing a chip, or using the back button).
	let values = $state<BookingFilters>(untrack(() => ({ ...filters })));
	$effect(() => {
		values = { ...filters };
	});

	let activeEntries = $derived(Object.entries(filters));

	function navigate(next: BookingFilters) {
		const params = new URLSearchParams(page.url.searchParams);
		for (const key of [...FILTER_KEYS, "search", "page"]) params.delete(key);
		for (const [key, value] of Object.entries(next)) {
			const trimmed = value?.trim();
			if (trimmed) params.set(key, trimmed);
		}
		const query = params.toString();
		goto(`${page.url.pathname}${query ? `?${query}` : ""}`, { keepFocus: true, noScroll: true });
	}

	function submit(e: SubmitEvent) {
		e.preventDefault();
		navigate(values);
	}

	function removeFilter(key: string) {
		const { [key]: _, ...rest } = filters;
		navigate(rest);
	}

	function clearAll() {
		values = {};
		navigate({});
	}

	/** Pair "from"/"to" date inputs so the browser prevents inverted ranges. */
	function dateBounds(key: string): { min?: string; max?: string } {
		if (key.endsWith("From")) return { max: values[key.replace(/From$/, "To")] || undefined };
		if (key.endsWith("To")) return { min: values[key.replace(/To$/, "From")] || undefined };
		return {};
	}
</script>

<!-- The form wraps the inputs and the Search button only, so `actions` can
     contain forms of its own. -->
<div class="flex flex-col gap-3 px-4 lg:px-6">
	{#if actions}
		<div class="flex flex-wrap items-center gap-2">
			{@render actions()}
		</div>
	{/if}

	<form class="flex flex-wrap items-end gap-3" onsubmit={submit}>
		{#each FILTERS as def (def.key)}
			{@render field(def)}
		{/each}
		<div class="flex flex-wrap items-center gap-2">
			<Button type="submit">
				<SearchIcon class="size-4" />
				Search
			</Button>
			{#if activeEntries.length > 0}
				<Button type="button" variant="ghost" onclick={clearAll}>Clear all</Button>
			{/if}
		</div>
	</form>

	{#if activeEntries.length > 0}
		<div class="flex flex-wrap items-center gap-2" aria-label="Active filters">
			{#each activeEntries as [key, value] (key)}
				<Badge variant="secondary" class="gap-1 pr-1">
					{describeFilter(key, value)}
					<button
						type="button"
						class="text-muted-foreground hover:text-foreground rounded-sm"
						aria-label={`Remove ${describeFilter(key, value)} filter`}
						onclick={() => removeFilter(key)}
					>
						<XIcon class="size-3" />
					</button>
				</Badge>
			{/each}
		</div>
	{/if}
</div>

{#snippet field(def: FilterDef)}
	{@const id = `filter-${def.key}`}
	<!-- Fields share the row evenly; the min width keeps a date readable before
	     the row wraps on narrow screens. -->
	<div class="flex min-w-36 flex-1 flex-col gap-1.5">
		<Label for={id} class="text-muted-foreground text-xs">{def.label}</Label>
		{#if def.kind === "select" && def.options}
			<Select.Root
				type="single"
				bind:value={
					() => values[def.key] || ANY,
					(v) => (values[def.key] = v === ANY ? "" : v)
				}
			>
				<Select.Trigger {id} class="w-full">
					{def.options.find((o) => o.value === values[def.key])?.label ?? "Any"}
				</Select.Trigger>
				<Select.Content>
					<Select.Item value={ANY}>Any</Select.Item>
					{#each def.options as option (option.value)}
						<Select.Item value={option.value}>{option.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		{:else if def.kind === "date"}
			<Input {id} type="date" bind:value={values[def.key]} {...dateBounds(def.key)} />
		{:else}
			<Input {id} type="text" placeholder={def.placeholder} bind:value={values[def.key]} />
		{/if}
	</div>
{/snippet}
