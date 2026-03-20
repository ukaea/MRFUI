<script lang="ts">
	import DotsVerticalIcon from "@tabler/icons-svelte/icons/dots-vertical";
	import LogoutIcon from "@tabler/icons-svelte/icons/logout";
	import UserIcon from "@tabler/icons-svelte/icons/user";
	import * as Avatar from "$lib/components/ui/avatar/index.js";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { page } from "$app/state";

	const sidebar = Sidebar.useSidebar();

	let user = $derived(page.data.user ?? null);

	let displayName = $derived(user ? (user.name ?? user.email ?? "User") : "");

	function getInitials(name: string): string {
		return name
			.split(" ")
			.map((n) => n[0])
			.slice(0, 2)
			.join("")
			.toUpperCase();
	}

	async function signOut() {
		await fetch("/api/auth/sign-out", { method: "POST" });
		window.location.href = "/login";
	}
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		{#if user}
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Sidebar.MenuButton
							{...props}
							size="lg"
							class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						>
							<Avatar.Root class="size-8 rounded-lg grayscale">
								<Avatar.Fallback class="rounded-lg text-xs">
									{getInitials(displayName)}
								</Avatar.Fallback>
							</Avatar.Root>
							<div class="grid flex-1 text-left text-sm leading-tight">
								<span class="truncate font-medium">{displayName}</span>
								<span class="text-muted-foreground truncate text-xs">{user.email ?? ""}</span>
							</div>
							<DotsVerticalIcon class="ml-auto size-4" />
						</Sidebar.MenuButton>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content
					class="w-(--bits-dropdown-menu-anchor-width) min-w-56 rounded-lg"
					side={sidebar.isMobile ? "bottom" : "right"}
					align="end"
					sideOffset={4}
				>
					<DropdownMenu.Label class="p-0 font-normal">
						<div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
							<Avatar.Root class="size-8 rounded-lg">
								<Avatar.Fallback class="rounded-lg text-xs">
									{getInitials(displayName)}
								</Avatar.Fallback>
							</Avatar.Root>
							<div class="grid flex-1 text-left text-sm leading-tight">
								<span class="truncate font-medium">{displayName}</span>
								<span class="text-muted-foreground truncate text-xs">{user.email ?? ""}</span>
							</div>
						</div>
					</DropdownMenu.Label>
					<DropdownMenu.Separator />
					<DropdownMenu.Item onclick={signOut} class="cursor-pointer text-destructive focus:text-destructive">
						<LogoutIcon class="mr-2 size-4" />
						Sign out
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		{:else}
			<Sidebar.MenuButton size="lg" href="/login">
				<UserIcon class="size-5" />
				<span class="font-medium">Login</span>
			</Sidebar.MenuButton>
		{/if}
	</Sidebar.MenuItem>
</Sidebar.Menu>
