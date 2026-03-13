<script lang="ts">
	import { page } from "$app/state";
	import { Button } from "$lib/components/ui/button/index.js";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
	import * as Avatar from "$lib/components/ui/avatar/index.js";
	import UserIcon from "@tabler/icons-svelte/icons/user";
	import LogoutIcon from "@tabler/icons-svelte/icons/logout";

	let user = $derived(page.data.user ?? null);

	async function signOut() {
		await fetch("/api/auth/sign-out", { method: "POST" });
		window.location.href = "/login";
	}

	function getInitials(name: string): string {
		return name
			.split(" ")
			.map((n) => n[0])
			.slice(0, 2)
			.join("")
			.toUpperCase();
	}

	let displayName = $derived(
		user ? `${user.name ?? user.email ?? "User"}` : "",
	);
</script>

<header
	class="h-(--header-height) flex shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear"
>
	<div class="flex w-full items-center justify-end gap-1 px-4 lg:gap-2 lg:px-6">
		{#if user}
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button variant="ghost" class="flex items-center gap-2 px-2" {...props}>
							<Avatar.Root class="size-7">
								<Avatar.Fallback class="text-xs">
									{getInitials(displayName)}
								</Avatar.Fallback>
							</Avatar.Root>
							<span class="hidden sm:inline text-sm font-medium">{displayName}</span>
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end" class="w-48">
					<DropdownMenu.Label class="font-normal">
						<div class="flex flex-col gap-1">
							<p class="text-sm font-medium">{displayName}</p>
							{#if user.email}
								<p class="text-xs text-muted-foreground truncate">{user.email}</p>
							{/if}
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
			<Button variant="outline" size="sm" href="/login">
				<UserIcon class="mr-2 size-4" />
				Login
			</Button>
		{/if}
	</div>
</header>
