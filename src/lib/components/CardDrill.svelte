<script lang="ts">
	import { ArrowRight, Check, Eye, X } from '@lucide/svelte';
	import { shortDate } from '$lib/games';
	import type { Card } from '$lib/analysis';
	import { blunderType, gamePhase, isMissedWin, PHASES, TYPES } from '$lib/tactics';
	import { explain } from '$lib/explain';
	import Board from './Board.svelte';
	import ShareCard from './ShareCard.svelte';

	// One flashcard: the position before a blunder; play the move you should have played, then
	// see the answer and what kind of mistake it was. The parent wraps this in {#key card.id}.
	let {
		card,
		onanswer,
		onnext
	}: {
		card: Card;
		/** Called once, with whether the move played was the engine's */
		onanswer: (right: boolean) => void;
		onnext: () => void;
	} = $props();

	let answer = $state<{ right: boolean; uci: string } | null>(null);
	let revision = $state(0);

	function grade(uci: string) {
		if (answer) return;
		// Promotions: compare squares only, since the board always promotes to a queen
		const right = uci.slice(0, 4) === card.bestUci.slice(0, 4);
		answer = { right, uci };
		revision += 1;
		onanswer(right);
	}

	const type = $derived(TYPES[blunderType(card)]);
	const why = $derived(explain(card));
	const missed = $derived(isMissedWin(card));
	const squares = (uci: string) => ({ from: uci.slice(0, 2), to: uci.slice(2, 4) });
	type Arrow = { from: string; to: string; color: 'green' | 'red' };
	const arrows = $derived.by((): Arrow[] => {
		if (!answer) return [];
		const shown: Arrow[] = [{ ...squares(card.bestUci), color: 'green' }];
		if (!answer.right && answer.uci) shown.unshift({ ...squares(answer.uci), color: 'red' });
		return shown;
	});
	const pct = (chance: number) => `${Math.round(chance * 100)}%`;
</script>

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
				{card.color === 'white' ? 'White' : 'Black'} to move.
				{missed ? 'Your opponent just blundered. Punish it.' : 'Find the best move.'}
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
				<p class="text-sm">{why.best}</p>
				<p class="text-sm">
					In the game you played <strong class="font-mono">{card.played}</strong>.
					{why.played ?? ''}
				</p>
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- chess.com, not this app -->
				<a href={card.gameId} target="_blank" rel="noreferrer" class="anchor text-sm"
					>Open the game on chess.com</a
				>
			</div>
			<div class="flex flex-col gap-1 text-sm">
				<div class="flex flex-wrap gap-1.5">
					<span class="chip preset-tonal-warning text-xs">{type.label}</span>
					<span class="chip preset-tonal text-xs">{PHASES[gamePhase(card)]}</span>
					{#if missed}<span class="chip preset-tonal-primary text-xs">Missed win</span>{/if}
				</div>
				<p class="text-muted">{type.about}</p>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<button type="button" class="btn preset-filled-primary-500" onclick={onnext}>
					Next <ArrowRight class="size-4" />
				</button>
				<ShareCard {card} />
			</div>
		{/if}
	</div>
</div>
