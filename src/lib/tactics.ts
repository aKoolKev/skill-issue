// What kind of mistake a card is, and when in the game it happened. Worked out from what a card
// already stores (the position, the move played, the engine's line), so cards saved before this
// existed get tagged too. Simple pattern checks with chess.js, not a full tactics engine: good
// enough to show which mistakes keep coming back.
import { Chess, type Color as ChessColor, type Square } from 'chess.js';
import type { Card } from './analysis';
import { refutationGain } from './explain';

export type BlunderType =
	| 'allowed-mate'
	| 'missed-mate'
	| 'allowed-fork'
	| 'hung-piece'
	| 'allowed-tactic'
	| 'missed-tactic'
	| 'positional';

export type Phase = 'opening' | 'middlegame' | 'endgame';

export const TYPES: Record<BlunderType, { label: string; plural: string; about: string }> = {
	'allowed-mate': {
		label: 'Allowed mate',
		plural: 'allowed mates',
		about: 'Your move let the opponent force checkmate.'
	},
	'missed-mate': {
		label: 'Missed mate',
		plural: 'missed mates',
		about: 'You had a forced checkmate and played something else.'
	},
	'allowed-fork': {
		label: 'Allowed fork',
		plural: 'allowed forks',
		about: 'Your move let one enemy piece attack two of yours at once.'
	},
	'hung-piece': {
		label: 'Hung piece',
		plural: 'hung pieces',
		about: 'Your move left a piece where it could be taken for free or for less.'
	},
	'allowed-tactic': {
		label: 'Allowed tactic',
		plural: 'allowed tactics',
		about: 'Nothing was hanging yet, but your move let the opponent win material in a few moves.'
	},
	'missed-tactic': {
		label: 'Missed tactic',
		plural: 'missed tactics',
		about: 'There was a move that won material, and you didn’t play it.'
	},
	positional: {
		label: 'Positional',
		plural: 'positional mistakes',
		about: 'No quick tactic: a plan or structure mistake that the engine punishes slowly.'
	}
};

export const PHASES: Record<Phase, string> = {
	opening: 'Opening',
	middlegame: 'Middlegame',
	endgame: 'Endgame'
};

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

const side = (color: Card['color']): ChessColor => (color === 'white' ? 'w' : 'b');
const other = (c: ChessColor): ChessColor => (c === 'w' ? 'b' : 'w');

/** Plays a UCI move, or returns null if it doesn't fit */
function playUci(chess: Chess, uci: string) {
	try {
		return chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
	} catch {
		return null;
	}
}

/** Material for `color` minus material for the other side */
function balance(chess: Chess, color: ChessColor) {
	let total = 0;
	for (const row of chess.board())
		for (const piece of row)
			if (piece) total += (piece.color === color ? 1 : -1) * VALUE[piece.type];
	return total;
}

/** After the player's move: can the opponent take something for free, or with a cheaper piece? */
function hangsPiece(chess: Chess, me: ChessColor) {
	return chess.moves({ verbose: true }).some((move) => {
		if (!move.captured) return false;
		const taken = VALUE[move.captured];
		const taker = VALUE[move.piece];
		const defended = chess.isAttacked(move.to as Square, me);
		return taken > taker || (!defended && taken >= 3);
	});
}

/** After the opponent's reply: does the piece that moved attack two or more worth worrying about? */
function isFork(chess: Chess, forker: Square, me: ChessColor) {
	const attacker = chess.get(forker);
	if (!attacker) return false;
	let targets = 0;
	for (const row of chess.board()) {
		for (const piece of row) {
			if (!piece || piece.color !== me) continue;
			if (!chess.attackers(piece.square, other(me)).includes(forker)) continue;
			const worth = VALUE[piece.type];
			const defended = chess.isAttacked(piece.square, me);
			if (piece.type === 'k' || worth > VALUE[attacker.type] || (!defended && worth >= 3))
				targets++;
		}
	}
	return targets >= 2;
}

/** Material the engine's line wins, stopping after an opponent move so trades are finished */
function lineGain(card: Card) {
	const chess = new Chess(card.fen);
	const me = side(card.color);
	const start = balance(chess, me);
	const moves = card.line.slice(0, card.line.length - (card.line.length % 2));
	let gain = 0;
	for (const san of moves) {
		try {
			chess.move(san);
		} catch {
			break;
		}
		if (chess.turn() === me) gain = balance(chess, me) - start;
	}
	return gain;
}

const cache = new Map<string, BlunderType>();

export function blunderType(card: Card): BlunderType {
	const hit = cache.get(card.id);
	if (hit) return hit;
	const type = classify(card);
	cache.set(card.id, type);
	return type;
}

function classify(card: Card): BlunderType {
	if (card.after === 0) return 'allowed-mate';
	if (card.before === 1) return 'missed-mate';

	const me = side(card.color);
	const chess = new Chess(card.fen);
	if (!playUci(chess, card.playedUci)) return 'positional';

	const reply = card.refutation?.[0];
	if (reply) {
		const after = new Chess(chess.fen());
		try {
			const move = after.move(reply);
			if (isFork(after, move.to as Square, me)) return 'allowed-fork';
		} catch {
			// not a legal reply: skip the fork check
		}
	}
	if (hangsPiece(chess, me)) return 'hung-piece';
	if (refutationGain(card) >= 2) return 'allowed-tactic';
	if (lineGain(card) >= 2) return 'missed-tactic';
	return 'positional';
}

/**
 * Endgame once the queens, rooks and minor pieces left add up to 26 or less (62 at the start);
 * before that, the first 12 moves are the opening and the rest the middlegame.
 */
export function gamePhase(card: Card): Phase {
	const placement = card.fen.split(' ')[0].toLowerCase();
	let material = 0;
	for (const ch of placement) if ('nbrq'.includes(ch)) material += VALUE[ch];
	if (material <= 26) return 'endgame';
	return card.moveNumber <= 12 ? 'opening' : 'middlegame';
}

/** Counts per key, most common first */
export function countBy<K extends string>(cards: Card[], key: (card: Card) => K) {
	const counts = new Map<K, number>();
	for (const card of cards) counts.set(key(card), (counts.get(key(card)) ?? 0) + 1);
	return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

export const isMissedWin = (card: Card) => card.kind === 'missed-win';

/** A subset of cards to look at or drill: by type, by phase, missed wins only, or all */
export interface CardFilter {
	/** The URL query that selects it, like "type=hung-piece" ("" for all cards) */
	query: string;
	label: string;
	test: (card: Card) => boolean;
}

export const ALL_CARDS: CardFilter = { query: '', label: '', test: () => true };

export const byType = (type: BlunderType): CardFilter => ({
	query: `type=${type}`,
	label: TYPES[type].label,
	test: (card) => blunderType(card) === type
});

export const byPhase = (phase: Phase): CardFilter => ({
	query: `phase=${phase}`,
	label: PHASES[phase],
	test: (card) => gamePhase(card) === phase
});

export const MISSED_WINS: CardFilter = {
	query: 'kind=missed-win',
	label: 'Missed wins',
	test: isMissedWin
};

/** The filter a URL asks for */
export function cardFilter(params: URLSearchParams): CardFilter {
	const type = params.get('type');
	const phase = params.get('phase');
	if (type && type in TYPES) return byType(type as BlunderType);
	if (phase && phase in PHASES) return byPhase(phase as Phase);
	if (params.get('kind') === 'missed-win') return MISSED_WINS;
	return ALL_CARDS;
}

export const filterLabel = (filter: CardFilter) => filter.label || 'All cards';
