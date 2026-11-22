// Plain-English reasons for a card: what the move played allowed, and what the best move does.
// Built by replaying the engine lines the card already stores and comparing the material on the
// board, so it costs no extra engine time. Older cards saved without a refutation get only the
// best-move half.
import { Chess, type Color as ChessColor, type PieceSymbol } from 'chess.js';
import type { Card } from './analysis';

export interface Explanation {
	/** Why the move played was bad, e.g. "After Nf3, they play Bxf7+ and win a knight." */
	played?: string;
	/** What the best move does, e.g. "Qxd5 wins a rook." */
	best: string;
}

const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const NAME: Record<PieceSymbol, string> = {
	p: 'pawn',
	n: 'knight',
	b: 'bishop',
	r: 'rook',
	q: 'queen',
	k: 'king'
};
const COUNT = ['', 'a', 'two', 'three', 'four'];

type Pieces = Record<PieceSymbol, number>;

function count(chess: Chess, color: ChessColor): Pieces {
	const pieces: Pieces = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
	for (const row of chess.board())
		for (const piece of row) if (piece?.color === color) pieces[piece.type]++;
	return pieces;
}

/**
 * Plays `moves` (SAN) from `fen` and returns what `winner` gained: the pieces the other side lost
 * beyond what `winner` lost. Stops on `winner`'s turn so a trade in progress is finished.
 */
function gain(fen: string, moves: string[], winner: ChessColor) {
	const chess = new Chess(fen);
	const loser: ChessColor = winner === 'w' ? 'b' : 'w';
	const startWin = count(chess, winner);
	const startLose = count(chess, loser);
	let end = { theirs: startLose, mine: startWin };
	for (const san of moves) {
		try {
			chess.move(san);
		} catch {
			break;
		}
		if (chess.isCheckmate())
			return { mate: true, lost: [] as PieceSymbol[], given: [] as PieceSymbol[], net: 0 };
		if (chess.turn() !== winner) continue;
		end = { theirs: count(chess, loser), mine: count(chess, winner) };
	}
	// Pieces the loser lost and the winner lost, cancelling out like-for-like trades
	const lost: PieceSymbol[] = [];
	const given: PieceSymbol[] = [];
	let net = 0;
	for (const type of ['q', 'r', 'b', 'n', 'p'] as PieceSymbol[]) {
		const theirs = startLose[type] - end.theirs[type];
		const mine = startWin[type] - end.mine[type];
		const diff = theirs - mine;
		for (let i = 0; i < diff; i++) lost.push(type);
		for (let i = 0; i < -diff; i++) given.push(type);
		net += diff * VALUE[type];
	}
	return { mate: false, lost, given, net };
}

/** "a knight", "two pawns", "the exchange", or "material" for a mix */
function describe(lost: PieceSymbol[], given: PieceSymbol[] = []) {
	if (lost.length === 1 && given.length === 1 && lost[0] === 'r' && 'nb'.includes(given[0]))
		return 'the exchange';
	if (given.length) return null;
	if (lost.length && lost.every((type) => type === lost[0]) && lost.length < COUNT.length) {
		const name = NAME[lost[0]];
		return lost.length === 1
			? `${name === 'queen' ? 'the' : 'a'} ${name}`
			: `${COUNT[lost.length]} ${name}s`;
	}
	return null;
}

const side = (color: Card['color']): ChessColor => (color === 'white' ? 'w' : 'b');
const flip = (c: ChessColor): ChessColor => (c === 'w' ? 'b' : 'w');
const pct = (chance: number) => `${Math.round(chance * 100)}%`;

/** The position right after the move played, or null if it doesn't fit */
function afterPlayed(card: Card) {
	const chess = new Chess(card.fen);
	try {
		chess.move({
			from: card.playedUci.slice(0, 2),
			to: card.playedUci.slice(2, 4),
			promotion: card.playedUci[4]
		});
		return chess.fen();
	} catch {
		return null;
	}
}

/** Material the opponent's best reply wins, in points (0 when unknown or none) */
export function refutationGain(card: Card) {
	const fen = card.refutation?.length ? afterPlayed(card) : null;
	return fen ? gain(fen, card.refutation!, flip(side(card.color))).net : 0;
}

function explainPlayed(card: Card): string | undefined {
	const reply = card.refutation;
	if (!reply?.length) return undefined;
	const fen = afterPlayed(card);
	if (!fen) return undefined;
	const start = `After ${card.played}, they play ${reply[0]}`;
	const result = gain(fen, reply, flip(side(card.color)));
	if (result.mate || card.after === 0) return `${start} and force checkmate: ${reply.join(' ')}.`;
	const what = result.net >= 1 ? describe(result.lost, result.given) : null;
	if (what) return `${start} and win ${what}.`;
	if (result.net >= 1)
		return `${start} and come out ${result.net} point${result.net === 1 ? '' : 's'} of material ahead.`;
	return `${start}. No material changes hands right away, but your winning chances fall to ${pct(card.after)}.`;
}

function explainBest(card: Card): string {
	const result = gain(card.fen, card.line, side(card.color));
	if (result.mate || card.before === 1) return `${card.best} starts a forced checkmate.`;
	const what = result.net >= 1 ? describe(result.lost, result.given) : null;
	if (what) return `${card.best} wins ${what}.`;
	if (result.net >= 1)
		return `${card.best} wins ${result.net} point${result.net === 1 ? '' : 's'} of material.`;
	return `${card.best} keeps your winning chances at ${pct(card.before)}.`;
}

const cache = new Map<string, Explanation>();

export function explain(card: Card): Explanation {
	const hit = cache.get(card.id);
	if (hit) return hit;
	const explanation = { played: explainPlayed(card), best: explainBest(card) };
	cache.set(card.id, explanation);
	return explanation;
}
