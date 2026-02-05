<script lang="ts">
	import CalendarIcon from "@tabler/icons-svelte/icons/calendar";
	import ClockIcon from "@tabler/icons-svelte/icons/clock";
	import CircleCheckIcon from "@tabler/icons-svelte/icons/circle-check";
	import CircleXIcon from "@tabler/icons-svelte/icons/circle-x";
	import * as Card from "$lib/components/ui/card/index.js";

	interface Props {
		stats: {
			total: number;
			inProgress: number;
			completed: number;
			scheduled: number;
			cancelled: number;
		};
	}

	let { stats }: Props = $props();
</script>

<div
	class="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4 grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t lg:px-6"
>
	<Card.Root class="@container/card">
		<Card.Header>
			<Card.Description>Total Bookings</Card.Description>
			<Card.Title class="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
				{stats.total}
			</Card.Title>
			<Card.Action>
				<CalendarIcon class="text-muted-foreground size-5" />
			</Card.Action>
		</Card.Header>
		<Card.Footer class="flex-col items-start gap-1.5 text-sm">
			<div class="text-muted-foreground">All bookings across the facility</div>
		</Card.Footer>
	</Card.Root>
	<Card.Root class="@container/card">
		<Card.Header>
			<Card.Description>In Progress</Card.Description>
			<Card.Title class="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
				{stats.inProgress}
			</Card.Title>
			<Card.Action>
				<ClockIcon class="text-muted-foreground size-5" />
			</Card.Action>
		</Card.Header>
		<Card.Footer class="flex-col items-start gap-1.5 text-sm">
			<div class="text-muted-foreground">Currently active sessions</div>
		</Card.Footer>
	</Card.Root>
	<Card.Root class="@container/card">
		<Card.Header>
			<Card.Description>Completed</Card.Description>
			<Card.Title class="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
				{stats.completed}
			</Card.Title>
			<Card.Action>
				<CircleCheckIcon class="text-muted-foreground size-5" />
			</Card.Action>
		</Card.Header>
		<Card.Footer class="flex-col items-start gap-1.5 text-sm">
			<div class="text-muted-foreground">Successfully finished bookings</div>
		</Card.Footer>
	</Card.Root>
	<Card.Root class="@container/card">
		<Card.Header>
			<Card.Description>Cancelled</Card.Description>
			<Card.Title class="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
				{stats.cancelled}
			</Card.Title>
			<Card.Action>
				<CircleXIcon class="text-muted-foreground size-5" />
			</Card.Action>
		</Card.Header>
		<Card.Footer class="flex-col items-start gap-1.5 text-sm">
			<div class="text-muted-foreground">Bookings that were cancelled</div>
		</Card.Footer>
	</Card.Root>
</div>
