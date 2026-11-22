<script lang="ts">
	import { tally, type Game } from '$lib/games';

	// Wins / draws / losses as a stacked bar with the numbers beside it
	let { games, compact = false }: { games: Game[]; compact?: boolean } = $props();

	const counts = $derived(tally(games));
	const total = $derived(games.length || 1);
	const pct = (n: number) => `${(n / total) * 100}%`;
	const score = $derived(Math.round(((counts.win + counts.draw / 2) / total) * 100));
</script>

<div class="flex flex-col gap-1">
	<div
		class="flex h-2 w-full overflow-hidden rounded-full bg-surface-200-800"
		role="img"
		aria-label="{counts.win} wins, {counts.draw} draws, {counts.loss} losses"
	>
		<div class="bg-success-500" style:width={pct(counts.win)}></div>
		<div class="bg-surface-400-600" style:width={pct(counts.draw)}></div>
		<div class="bg-error-500" style:width={pct(counts.loss)}></div>
	</div>
	{#if !compact}
		<p class="text-xs text-muted">
			{counts.win}W · {counts.draw}D · {counts.loss}L · {score}% score
		</p>
	{/if}
</div>
