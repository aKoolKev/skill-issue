<script lang="ts">
	import { untrack } from 'svelte';
	import { Chess } from 'chess.js';
	import { SegmentedControl } from '@skeletonlabs/skeleton-svelte';
	import {
		ChevronFirst,
		ChevronLast,
		ChevronLeft,
		ChevronRight,
		Lightbulb,
		PartyPopper,
		RotateCcw
	} from '@lucide/svelte';
	import Board from './Board.svelte';
	import { numbered, type Color } from '$lib/games';
	import type { Line } from '$lib/openings';

	// A lesson for one opening line. Walk through: step the moves back and forth.
	// Practice: play your side's moves from memory; the other side answers by itself.
	let { line, color }: { line: Line; color: Color } = $props();

	/** Every position of the line (fens[i] = after i moves) and each move's squares and UCI */
	const steps = $derived.by(() => {
		const chess = new Chess();
		const fens = [chess.fen()];
		const moves: { from: string; to: string; uci: string }[] = [];
		for (const san of line.moves) {
			const move = chess.move(san);
			moves.push({
				from: move.from,
				to: move.to,
				uci: move.from + move.to + (move.promotion ?? '')
			});
			fens.push(chess.fen());
		}
		return { fens, moves };
	});
	const total = $derived(line.moves.length);

	let mode = $state<'walk' | 'practice'>('walk');
	let ply = $state(0);

	// Practice state
	let mistakes = $state(0);
	let triesHere = $state(0);
	let hint = $state(false);
	let feedback = $state<{ kind: 'right' | 'wrong'; text: string } | null>(null);
	let revision = $state(0);
	let timer: ReturnType<typeof setTimeout> | undefined;

	/** Whose move it is at a ply: White on even plies */
	const turnAt = (p: number): Color => (p % 2 === 0 ? 'white' : 'black');
	const done = $derived(ply >= total);

	function goTo(p: number) {
		ply = Math.max(0, Math.min(total, p));
	}

	/** Plays the other side's moves until it's the learner's turn (or the line ends) */
	function autoplay() {
		clearTimeout(timer);
		if (ply < total && turnAt(ply) !== color) {
			timer = setTimeout(() => {
				ply += 1;
				autoplay();
			}, 450);
		}
	}

	function startPractice() {
		ply = 0;
		mistakes = 0;
		triesHere = 0;
		hint = false;
		feedback = null;
		revision += 1;
		autoplay();
	}

	function onPracticeMove(uci: string) {
		const expected = steps.moves[ply];
		if (!expected) return;
		if (uci.slice(0, 4) === expected.uci.slice(0, 4)) {
			feedback = { kind: 'right', text: `${numbered(ply, line.moves[ply])} ✓` };
			ply += 1;
			triesHere = 0;
			hint = false;
			autoplay();
		} else {
			mistakes += 1;
			triesHere += 1;
			if (triesHere >= 2) hint = true;
			feedback = {
				kind: 'wrong',
				text: triesHere >= 2 ? 'Follow the green arrow.' : 'Not the move in this line. Try again.'
			};
			revision += 1; // put the piece back
		}
	}

	// Switching modes or lines starts over
	$effect(() => {
		void line;
		if (mode === 'practice') untrack(startPractice);
		else
			untrack(() => {
				clearTimeout(timer);
				feedback = null;
				hint = false;
				ply = 0;
			});
		return () => clearTimeout(timer);
	});

	function onkeydown(event: KeyboardEvent) {
		if (mode !== 'walk' || (event.target as HTMLElement)?.closest('input, textarea')) return;
		if (event.key === 'ArrowLeft') goTo(ply - 1);
		else if (event.key === 'ArrowRight') goTo(ply + 1);
		else return;
		event.preventDefault();
	}

	const lastMove = $derived(
		ply > 0 ? ([steps.moves[ply - 1].from, steps.moves[ply - 1].to] as [string, string]) : undefined
	);
	const arrows = $derived.by(() => {
		const next = steps.moves[ply];
		if (!next) return [];
		if (mode === 'walk') return [{ from: next.from, to: next.to, color: 'blue' as const }];
		return hint ? [{ from: next.from, to: next.to, color: 'green' as const }] : [];
	});
</script>

<svelte:window {onkeydown} />

<div class="grid gap-6 md:grid-cols-[minmax(0,26rem)_1fr]">
	<div class="flex flex-col gap-3">
		<Board
			fen={steps.fens[Math.min(ply, total)]}
			orientation={color}
			movable={mode === 'practice' && !done && turnAt(ply) === color ? color : undefined}
			{lastMove}
			{arrows}
			{revision}
			onmove={onPracticeMove}
		/>
		{#if mode === 'walk'}
			<div class="grid grid-cols-4 gap-2">
				<button type="button" class="btn preset-tonal" onclick={() => goTo(0)} aria-label="Start">
					<ChevronFirst class="size-5" />
				</button>
				<button
					type="button"
					class="btn preset-tonal"
					onclick={() => goTo(ply - 1)}
					disabled={ply === 0}
					aria-label="Previous move"
				>
					<ChevronLeft class="size-5" />
				</button>
				<button
					type="button"
					class="btn preset-filled-primary-500"
					onclick={() => goTo(ply + 1)}
					disabled={done}
					aria-label="Next move"
				>
					<ChevronRight class="size-5" />
				</button>
				<button type="button" class="btn preset-tonal" onclick={() => goTo(total)} aria-label="End">
					<ChevronLast class="size-5" />
				</button>
			</div>
		{/if}
	</div>

	<div class="flex min-w-0 flex-col gap-4">
		<SegmentedControl value={mode} onValueChange={(d) => (mode = d.value as typeof mode)}>
			<SegmentedControl.Label class="sr-only">Lesson mode</SegmentedControl.Label>
			<SegmentedControl.Control class="w-full">
				<SegmentedControl.Indicator />
				<SegmentedControl.Item value="walk" class="flex-1">
					<SegmentedControl.ItemText>Walk through</SegmentedControl.ItemText>
					<SegmentedControl.ItemHiddenInput />
				</SegmentedControl.Item>
				<SegmentedControl.Item value="practice" class="flex-1">
					<SegmentedControl.ItemText>Practice</SegmentedControl.ItemText>
					<SegmentedControl.ItemHiddenInput />
				</SegmentedControl.Item>
			</SegmentedControl.Control>
		</SegmentedControl>

		{#if mode === 'walk'}
			<p class="text-sm text-muted">
				Step through the line with the buttons or your arrow keys. The blue arrow shows the next
				move.
			</p>
			<!-- The moves, two per row like a score sheet; tap one to jump there -->
			<ol class="grid grid-cols-[auto_1fr_1fr] gap-x-2 gap-y-1 font-mono text-sm">
				{#each line.moves as san, i (i)}
					{#if i % 2 === 0}
						<li class="contents">
							<span class="py-1 text-right text-muted">{i / 2 + 1}.</span>
							<button
								type="button"
								class="btn justify-start btn-sm {ply === i + 1
									? 'preset-filled-primary-500'
									: 'hover:preset-tonal'}"
								onclick={() => goTo(i + 1)}>{san}</button
							>
							{#if line.moves[i + 1]}
								<button
									type="button"
									class="btn justify-start btn-sm {ply === i + 2
										? 'preset-filled-primary-500'
										: 'hover:preset-tonal'}"
									onclick={() => goTo(i + 2)}>{line.moves[i + 1]}</button
								>
							{:else}
								<span></span>
							{/if}
						</li>
					{/if}
				{/each}
			</ol>
		{:else}
			<div class="flex flex-col gap-3 card preset-filled-surface-100-900 p-4">
				{#if done}
					<p class="flex items-center gap-2 font-semibold">
						<PartyPopper class="size-5 text-primary-600-400" />
						Line complete{mistakes === 0
							? ' with no mistakes!'
							: ` with ${mistakes} ${mistakes === 1 ? 'mistake' : 'mistakes'}.`}
					</p>
				{:else if turnAt(ply) === color}
					<p class="font-semibold">Your move: play move {Math.floor(ply / 2) + 1} for {color}.</p>
				{:else}
					<p class="text-muted">Waiting for the reply…</p>
				{/if}
				{#if feedback && !done}
					<p
						class="text-sm {feedback.kind === 'right'
							? 'text-success-700-300'
							: 'text-error-700-300'}"
						aria-live="polite"
					>
						{feedback.text}
					</p>
				{/if}
				<p class="text-sm text-muted">
					Move {Math.min(ply, total)} of {total} · {mistakes}
					{mistakes === 1 ? 'mistake' : 'mistakes'}
				</p>
				<div class="flex flex-wrap gap-2">
					{#if !done && turnAt(ply) === color && !hint}
						<button type="button" class="btn preset-tonal btn-sm" onclick={() => (hint = true)}>
							<Lightbulb class="size-4" /> Show me
						</button>
					{/if}
					<button type="button" class="btn preset-tonal btn-sm" onclick={startPractice}>
						<RotateCcw class="size-4" /> Start over
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
