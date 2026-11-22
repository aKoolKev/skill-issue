<script lang="ts">
	import { onMount } from 'svelte';
	import { Chessground } from 'chessground';
	import type { Api } from 'chessground/api';
	import type { Config } from 'chessground/config';
	import type { DrawShape } from 'chessground/draw';
	import type { Key } from 'chessground/types';
	import { Chess, type Square } from 'chess.js';
	import type { Color } from '$lib/games';

	// A chess board (Lichess's open-source chessground). Shows `fen`; when `movable` is a color,
	// that side can drag or click a legal move, reported through `onmove` as UCI ("e2e4", "e7e8q").
	// The parent decides what happens next by passing a new fen.
	let {
		fen,
		orientation = 'white',
		movable,
		lastMove,
		arrows = [],
		onmove,
		revision = 0,
		class: className = ''
	}: {
		fen: string;
		orientation?: Color;
		movable?: Color;
		/** Squares to highlight as the last move, like ["e2", "e4"] */
		lastMove?: [string, string];
		/** Arrows: green for good moves, red for mistakes. from = to draws a circle. */
		arrows?: { from: string; to: string; color: 'green' | 'red' | 'blue' }[];
		onmove?: (uci: string) => void;
		/** Bump to redraw from `fen` even when it hasn't changed (e.g. to take back a wrong move) */
		revision?: number;
		class?: string;
	} = $props();

	let element: HTMLDivElement;
	let board: Api | undefined;

	/** Legal moves from each square, for the side to move */
	function destinations(chess: Chess) {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- handed to chessground, not state
		const dests = new Map<Key, Key[]>();
		for (const move of chess.moves({ verbose: true })) {
			dests.set(move.from as Key, [...(dests.get(move.from as Key) ?? []), move.to as Key]);
		}
		return dests;
	}

	function config(): Config {
		let chess: Chess | undefined;
		try {
			chess = new Chess(fen);
		} catch {
			chess = undefined;
		}
		const turn = chess?.turn() === 'b' ? 'black' : 'white';
		const canMove = Boolean(chess && movable && movable === turn);
		const shapes: DrawShape[] = arrows.map((arrow) => ({
			orig: arrow.from as Key,
			// Same square at both ends: a circle instead of an arrow
			dest: arrow.to === arrow.from ? undefined : (arrow.to as Key),
			brush: arrow.color
		}));
		return {
			fen,
			orientation,
			turnColor: turn,
			check: chess?.inCheck() ? turn : false,
			lastMove: lastMove as Key[] | undefined,
			viewOnly: false,
			coordinates: true,
			animation: { enabled: true, duration: 180 },
			highlight: { lastMove: true, check: true },
			premovable: { enabled: false },
			draggable: { enabled: canMove, showGhost: true },
			selectable: { enabled: canMove },
			movable: {
				free: false,
				color: canMove ? movable : undefined,
				dests: canMove && chess ? destinations(chess) : new Map(),
				showDests: true,
				events: {
					after: (orig, dest) => {
						// Pawns reaching the last rank become queens
						const piece = chess?.get(orig as Square);
						const lastRank = dest[1] === '8' || dest[1] === '1';
						onmove?.(`${orig}${dest}${piece?.type === 'p' && lastRank ? 'q' : ''}`);
					}
				}
			},
			drawable: { enabled: false, autoShapes: shapes }
		};
	}

	onMount(() => {
		board = Chessground(element, config());
		// Redraw when the board changes size (window resize, layout shifts)
		const observer = new ResizeObserver(() => board?.redrawAll());
		observer.observe(element);
		return () => {
			observer.disconnect();
			board?.destroy();
		};
	});

	// Push every prop change to the board
	$effect(() => {
		void revision;
		const next = config();
		board?.set(next);
	});
</script>

<div class="aspect-square w-full {className}">
	<div bind:this={element} class="size-full"></div>
</div>
