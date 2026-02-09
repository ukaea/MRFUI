<script lang="ts">
    import CalendarIcon from "@tabler/icons-svelte/icons/calendar";
    import ClockIcon from "@tabler/icons-svelte/icons/clock";
    import FileExportIcon from "@tabler/icons-svelte/icons/file-export";
    import DatabaseImportIcon from "@tabler/icons-svelte/icons/database-import";
    import * as Card from "$lib/components/ui/card/index.js";

    interface Props {
        stats: {
            totalCount: number;
            initial: number;
            dataExport: number;
            ingest: number;
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
                {stats.totalCount}
            </Card.Title>
            <Card.Action>
                <CalendarIcon class="text-muted-foreground size-5" />
            </Card.Action>
        </Card.Header>
        <Card.Footer class="flex-col items-start gap-1.5 text-sm">
            <div class="text-muted-foreground">All records in system</div>
        </Card.Footer>
    </Card.Root>

    <Card.Root class="@container/card">
        <Card.Header>
            <Card.Description>Initial</Card.Description>
            <Card.Title class="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
                {stats.initial}
            </Card.Title>
            <Card.Action>
                <ClockIcon class="text-muted-foreground size-5" />
            </Card.Action>
        </Card.Header>
        <Card.Footer class="flex-col items-start gap-1.5 text-sm">
            <div class="text-muted-foreground">Awaiting processing</div>
        </Card.Footer>
    </Card.Root>

    <Card.Root class="@container/card">
        <Card.Header>
            <Card.Description>Data Export</Card.Description>
            <Card.Title class="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
                {stats.dataExport}
            </Card.Title>
            <Card.Action>
                <FileExportIcon class="text-muted-foreground size-5" />
            </Card.Action>
        </Card.Header>
        <Card.Footer class="flex-col items-start gap-1.5 text-sm">
            <div class="text-muted-foreground">Ready for data export</div>
        </Card.Footer>
    </Card.Root>

    <Card.Root class="@container/card">
        <Card.Header>
            <Card.Description>Ingest</Card.Description>
            <Card.Title class="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
                {stats.ingest}
            </Card.Title>
            <Card.Action>
                <DatabaseImportIcon class="text-muted-foreground size-5" />
            </Card.Action>
        </Card.Header>
        <Card.Footer class="flex-col items-start gap-1.5 text-sm">
            <div class="text-muted-foreground">Data being ingested</div>
        </Card.Footer>
    </Card.Root>
</div>