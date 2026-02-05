<script lang="ts">
	import type { Row } from "@tanstack/table-core";
	import type { MRFSchema } from "./schemas.js";

	let { row }: { row: Row<MRFSchema> } = $props();

	function formatUser(user: { firstName: string; lastName: string; email: string } | { firstName: string; lastName: string; email: string }[] | undefined): string {
		if (!user) return "—";
		if (Array.isArray(user)) {
			return user.map((u) => `${u.firstName} ${u.lastName}`).join(", ");
		}
		return `${user.firstName} ${user.lastName}`;
	}
</script>

<span class="text-sm">{formatUser(row.original.scientificSupport)}</span>
