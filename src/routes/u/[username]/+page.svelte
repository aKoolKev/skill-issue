<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { SegmentedControl } from '@skeletonlabs/skeleton-svelte';
	import { ChevronRight, LoaderCircle } from '@lucide/svelte';
	import { player } from '$lib/player.svelte';
	import type { Color } from '$lib/games';
	import RecordBar from '$lib/components/RecordBar.svelte';

	// Every opening the player has played, as White or as Black, most played first
	let color = $state<Color>('white');

	const shown = $derived(player.openings.filter((family) => family.color === color));
	const countFor = (c: Color) => player.games.filter((game) => game.color === c).length;

	/** The family's most played lines, for a preview under its name */
	function topLines(family: (typeof shown)[number]) {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- a local tally, not state
		const counts = new Map<string, number>();
		for (const { line } of family.games) {
			counts.set(line.variation, (counts.get(line.variation) ?? 0) + 1);
		}
		return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
	}
</script>

<section class="flex flex-col gap-4">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<p class="text-muted">
			Openings from your recent games. Pick one to see its lines and lessons.
		</p>
		<SegmentedControl value={color} onValueChange={(d) => (color = d.value as Color)}>
			<SegmentedControl.Label class="sr-only">Your color</SegmentedControl.Label>
			<SegmentedControl.Control>
				<SegmentedControl.Indicator />
				{#each ['white', 'black'] as const as c (c)}
					<SegmentedControl.Item value={c}>
						<SegmentedControl.ItemText>
							As {c === 'white' ? 'White' : 'Black'}
							<span class="text-xs opacity-70">({countFor(c)})</span>
						</SegmentedControl.ItemText>
						<SegmentedControl.ItemHiddenInput />
					</SegmentedControl.Item>
				{/each}
			</SegmentedControl.Control>
		</SegmentedControl>
	</div>

	{#if !player.book || (player.status === 'loading' && !player.games.length)}
		<p class="flex items-center gap-2 text-muted">
			<LoaderCircle class="size-4 animate-spin" /> Loading…
		</p>
	{:else if !shown.length}
		<p class="card preset-filled-surface-100-900 p-5 text-muted">
			No games as {color === 'white' ? 'White' : 'Black'} in the last few months.
		</p>
	{:else}
		<ul class="grid gap-3 md:grid-cols-2">
			{#each shown as family (family.slug)}
				<li>
					<a
						href={resolve('/u/[username]/openings/[color]/[family]', {
							username: page.params.username ?? '',
							color,
							family: family.slug
						})}
						class="flex h-full flex-col gap-3 card preset-filled-surface-100-900 p-4 transition-colors hover:preset-filled-surface-200-800"
					>
						<div class="flex items-start justify-between gap-3">
							<h2 class="font-bold">{family.name}</h2>
							<span class="flex shrink-0 items-center gap-1 text-sm text-muted">
								{family.games.length}
								{family.games.length === 1 ? 'game' : 'games'}
								<ChevronRight class="size-4" />
							</span>
						</div>
						<RecordBar games={family.games.map((g) => g.game)} />
						<div class="flex flex-wrap gap-1.5">
							{#each topLines(family) as [variation, count] (variation)}
								<span class="chip preset-tonal text-xs">{variation} · {count}</span>
							{/each}
						</div>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</section>
