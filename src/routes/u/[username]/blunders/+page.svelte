<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { Progress, SegmentedControl } from '@skeletonlabs/skeleton-svelte';
	import { Cpu, Eye, Play, Square, Trash2 } from '@lucide/svelte';
	import { player } from '$lib/player.svelte';
	import { shortDate } from '$lib/games';
	import { dueCount, knownCount } from '$lib/review';
	import type { Card } from '$lib/analysis';
	import Board from '$lib/components/Board.svelte';

	// Find blunders with the engine, then see them as cards and start a review
	let which = $state<'losses' | 'all'>('losses');
	let howMany = $state('10');

	/** Games of the chosen kind not analysed yet, newest first */
	const pending = $derived(
		player.games.filter(
			(game) => !(game.id in player.analyzed) && (which === 'all' || game.result === 'loss')
		)
	);
	const toAnalyze = $derived(pending.slice(0, Number(howMany)));
	const analyzedCount = $derived(Object.keys(player.analyzed).length);
	const due = $derived(dueCount(player.cards, player.progress));
	const known = $derived(knownCount(player.cards, player.progress));

	let shown = $state(12);
	let revealed = $state<Record<string, boolean>>({});

	const pct = (chance: number) => `${Math.round(chance * 100)}%`;
	const squares = (uci: string) => ({ from: uci.slice(0, 2), to: uci.slice(2, 4) });
	const boxOf = (card: Card) => player.progress[card.id]?.box;
</script>

<section class="flex flex-col gap-6">
	<!-- Summary and the way into a review session -->
	<div class="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
		<dl class="grid grid-cols-3 gap-3">
			<div class="card preset-filled-surface-100-900 p-3">
				<dt class="text-xs text-muted">Cards</dt>
				<dd class="text-2xl font-bold">{player.cards.length}</dd>
			</div>
			<div class="card preset-filled-surface-100-900 p-3">
				<dt class="text-xs text-muted">Due now</dt>
				<dd class="text-2xl font-bold">{due}</dd>
			</div>
			<div class="card preset-filled-surface-100-900 p-3">
				<dt class="text-xs text-muted">Learned</dt>
				<dd class="text-2xl font-bold">{known}</dd>
			</div>
		</dl>
		{#if player.cards.length}
			<a
				href={resolve('/u/[username]/review', { username: page.params.username ?? '' })}
				class="btn preset-filled-primary-500 btn-lg"
				aria-disabled={!due}
			>
				<Play class="size-5" />
				{due ? `Review ${Math.min(due, 20)} cards` : 'All caught up'}
			</a>
		{/if}
	</div>

	<!-- Running the engine -->
	<div class="flex flex-col gap-4 card border border-surface-200-800 p-4">
		<div class="flex items-start gap-3">
			<Cpu class="mt-0.5 size-5 shrink-0 text-primary-600-400" />
			<div class="flex flex-col gap-1">
				<h2 class="font-bold">Find blunders</h2>
				<p class="text-sm text-muted">
					Stockfish runs in your browser and checks every move. Each game takes about 5–20 seconds.
					Keep this tab open; cards appear as each game finishes. {analyzedCount} games checked so far.
				</p>
			</div>
		</div>

		{#if player.job}
			<Progress value={player.job.done} max={player.job.total} class="flex flex-col gap-1.5">
				<div class="flex items-center justify-between text-sm">
					<Progress.Label class="font-medium"
						>Checked {player.job.done} of {player.job.total} games</Progress.Label
					>
					<Progress.ValueText class="text-muted" />
				</div>
				<Progress.Track class="h-2">
					<Progress.Range class="bg-primary-500 transition-[width] duration-300" />
				</Progress.Track>
			</Progress>
			<button
				type="button"
				class="btn self-start preset-tonal btn-sm"
				onclick={() => player.stopAnalysis()}
			>
				<Square class="size-4" /> Stop
			</button>
		{:else}
			<div class="flex flex-wrap items-center gap-3">
				<SegmentedControl value={which} onValueChange={(d) => (which = d.value as typeof which)}>
					<SegmentedControl.Label class="sr-only">Which games</SegmentedControl.Label>
					<SegmentedControl.Control>
						<SegmentedControl.Indicator />
						<SegmentedControl.Item value="losses">
							<SegmentedControl.ItemText>Losses</SegmentedControl.ItemText>
							<SegmentedControl.ItemHiddenInput />
						</SegmentedControl.Item>
						<SegmentedControl.Item value="all">
							<SegmentedControl.ItemText>All games</SegmentedControl.ItemText>
							<SegmentedControl.ItemHiddenInput />
						</SegmentedControl.Item>
					</SegmentedControl.Control>
				</SegmentedControl>
				<SegmentedControl value={howMany} onValueChange={(d) => (howMany = d.value ?? '10')}>
					<SegmentedControl.Label class="sr-only">How many</SegmentedControl.Label>
					<SegmentedControl.Control>
						<SegmentedControl.Indicator />
						{#each ['10', '25', '50'] as n (n)}
							<SegmentedControl.Item value={n}>
								<SegmentedControl.ItemText>{n}</SegmentedControl.ItemText>
								<SegmentedControl.ItemHiddenInput />
							</SegmentedControl.Item>
						{/each}
					</SegmentedControl.Control>
				</SegmentedControl>
			</div>
			<button
				type="button"
				class="btn self-start preset-filled-primary-500"
				disabled={!toAnalyze.length || player.status === 'loading'}
				onclick={() => player.analyze(toAnalyze)}
			>
				<Cpu class="size-4" />
				{#if player.status === 'loading'}
					Loading games…
				{:else if toAnalyze.length}
					Check {toAnalyze.length} {which === 'losses' ? 'losses' : 'games'}
				{:else}
					No unchecked {which === 'losses' ? 'losses' : 'games'} left
				{/if}
			</button>
		{/if}
	</div>

	<!-- The cards -->
	{#if player.cards.length}
		<div class="flex flex-col gap-3">
			<div class="flex items-center justify-between gap-3">
				<h2 class="h5">Your blunders</h2>
				<button
					type="button"
					class="btn btn-sm hover:preset-tonal"
					onclick={() => {
						if (confirm('Delete every card and your progress for this player on this device?'))
							player.clearBlunders();
					}}
				>
					<Trash2 class="size-4" /> Clear
				</button>
			</div>
			<ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{#each player.cards.slice(0, shown) as card (card.id)}
					<li class="flex flex-col gap-3 card preset-filled-surface-100-900 p-3">
						<Board
							fen={card.fen}
							orientation={card.color}
							arrows={revealed[card.id]
								? [
										{ ...squares(card.playedUci), color: 'red' },
										{ ...squares(card.bestUci), color: 'green' }
									]
								: [{ ...squares(card.playedUci), color: 'red' }]}
						/>
						<div class="flex flex-col gap-1 text-sm">
							<p class="text-muted">
								Move {card.moveNumber} vs {card.opponent} ·
								<span class="capitalize">{card.timeClass}</span>
								· {shortDate(card.endTime)}
							</p>
							<p>
								You played <strong class="font-mono">{card.played}</strong>: winning chances
								{pct(card.before)} → {pct(card.after)}
							</p>
							{#if revealed[card.id]}
								<p>
									Best was <strong class="font-mono text-success-700-300">{card.best}</strong>
									<span class="font-mono text-xs text-muted">{card.line.slice(1).join(' ')}</span>
								</p>
							{:else}
								<button
									type="button"
									class="btn self-start btn-sm hover:preset-tonal"
									onclick={() => (revealed = { ...revealed, [card.id]: true })}
								>
									<Eye class="size-4" /> Show best move
								</button>
							{/if}
							{#if boxOf(card) !== undefined}
								<p class="text-xs text-muted">Learning level {boxOf(card)} of 5</p>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
			{#if shown < player.cards.length}
				<button type="button" class="btn self-center preset-tonal" onclick={() => (shown += 12)}>
					Show more ({player.cards.length - shown} left)
				</button>
			{/if}
		</div>
	{:else if analyzedCount && !player.job}
		<p class="card preset-filled-surface-100-900 p-5 text-muted">
			No blunders found in {analyzedCount} games. Nice. Check more games to find some.
		</p>
	{/if}
</section>
