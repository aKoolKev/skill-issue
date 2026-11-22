<script lang="ts">
	import { Share2, LoaderCircle } from '@lucide/svelte';
	import { page } from '$app/state';
	import type { Card } from '$lib/analysis';
	import { shareCard } from '$lib/share';
	import { player } from '$lib/player.svelte';

	// Turns a card into a picture and opens the share sheet (or downloads it on desktop)
	let { card, class: className = '' }: { card: Card; class?: string } = $props();
	let busy = $state(false);

	async function share() {
		busy = true;
		try {
			await shareCard(card, player.profile?.username ?? page.params.username ?? '');
		} finally {
			busy = false;
		}
	}
</script>

<button
	type="button"
	class="btn btn-sm hover:preset-tonal {className}"
	disabled={busy}
	onclick={share}
>
	{#if busy}<LoaderCircle class="size-4 animate-spin" />{:else}<Share2 class="size-4" />{/if}
	Share
</button>
