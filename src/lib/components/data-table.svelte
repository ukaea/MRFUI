<script lang="ts" module>
	export const columns: ColumnDef<Schema>[] = [
		{
			id: "drag",
			header: () => null,
			cell: ({ row }) =>
				renderSnippet(DragHandle, { id: row.original.bookingUUID }),
		},
		{
			accessorKey: "jobId",
			header: ({ column }) => renderSnippet(SortableHeader, { label: "Job ID", column }),
			cell: ({ row }) => row.original.jobId,
			enableHiding: false,
		},
		{
			accessorKey: "sessionId",
			header: ({ column }) => renderSnippet(SortableHeader, { label: "Session ID", column }),
			cell: ({ row }) => row.original.sessionId,
		},
		{
			accessorKey: "seid",
			header: ({ column }) => renderSnippet(SortableHeader, { label: "SEID", column }),
			cell: ({ row }) => row.original.seid,
			enableHiding: false,
		},
		{
			accessorKey: "seidDescription",
			header: ({ column }) => renderSnippet(SortableHeader, { label: "SEID Description", column }),
			cell: ({ row }) => row.original.seidDescription || "—",
		},
		{
			accessorKey: "sampleId",
			header: ({ column }) => renderSnippet(SortableHeader, { label: "Sample ID", column }),
			cell: ({ row }) => {
				const sampleId = row.original.sampleId;
				if (Array.isArray(sampleId)) {
					return sampleId.join(", ");
				}
				return sampleId || "—";
			},
		},
		{
			accessorKey: "bookingStart",
			header: ({ column }) => renderSnippet(SortableHeader, { label: "Booking Start", column }),
			cell: ({ row }) => {
				const date = new Date(row.original.bookingStart);
				return date.toLocaleDateString();
			},
		},
		{
			accessorKey: "bookingEnd",
			header: ({ column }) => renderSnippet(SortableHeader, { label: "Booking End", column }),
			cell: ({ row }) => {
				const date = new Date(row.original.bookingEnd);
				return date.toLocaleDateString();
			},
		},
		{
			id: "scientificSupport",
			accessorFn: (row) => {
				const support = row.scientificSupport;
				if (!support) return "";
				const user = Array.isArray(support) ? support[0] : support;
				if (!user) return "";
				return [user.firstName, user.lastName].filter(Boolean).join(" ") || "";
			},
			header: ({ column }) => renderSnippet(SortableHeader, { label: "Scientific Support", column }),
			cell: ({ row }) => {
				const support = row.original.scientificSupport;
				if (!support) return "—";
				const user = Array.isArray(support) ? support[0] : support;
				if (!user) return "—";
				return [user.firstName, user.lastName].filter(Boolean).join(" ") || "—";
			},
		},
		{
			accessorKey: "institution",
			header: ({ column }) => renderSnippet(SortableHeader, { label: "Institution", column }),
			cell: ({ row }) => row.original.institution || "—",
		},
		{
			accessorKey: "stage",
			header: ({ column }) => renderSnippet(SortableHeader, { label: "Stage", column }),
			cell: ({ row }) => row.original.stage || "Initial",
		},
	];
</script>

<script lang="ts">
	import {
		getCoreRowModel,
		getFacetedRowModel,
		getFacetedUniqueValues,
		getFilteredRowModel,
		getSortedRowModel,
		type ColumnDef,
		type ColumnFiltersState,
		type PaginationState,
		type Row,
		type RowSelectionState,
		type SortingState,
		type VisibilityState,
	} from "@tanstack/table-core";
	import type { MRFSchema, Schema } from "./schemas.js";
	import {
		useSensors,
		MouseSensor,
		TouchSensor,
		KeyboardSensor,
		useSensor,
		type DragEndEvent,
		type UniqueIdentifier,
		DndContext,
		closestCenter,
	} from "@dnd-kit-svelte/core";
	import {
		arrayMove,
		SortableContext,
		useSortable,
		verticalListSortingStrategy,
	} from "@dnd-kit-svelte/sortable";
	import { restrictToVerticalAxis } from "@dnd-kit-svelte/modifiers";
	import { createSvelteTable } from "$lib/components/ui/data-table/data-table.svelte.js";
	import * as Tabs from "$lib/components/ui/tabs/index.js";
	import * as Table from "$lib/components/ui/table/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import * as Select from "$lib/components/ui/select/index.js";
	import { Label } from "$lib/components/ui/label/index.js";
	import { Badge } from "$lib/components/ui/badge/index.js";
	import {
		FlexRender,
		renderSnippet,
	} from "$lib/components/ui/data-table/index.js";
	import GripVerticalIcon from "@tabler/icons-svelte/icons/grip-vertical";
	import ArrowsSort from "@tabler/icons-svelte/icons/arrows-sort";
	import SortAscendingIcon from "@tabler/icons-svelte/icons/sort-ascending";
	import SortDescendingIcon from "@tabler/icons-svelte/icons/sort-descending";
	import ChevronsLeftIcon from "@tabler/icons-svelte/icons/chevrons-left";
	import ChevronLeftIcon from "@tabler/icons-svelte/icons/chevron-left";
	import ChevronRightIcon from "@tabler/icons-svelte/icons/chevron-right";
	import ChevronsRightIcon from "@tabler/icons-svelte/icons/chevrons-right";
	import { CSS } from "@dnd-kit-svelte/utilities";
	import { goto } from "$app/navigation";

	interface ServerPagination {
		page: number;
		pageSize: number;
		total: number;
		totalPages: number;
	}

	let {
		data,
		serverPagination,
	}: { data: MRFSchema[]; serverPagination: ServerPagination } = $props();
	let pagination = $state<PaginationState>({
		pageIndex: serverPagination.page - 1,
		pageSize: serverPagination.pageSize,
	});
	let sorting = $state<SortingState>([]);
	let columnFilters = $state<ColumnFiltersState>([]);
	let rowSelection = $state<RowSelectionState>({});
	let columnVisibility = $state<VisibilityState>({});

	const sortableId = $props.id();

	const sensors = useSensors(
		useSensor(MouseSensor, {}),
		useSensor(TouchSensor, {}),
		useSensor(KeyboardSensor, {}),
	);

	const dataIds: UniqueIdentifier[] = $derived(
		data.map((item) => item.bookingUUID),
	);

	function navigateToPage(pageIndex: number, pageSize: number) {
		const params = new URLSearchParams();
		params.set("page", String(pageIndex + 1));
		params.set("page_size", String(pageSize));
		goto(`/bookings?${params.toString()}`);
	}

	const table = createSvelteTable({
		get data() {
			return data;
		},
		columns,
		state: {
			get pagination() {
				return pagination;
			},
			get sorting() {
				return sorting;
			},
			get columnVisibility() {
				return columnVisibility;
			},
			get rowSelection() {
				return rowSelection;
			},
			get columnFilters() {
				return columnFilters;
			},
		},
		getRowId: (row) => row.bookingUUID.toString(),
		enableRowSelection: true,
		manualPagination: true,
		get rowCount() {
			return serverPagination.total;
		},
		get pageCount() {
			return serverPagination.totalPages;
		},
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFacetedRowModel: getFacetedRowModel(),
		getFacetedUniqueValues: getFacetedUniqueValues(),
		getFilteredRowModel: getFilteredRowModel(),
		onPaginationChange: (updater) => {
			const newPagination =
				typeof updater === "function" ? updater(pagination) : updater;
			pagination = newPagination;
			navigateToPage(newPagination.pageIndex, newPagination.pageSize);
		},
		onSortingChange: (updater) => {
			if (typeof updater === "function") {
				sorting = updater(sorting);
			} else {
				sorting = updater;
			}
		},
		onColumnFiltersChange: (updater) => {
			if (typeof updater === "function") {
				columnFilters = updater(columnFilters);
			} else {
				columnFilters = updater;
			}
		},
		onColumnVisibilityChange: (updater) => {
			if (typeof updater === "function") {
				columnVisibility = updater(columnVisibility);
			} else {
				columnVisibility = updater;
			}
		},
		onRowSelectionChange: (updater) => {
			if (typeof updater === "function") {
				rowSelection = updater(rowSelection);
			} else {
				rowSelection = updater;
			}
		},
	});

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		if (active && over && active.id !== over.id) {
			const oldIndex = dataIds.indexOf(active.id);
			const newIndex = dataIds.indexOf(over.id);
			data = arrayMove(data, oldIndex, newIndex);
		}
	}

	let views = [
		{
			id: "outline",
			label: "Outline",
			badge: 0,
		},
		{
			id: "past-performance",
			label: "Past Performance",
			badge: 3,
		},
		{
			id: "key-personnel",
			label: "Key Personnel",
			badge: 2,
		},
		{
			id: "focus-documents",
			label: "Focus Documents",
			badge: 0,
		},
	];

	let view = $state("outline");
	let viewLabel = $derived(
		views.find((v) => view === v.id)?.label ?? "Select a view",
	);

	// Responsive column visibility based on screen width
	function updateResponsiveVisibility() {
		const width = window.innerWidth;
		if (width < 640) {
			// Mobile: show only essential columns
			columnVisibility = {
				drag: false,
				jobId: true,
				sessionId: false,
				seid: true,
				seidDescription: false,
				sampleId: false,
				bookingStart: false,
				bookingEnd: false,
				stage: true,
				scientificSupport: false,
				institution: false,
			};
		} else if (width < 1024) {
			// Tablet: show core columns
			columnVisibility = {
				drag: false,
				jobId: true,
				sessionId: true,
				seid: true,
				seidDescription: false,
				sampleId: false,
				bookingStart: true,
				bookingEnd: true,
				stage: true,
				scientificSupport: false,
				institution: false,
			};
		} else if (width < 1280) {
			// Small desktop: hide extra columns
			columnVisibility = {
				drag: true,
				jobId: true,
				sessionId: true,
				seid: true,
				seidDescription: true,
				sampleId: true,
				bookingStart: true,
				bookingEnd: true,
				stage: true,
				scientificSupport: false,
				institution: false,
			};
		} else {
			// Large desktop: show all
			columnVisibility = {};
		}
	}

	$effect(() => {
		updateResponsiveVisibility();
		window.addEventListener("resize", updateResponsiveVisibility);
		return () => window.removeEventListener("resize", updateResponsiveVisibility);
	});
</script>

<Tabs.Root value="outline" class="w-full flex-col justify-start gap-6">
	<div class="flex items-center justify-between px-4 lg:px-6">
		<Label for="view-selector" class="sr-only">View</Label>
		<Tabs.List
			class="**:data-[slot=badge]:bg-muted-foreground/30 **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:px-1 @4xl/main:flex hidden"
		>
			{#each views as view (view.id)}
				<Tabs.Trigger value={view.id}>
					{view.label}
					{#if view.badge > 0}
						<Badge variant="secondary">{view.badge}</Badge>
					{/if}
				</Tabs.Trigger>
			{/each}
		</Tabs.List>
	</div>
	<Tabs.Content
		value="outline"
		class="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
	>
		<div class="overflow-x-auto rounded-lg border">
			<DndContext
				collisionDetection={closestCenter}
				modifiers={[restrictToVerticalAxis]}
				onDragEnd={handleDragEnd}
				{sensors}
				id={sortableId}
			>
				<Table.Root>
					<Table.Header class="bg-muted sticky top-0 z-10">
						{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
							<Table.Row>
								{#each headerGroup.headers as header (header.id)}
									<Table.Head colspan={header.colSpan}>
										{#if !header.isPlaceholder}
											<FlexRender
												content={header.column.columnDef
													.header}
												context={header.getContext()}
											/>
										{/if}
									</Table.Head>
								{/each}
							</Table.Row>
						{/each}
					</Table.Header>
					<Table.Body class="**:data-[slot=table-cell]:first:w-8">
						{#if table.getRowModel().rows?.length}
							<SortableContext
								items={dataIds}
								strategy={verticalListSortingStrategy}
							>
								{#each table.getRowModel().rows as row (row.id)}
									{@render DraggableRow({ row })}
								{/each}
							</SortableContext>
						{:else}
							<Table.Row>
								<Table.Cell
									colspan={columns.length}
									class="h-24 text-center"
								>
									No results.
								</Table.Cell>
							</Table.Row>
						{/if}
					</Table.Body>
				</Table.Root>
			</DndContext>
		</div>
		<div class="flex flex-wrap items-center justify-between gap-2 px-2 sm:px-4">
			<div class="text-muted-foreground flex-1 text-sm">
				Showing {data.length} of {serverPagination.total} booking(s).
			</div>
			<div class="flex flex-wrap items-center gap-4">
				<div class="flex items-center gap-2">
					<Label for="rows-per-page" class="text-sm font-medium"
						>Rows per page</Label
					>
					<Select.Root
						type="single"
						bind:value={
							() => `${table.getState().pagination.pageSize}`,
							(v) => table.setPageSize(Number(v))
						}
					>
						<Select.Trigger
							size="sm"
							class="w-20"
							id="rows-per-page"
						>
							{table.getState().pagination.pageSize}
						</Select.Trigger>
						<Select.Content side="top">
							{#each [10, 20, 30, 40, 50] as pageSize (pageSize)}
								<Select.Item value={pageSize.toString()}>
									{pageSize}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div
					class="flex w-fit items-center justify-center text-sm font-medium"
				>
					Page {table.getState().pagination.pageIndex + 1} of
					{table.getPageCount()}
				</div>
				<div class="flex items-center gap-2">
					<Button
						variant="outline"
						class="size-8"
						size="icon"
						onclick={() => table.setPageIndex(0)}
						disabled={!table.getCanPreviousPage()}
					>
						<span class="sr-only">Go to first page</span>
						<ChevronsLeftIcon />
					</Button>
					<Button
						variant="outline"
						class="size-8"
						size="icon"
						onclick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
					>
						<span class="sr-only">Go to previous page</span>
						<ChevronLeftIcon />
					</Button>
					<Button
						variant="outline"
						class="size-8"
						size="icon"
						onclick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
					>
						<span class="sr-only">Go to next page</span>
						<ChevronRightIcon />
					</Button>
					<Button
						variant="outline"
						class="size-8"
						size="icon"
						onclick={() =>
							table.setPageIndex(table.getPageCount() - 1)}
						disabled={!table.getCanNextPage()}
					>
						<span class="sr-only">Go to last page</span>
						<ChevronsRightIcon />
					</Button>
				</div>
			</div>
		</div>
	</Tabs.Content>
	<Tabs.Content value="past-performance" class="flex flex-col px-4 lg:px-6">
		<div
			class="aspect-video w-full flex-1 rounded-lg border border-dashed"
		></div>
	</Tabs.Content>
	<Tabs.Content value="key-personnel" class="flex flex-col px-4 lg:px-6">
		<div
			class="aspect-video w-full flex-1 rounded-lg border border-dashed"
		></div>
	</Tabs.Content>
	<Tabs.Content value="focus-documents" class="flex flex-col px-4 lg:px-6">
		<div
			class="aspect-video w-full flex-1 rounded-lg border border-dashed"
		></div>
	</Tabs.Content>
</Tabs.Root>

{#snippet SortableHeader({ label, column }: { label: string, column: any })}
	<Button
		variant="ghost"
		class="-ml-3 h-8"
		onclick={() => column.toggleSorting(column.getIsSorted() === "asc")}
	>
		{label}
		{#if column.getIsSorted() === "asc"}
			<SortAscendingIcon class="ml-1 size-4" />
		{:else if column.getIsSorted() === "desc"}
			<SortDescendingIcon class="ml-1 size-4" />
		{:else}
			<ArrowsSort class="ml-1 size-4" />
		{/if}
	</Button>
{/snippet}

{#snippet DragHandle({ id }: { id: string })}
	{@const sortable = useSortable({ id })}
	<Button
		variant="ghost"
		size="icon"
		class="text-muted-foreground size-7 hover:bg-transparent"
		{...sortable.attributes.current}
		{...sortable.listeners.current}
	>
		<GripVerticalIcon class="text-muted-foreground size-3" />
		<span class="sr-only">Drag to reorder</span>
	</Button>
{/snippet}

{#snippet DraggableRow({ row }: { row: Row<MRFSchema> })}
	{@const sortable = useSortable({ id: row.original.bookingUUID })}
	{@const hasDetailPage = !!row.original.bookingUUID}
	{@const detailUrl = hasDetailPage ? `/bookings/${row.original.jobId}/${row.original.sessionId}?uuid=${row.original.bookingUUID}` : null}
	<Table.Row
		data-state={row.getIsSelected() ? "selected" : undefined}
		class={hasDetailPage ? "cursor-pointer hover:bg-muted/50" : ""}
		style={sortable.transform.current ? CSS.Transform.toString(sortable.transform.current) : undefined}
		onclick={(e: MouseEvent) => {
			// Don't navigate if clicking on interactive elements
			const target = e.target as HTMLElement;
			if (target.closest("button") || target.closest("[role='menuitem']") || target.closest("input")) {
				return;
			}
			if (detailUrl) {
				goto(detailUrl);
			}
		}}
	>
		{#each row.getVisibleCells() as cell (cell.id)}
			<Table.Cell class={cell.column.id === "drag" ? "" : "max-w-[200px]"}>
				<div class={cell.column.id === "drag" ? "" : "truncate"}>
					<FlexRender
						content={cell.column.columnDef.cell}
						context={cell.getContext()}
					/>
				</div>
			</Table.Cell>
		{/each}
	</Table.Row>
{/snippet}
