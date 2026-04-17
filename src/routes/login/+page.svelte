<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js";
	import * as Card from "$lib/components/ui/card/index.js";
	import { page } from "$app/state";

	let loading = $state(false);
	let error = $state("");

	const callbackURL = $derived(page.url.searchParams.get("callbackURL") || "/");

	async function signIn() {
		loading = true;
		error = "";
		try {
			const res = await fetch("/api/auth/sign-in/oauth2", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ providerId: "keycloak", callbackURL }),
			});

			if (res.ok) {
				const data = await res.json();
				if (data.url) {
					window.location.href = data.url;
					return;
				}
			}
			error = "Failed to initiate login. Please try again.";
		} catch {
			error = "An unexpected error occurred.";
		}
		loading = false;
	}
</script>

<div class="flex min-h-screen items-center justify-center">
	<Card.Root class="w-full max-w-sm">
		<Card.Header class="text-center">
			<Card.Title class="text-2xl">MRF MVT</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-4">
			{#if error}
				<p class="text-destructive text-sm text-center">{error}</p>
			{/if}
			<Button class="w-full" onclick={signIn} disabled={loading}>
				{#if loading}
					Redirecting to Keycloak...
				{:else}
					Sign in with Keycloak
				{/if}
			</Button>
		</Card.Content>
	</Card.Root>
</div>
