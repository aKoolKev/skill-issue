<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { Progress, SegmentedControl } from '@skeletonlabs/skeleton-svelte';
	import { Cpu, Eye, Play, Square, Trash2, X } from '@lucide/svelte';
	import { player } from '$lib/player.svelte';
	import { shortDate } from '$lib/games';
	import { dueCount, knownCount } from '$lib/review';
	import type { Card } from '$lib/analysis';
	import Board from '$lib/components/Board.svelte';
	import ShareCard from '$lib/components/ShareCard.svelte';
	import { explain } from '$lib/explain';
	import {
		ALL_CARDS,
		blunderType,
		byPhase,
		byType,
		countBy,
		gamePhase,
		isMissedWin,
		MISSED_WINS,
		PHASES,
		TYPES,
		type CardFilter
	} from '$lib/tactics';

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
	// What kinds of mistakes keep coming back, and a filter to look at just one kind
	let filter = $state<CardFilter>(ALL_CARDS);
	const types = $derived(countBy(player.cards, blunderType));
	const phases = $derived(countBy(player.cards, gamePhase));
	const missedWins = $derived(player.cards.filter(isMissedWin).length);
	const topType = $derived(types.find(([type]) => type !== 'positional') ?? types[0]);
	const filtered = $derived(player.cards.filter(filter.test));
	const pick = (next: CardFilter) => (filter = filter.query === next.query ? ALL_CARDS : next);
	const reviewHref = $derived(
		resolve('/u/[username]/review', { username: page.params.username ?? '' }) +
			(filter.query ? `?${filter.query}` : '')
	);
	const share = (n: number) => `${(n / Math.max(1, player.cards.length)) * 100}%`;

	const due = $derived(dueCount(filtered, player.progress));
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
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- resolved, plus a query -->
			<a href={reviewHref} class="btn preset-filled-primary-500 btn-lg" aria-disabled={!due}>
				<Play class="size-5" />
				{#if !due}
					All caught up
				{:else if filter.query}
					Drill {Math.min(due, 20)} {filter.label.toLowerCase()}
				{:else}
					Review {Math.min(due, 20)} cards
				{/if}
			</a>
		{/if}
	</div>

	<!-- Patterns: which kinds of mistakes, and when in the game -->
	{#if player.cards.length}
		<div class="flex flex-col gap-4 card preset-filled-surface-100-900 p-4">
			<div class="flex flex-col gap-1">
				<h2 class="h5">Your patterns</h2>
				{#if topType}
					<p class="text-sm">
						Your most common mistake: <strong>{TYPES[topType[0]].plural}</strong>
						({topType[1]} of {player.cards.length}). Tap a row to see and drill just those.
					</p>
				{/if}
			</div>
			<div class="grid gap-6 md:grid-cols-2">
				<ul class="flex flex-col gap-1">
					{#each types as [type, count] (type)}
						{@const f = byType(type)}
						<li>
							<button
								type="button"
								class="grid w-full grid-cols-[8rem_1fr_2rem] items-center gap-3 rounded-base px-2 py-1 text-left text-sm hover:preset-tonal {filter.query ===
								f.query
									? 'preset-tonal-primary'
									: ''}"
								aria-pressed={filter.query === f.query}
								title={TYPES[type].about}
								onclick={() => pick(f)}
							>
								<span>{TYPES[type].label}</span>
								<span class="h-2 overflow-hidden rounded-full bg-surface-200-800">
									<span class="block h-full bg-warning-500" style:width={share(count)}></span>
								</span>
								<span class="text-right tabular-nums">{count}</span>
							</button>
						</li>
					{/each}
				</ul>
				<div class="flex flex-col gap-3">
					<p class="text-xs font-semibold text-muted uppercase">When they happen</p>
					<div class="flex flex-wrap gap-2">
						{#each Object.keys(PHASES) as phase (phase)}
							{@const f = byPhase(phase as keyof typeof PHASES)}
							{@const count = phases.find(([p]) => p === phase)?.[1] ?? 0}
							<button
								type="button"
								class="flex flex-1 flex-col items-start rounded-base border border-surface-200-800 px-3 py-2 text-left hover:preset-tonal {filter.query ===
								f.query
									? 'preset-tonal-primary'
									: ''}"
								aria-pressed={filter.query === f.query}
								onclick={() => pick(f)}
							>
								<span class="text-xs text-muted">{f.label}</span>
								<span class="text-xl font-bold"
									>{Math.round((count / player.cards.length) * 100)}%</span
								>
								<span class="text-xs text-muted">{count} cards</span>
							</button>
						{/each}
					</div>
					<button
						type="button"
						class="flex items-center justify-between rounded-base border border-surface-200-800 px-3 py-2 text-left text-sm hover:preset-tonal {filter.query ===
						MISSED_WINS.query
							? 'preset-tonal-primary'
							: ''}"
						aria-pressed={filter.query === MISSED_WINS.query}
						onclick={() => pick(MISSED_WINS)}
					>
						<span>
							<strong>Missed wins</strong>
							<span class="block text-xs text-muted"
								>Your opponent blundered and you let them off the hook</span
							>
						</span>
						<span class="text-xl font-bold">{missedWins}</span>
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Running the engine -->
	<div class="flex flex-col gap-4 card border border-surface-200-800 p-4">
		<div class="flex items-start gap-3">
			<Cpu class="mt-0.5 size-5 shrink-0 text-primary-600-400" />
			<div class="flex flex-col gap-1">
				<h2 class="font-bold">Find blunders</h2>
				<p class="text-sm text-muted">
					Stockfish runs in your browser and checks every move. Each game takes about 5–20 seconds.
					Keep this tab open; cards appear as each game finishes. {analyzedCount} games checked so far.
					Missed wins come from games checked after they were added: clear and re-check to find them in
					older games.
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
				<h2 class="flex flex-wrap items-center gap-2 h5">
					Your blunders
					{#if filter.query}
						<button
							type="button"
							class="chip preset-tonal-primary text-xs"
							onclick={() => pick(filter)}
						>
							{filter.label} · {filtered.length}
							<X class="size-3" />
						</button>
					{/if}
				</h2>
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
				{#each filtered.slice(0, shown) as card (card.id)}
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
							<div class="flex flex-wrap gap-1.5">
								<span class="chip preset-tonal-warning text-xs"
									>{TYPES[blunderType(card)].label}</span
								>
								<span class="chip preset-tonal text-xs">{PHASES[gamePhase(card)]}</span>
								{#if isMissedWin(card)}
									<span class="chip preset-tonal-primary text-xs">Missed win</span>
								{/if}
							</div>
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
								{@const why = explain(card)}
								{#if why.played}<p class="text-muted">{why.played}</p>{/if}
								<p>
									Best was <strong class="font-mono text-success-700-300">{card.best}</strong>
									<span class="font-mono text-xs text-muted">{card.line.slice(1).join(' ')}</span>
								</p>
								<p class="text-muted">{why.best}</p>
							{/if}
							<div class="flex flex-wrap gap-1">
								{#if !revealed[card.id]}
									<button
										type="button"
										class="btn btn-sm hover:preset-tonal"
										onclick={() => (revealed = { ...revealed, [card.id]: true })}
									>
										<Eye class="size-4" /> Show best move
									</button>
								{/if}
								<ShareCard {card} />
							</div>
							{#if boxOf(card) !== undefined}
								<p class="text-xs text-muted">Learning level {boxOf(card)} of 5</p>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
			{#if shown < filtered.length}
				<button type="button" class="btn self-center preset-tonal" onclick={() => (shown += 12)}>
					Show more ({filtered.length - shown} left)
				</button>
			{/if}
		</div>
	{:else if analyzedCount && !player.job}
		<p class="card preset-filled-surface-100-900 p-5 text-muted">
			No blunders found in {analyzedCount} games. Nice. Check more games to find some.
		</p>
	{/if}
</section>
