<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { Progress } from '@skeletonlabs/skeleton-svelte';
	import { ArrowLeft, ArrowRight, Check, Eye, PartyPopper, RotateCcw, X } from '@lucide/svelte';
	import { player } from '$lib/player.svelte';
	import { shortDate } from '$lib/games';
	import { session } from '$lib/review';
	import type { Card } from '$lib/analysis';
	import Board from '$lib/components/Board.svelte';

	// A review session: each card shows the position before a blunder; play the move you should
	// have played. Right answers push a card further out; misses come back at the end of the
	// session and sooner next time.
	let queue = $state<Card[]>([]);
	let index = $state(0);
	let started = $state(false);
	let answer = $state<{ right: boolean; uci: string } | null>(null);
	let firstTry = $state(0);
	let missedOnce = $state<Set<string>>(new Set());
	let revision = $state(0);

	function start(all = false) {
		queue = all
			? [...player.cards]
					.sort((a, b) => (player.progress[a.id]?.box ?? 0) - (player.progress[b.id]?.box ?? 0))
					.slice(0, 20)
			: session(player.cards, player.progress);
		index = 0;
		answer = null;
		firstTry = 0;
		missedOnce = new Set();
		started = true;
	}

	// Start once the saved cards have loaded
	$effect(() => {
		if (!started && player.cards.length) start();
	});

	const card = $derived(queue[index]);
	const finished = $derived(started && index >= queue.length);

	function grade(uci: string) {
		if (!card || answer) return;
		// Promotions: compare squares only, since the board always promotes to a queen
		const right = uci.slice(0, 4) === card.bestUci.slice(0, 4);
		answer = { right, uci };
		const repeat = missedOnce.has(card.id);
		if (right && !repeat) firstTry += 1;
		// Only the first answer in a session counts toward the card's schedule
		if (!repeat) player.answer(card, right);
		if (!right && !repeat) {
			missedOnce = new Set([...missedOnce, card.id]);
			queue = [...queue, card]; // try it again at the end
		}
	}

	function next() {
		answer = null;
		index += 1;
		revision += 1;
	}

	const squares = (uci: string) => ({ from: uci.slice(0, 2), to: uci.slice(2, 4) });
	type Arrow = { from: string; to: string; color: 'green' | 'red' };
	const arrows = $derived.by((): Arrow[] => {
		if (!card || !answer) return [];
		const shown: Arrow[] = [{ ...squares(card.bestUci), color: 'green' }];
		if (!answer.right && answer.uci)
			shown.unshift({ ...squares(answer.uci), color: 'red' as const });
		return shown;
	});
	const pct = (chance: number) => `${Math.round(chance * 100)}%`;
</script>

<svelte:head>
	<title>Review · Skill Issue</title>
</svelte:head>

<section class="flex flex-col gap-5">
	<a
		href={resolve('/u/[username]/blunders', { username: page.params.username ?? '' })}
		class="btn self-start btn-sm hover:preset-tonal"
	>
		<ArrowLeft class="size-4" /> Blunders
	</a>

	{#if !player.cards.length}
		<div class="flex flex-col items-start gap-3 card preset-filled-surface-100-900 p-5">
			<p>No cards yet. Check some games for blunders first.</p>
			<a
				href={resolve('/u/[username]/blunders', { username: page.params.username ?? '' })}
				class="btn preset-filled-primary-500">Find blunders</a
			>
		</div>
	{:else if started && !queue.length}
		<div class="flex flex-col items-start gap-3 card preset-filled-surface-100-900 p-5">
			<p class="font-semibold">All caught up. Nothing is due right now.</p>
			<button type="button" class="btn preset-filled-primary-500" onclick={() => start(true)}>
				<RotateCcw class="size-4" /> Practice anyway
			</button>
		</div>
	{:else if finished}
		<div class="flex flex-col items-start gap-3 card preset-filled-surface-100-900 p-5">
			<p class="flex items-center gap-2 h4">
				<PartyPopper class="size-6 text-primary-600-400" /> Session done
			</p>
			<p>
				{firstTry} of {queue.length - missedOnce.size} right on the first try.
				{#if missedOnce.size}The {missedOnce.size} you missed will come back sooner.{/if}
			</p>
			<div class="flex flex-wrap gap-2">
				<button type="button" class="btn preset-filled-primary-500" onclick={() => start()}>
					<RotateCcw class="size-4" /> Another round
				</button>
				<a
					href={resolve('/u/[username]/blunders', { username: page.params.username ?? '' })}
					class="btn preset-tonal">Back to cards</a
				>
			</div>
		</div>
	{:else if card}
		<Progress value={index} max={queue.length} class="flex flex-col gap-1.5">
			<Progress.Label class="text-sm text-muted">Card {index + 1} of {queue.length}</Progress.Label>
			<Progress.Track class="h-2">
				<Progress.Range class="bg-primary-500 transition-[width] duration-300" />
			</Progress.Track>
		</Progress>

		<div class="grid gap-6 md:grid-cols-[minmax(0,28rem)_1fr]">
			<Board
				fen={card.fen}
				orientation={card.color}
				movable={answer ? undefined : card.color}
				{arrows}
				{revision}
				onmove={grade}
			/>

			<div class="flex min-w-0 flex-col gap-4">
				<div class="flex flex-col gap-1">
					<p class="text-sm text-muted">
						Move {card.moveNumber} vs {card.opponent} ·
						<span class="capitalize">{card.timeClass}</span>
						· {shortDate(card.endTime)}
					</p>
					<h2 class="h4">
						{card.color === 'white' ? 'White' : 'Black'} to move. Find the best move.
					</h2>
					{#if !answer}
						<p class="text-sm text-muted">
							In the game you went from {pct(card.before)} winning chances to {pct(card.after)} here.
						</p>
					{/if}
				</div>

				{#if !answer}
					<button type="button" class="btn self-start preset-tonal" onclick={() => grade('')}>
						<Eye class="size-4" /> Show answer
					</button>
				{:else}
					<div
						class="flex flex-col gap-2 card p-4 {answer.right
							? 'preset-tonal-success'
							: 'preset-tonal-error'}"
						aria-live="polite"
					>
						<p class="flex items-center gap-2 font-semibold">
							{#if answer.right}
								<Check class="size-5" /> That’s it!
							{:else}
								<X class="size-5" /> {answer.uci ? 'Not quite.' : 'Here’s the answer.'}
							{/if}
						</p>
						<p>
							Best: <strong class="font-mono">{card.best}</strong>
							{#if card.line.length > 1}
								<span class="font-mono text-sm opacity-80">→ {card.line.slice(1).join(' ')}</span>
							{/if}
						</p>
						<p class="text-sm">
							In the game you played <strong class="font-mono">{card.played}</strong>.
						</p>
						<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- chess.com, not this app -->
						<a href={card.gameId} target="_blank" rel="noreferrer" class="anchor text-sm"
							>Open the game on chess.com</a
						>
					</div>
					<button type="button" class="btn self-start preset-filled-primary-500" onclick={next}>
						Next <ArrowRight class="size-4" />
					</button>
				{/if}
			</div>
		</div>
	{/if}
</section>
