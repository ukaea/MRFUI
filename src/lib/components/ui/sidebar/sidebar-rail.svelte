<script lang="ts">
	import { cn, type WithElementRef } from "$lib/utils.js";
	import type { HTMLAttributes } from "svelte/elements";
	import { useSidebar } from "./context.svelte.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>, HTMLDivElement> = $props();

	const sidebar = useSidebar();

	let dragging = $state(false);
	let startX = 0;
	let startWidth = 0;

	function onPointerDown(e: PointerEvent) {
		dragging = true;
		sidebar.isResizing = true;
		startX = e.clientX;
		startWidth = sidebar.sidebarWidth;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		e.preventDefault();
	}

	function onPointerMove(e: PointerEvent) {
		if (!dragging) return;
		const delta = e.clientX - startX;
		sidebar.setWidth(startWidth + delta);
	}

	function onPointerUp() {
		dragging = false;
		sidebar.isResizing = false;
	}
</script>

<div
	bind:this={ref}
	data-sidebar="rail"
	data-slot="sidebar-rail"
	aria-label="Resize Sidebar"
	role="separator"
	aria-orientation="vertical"
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	class={cn(
		"after:bg-sidebar-border hover:after:bg-sidebar-ring absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 cursor-col-resize select-none transition-colors after:absolute after:inset-y-0 after:left-[calc(1/2*100%-1px)] after:w-[2px] group-data-[side=left]:-right-4 group-data-[side=right]:left-0 sm:flex",
		dragging && "after:bg-sidebar-ring",
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
