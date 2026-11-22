<script lang="ts">
	import { untrack } from 'svelte';
	import { Chess } from 'chess.js';
	import { Check, Eye, Lightbulb, RotateCcw, X } from '@lucide/svelte';
	import type { Puzzle } from '$lib/data/library';
	import Board from './Board.svelte';

	// A library puzzle: play your moves, the other side answers by itself. A wrong move is taken
	// back. `onresult` fires once, on the first solve: true only without a slip or a peek.
	let {
		puzzle,
		onresult
	}: {
		puzzle: Puzzle;
		onresult?: (right: boolean) => void;
	} = $props();

	/** Every position of the solution, and each move's squares */
	const steps = $derived.by(() => {
		const chess = new Chess(puzzle.fen);
		const fens = [chess.fen()];
		const moves = puzzle.moves.map((san) => {
			const move = chess.move(san);
			fens.push(chess.fen());
			return { from: move.from, to: move.to, uci: move.from + move.to + (move.promotion ?? '') };
		});
		return { fens, moves };
	});
	const color = $derived(new Chess(puzzle.fen).turn() === 'w' ? 'white' : 'black');
	const accepted = $derived(
		(puzzle.accept ?? []).map((san) => {
			const move = new Chess(puzzle.fen).move(san);
			return { uci: move.from + move.to, fen: move.after };
		})
	);

	let ply = $state(0);
	let fen = $state('');
	let slips = $state(0);
	let peeked = $state(false);
	let status = $state<'playing' | 'solved'>('playing');
	let note = $state<{ right: boolean; text: string } | null>(null);
	let revision = $state(0);
	let timer: ReturnType<typeof setTimeout> | undefined;
	let reported = false;

	function reset() {
		clearTimeout(timer);
		ply = 0;
		fen = steps.fens[0];
		slips = 0;
		peeked = false;
		status = 'playing';
		note = null;
		revision += 1;
	}

	$effect(() => {
		void puzzle;
		untrack(reset);
		return () => clearTimeout(timer);
	});

	function finish(text: string) {
		status = 'solved';
		note = { right: true, text };
		if (!reported) {
			reported = true;
			onresult?.(slips === 0 && !peeked);
		}
	}

	function onmove(uci: string) {
		if (status !== 'playing') return;
		const expected = steps.moves[ply];
		const alternative = ply === 0 && accepted.find((a) => a.uci === uci.slice(0, 4));
		if (alternative) {
			fen = alternative.fen;
			finish('That works too!');
			return;
		}
		if (uci.slice(0, 4) !== expected.uci.slice(0, 4)) {
			slips += 1;
			note = { right: false, text: 'Not that one. Try again.' };
			revision += 1; // put the piece back
			return;
		}
		ply += 1;
		fen = steps.fens[ply];
		note = null;
		if (ply >= steps.moves.length) return finish(slips || peeked ? 'Solved.' : 'Solved first try!');
		// The opponent's reply
		timer = setTimeout(() => {
			ply += 1;
			fen = steps.fens[ply];
			if (ply >= steps.moves.length) finish('Solved.');
		}, 450);
	}

	const lastMove = $derived(
		ply > 0 && fen === steps.fens[ply]
			? ([steps.moves[ply - 1].from, steps.moves[ply - 1].to] as [string, string])
			: undefined
	);
	const arrows = $derived(
		peeked && status === 'playing' && steps.moves[ply]
			? [{ from: steps.moves[ply].from, to: steps.moves[ply].to, color: 'green' as const }]
			: []
	);
	const yourTurn = $derived(status === 'playing' && ply % 2 === 0);
</script>

<div class="grid gap-5 md:grid-cols-[minmax(0,26rem)_1fr]">
	<Board
		{fen}
		orientation={color}
		movable={yourTurn ? color : undefined}
		{lastMove}
		{arrows}
		{revision}
		{onmove}
	/>
	<div class="flex min-w-0 flex-col gap-3">
		<p class="flex items-start gap-2 font-semibold">
			<Lightbulb class="mt-0.5 size-5 shrink-0 text-primary-600-400" />
			<span>{color === 'white' ? 'White' : 'Black'} to move. {puzzle.prompt}</span>
		</p>
		{#if note}
			<p
				class="flex items-center gap-2 card p-3 text-sm {note.right
					? 'preset-tonal-success'
					: 'preset-tonal-error'}"
				aria-live="polite"
			>
				{#if note.right}<Check class="size-4" />{:else}<X class="size-4" />{/if}
				{note.text}
			</p>
		{/if}
		{#if status === 'solved'}
			<p class="font-mono text-sm text-muted">{puzzle.moves.join(' ')}</p>
		{/if}
		<div class="flex flex-wrap gap-2">
			{#if status === 'playing' && !peeked}
				<button type="button" class="btn preset-tonal btn-sm" onclick={() => (peeked = true)}>
					<Eye class="size-4" /> Show answer
				</button>
			{/if}
			{#if status === 'solved' || slips}
				<button type="button" class="btn preset-tonal btn-sm" onclick={reset}>
					<RotateCcw class="size-4" /> Start over
				</button>
			{/if}
		</div>
		{#if peeked && status === 'playing'}
			<p class="text-sm text-muted">Play the green arrow.</p>
		{/if}
	</div>
</div>
