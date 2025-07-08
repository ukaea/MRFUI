<!-- src/routes/+layout.svelte -->
<script lang="ts">
	import "../app.css";
	import { page } from "$app/stores";
	import { goto } from "$app/navigation";

	let { children } = $props();

	const navItems = [{ name: "Bookings", href: "/bookings" }];

	function isActive(href: string): boolean {
		return (
			$page.url.pathname === href ||
			$page.url.pathname.startsWith(href + "/")
		);
	}

	function navigate(href: string) {
		goto(href);
	}

	let mobileMenuOpen = $state(false);

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}
</script>

<div class="min-h-screen bg-base-200">
	<!-- Top Header -->
	<div class="navbar bg-base-100 shadow-sm border-b border-base-300">
		<div class="navbar-start">
			<!-- Mobile menu button -->
			<div class="dropdown lg:hidden">
				<div
					tabindex="0"
					role="button"
					class="btn btn-ghost btn-sm"
					onclick={toggleMobileMenu}
				>
					<svg
						class="w-5 h-5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 6h16M4 12h16M4 18h16"
						></path>
					</svg>
				</div>
				{#if mobileMenuOpen}
					<ul
						tabindex="0"
						class="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52"
					>
						{#each navItems as item}
							<li>
								<button
									class="flex items-center gap-2 {isActive(
										item.href,
									)
										? 'active'
										: ''}"
									onclick={() => {
										navigate(item.href);
										mobileMenuOpen = false;
									}}
								>
									{item.name}
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
			<button
				class="btn btn-ghost text-lg font-semibold"
				onclick={() => navigate("/")}
			>
				MRF Booking Data
			</button>
		</div>
	</div>

	<div class="flex">
		<div
			class="w-56 min-h-screen bg-base-100 shadow-sm border-r border-base-300 hidden lg:block"
		>
			<div class="p-4">
				<nav class="space-y-1">
					{#each navItems as item}
						<button
							class="w-full flex items-center px-3 py-2 rounded text-left transition-colors duration-200 {isActive(
								item.href,
							)
								? 'bg-primary text-primary-content'
								: 'hover:bg-base-200 text-base-content'}"
							onclick={() => navigate(item.href)}
						>
							<span class="font-medium">{item.name}</span>
						</button>
					{/each}
				</nav>
			</div>
		</div>

		<!-- Main Content -->
		<div class="flex-1 p-6">
			{@render children()}
		</div>
	</div>
</div>
