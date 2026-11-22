// Finding a player's blunders: the engine evaluates every position of a game, and any move of
// theirs that drops their winning chances a lot (and wasn't the engine's choice) becomes a card.
import { Chess } from 'chess.js';
import { Engine, winChance, type SearchLimits } from './engine';
import { moveNumber, type Color, type Game } from './games';

/** A blunder, as a flashcard: the position before it and the move that should have been played */
export interface Card {
	/** gameId#ply, unique */
	id: string;
	gameId: string;
	endTime: number;
	timeClass: string;
	opponent: string;
	color: Color;
	/** Ply index (0-based) of the blunder */
	ply: number;
	moveNumber: number;
	/** Position before the blunder, with the player to move */
	fen: string;
	/** The move played in the game (SAN) */
	played: string;
	playedUci: string;
	/** The engine's move (SAN and UCI) and the line after it (SAN) */
	best: string;
	bestUci: string;
	line: string[];
	/** Winning chances before and after the blunder, 0–1, from the player's side */
	before: number;
	after: number;
}

/** A drop in winning chances this big (on 0–1) is a blunder: Lichess uses the same cutoff */
export const BLUNDER_DROP = 0.15;

/** Deep enough to catch tactical blunders, quick enough to get through a game in seconds */
const LIMITS: SearchLimits = { depth: 12, movetime: 400 };

/** Engine UCI moves → SAN, played from `fen`, stopping at the first one that doesn't fit */
function uciToSan(fen: string, uci: string[], max = 6) {
	const chess = new Chess(fen);
	const out: string[] = [];
	for (const move of uci.slice(0, max)) {
		try {
			out.push(
				chess.move({ from: move.slice(0, 2), to: move.slice(2, 4), promotion: move[4] }).san
			);
		} catch {
			break;
		}
	}
	return out;
}

/** The blunders of `game`'s player. Stops early (returning null) if `signal` aborts. */
export async function findBlunders(
	engine: Engine,
	game: Game,
	signal?: AbortSignal
): Promise<Card[] | null> {
	// Every position of the game, with the move played from it
	const chess = new Chess();
	const positions: { fen: string; san: string; uci: string }[] = [];
	for (const san of game.moves) {
		const fen = chess.fen();
		let move;
		try {
			move = chess.move(san);
		} catch {
			break; // a move chess.js can't read: analyse what came before it
		}
		positions.push({ fen, san: move.san, uci: move.from + move.to + (move.promotion ?? '') });
	}
	const finalFen = chess.fen();
	const finalChance = chess.isCheckmate() ? 0 : chess.isDraw() ? 0.5 : null;

	// Winning chances for the side to move in each position (and the final one)
	const fens = [...positions.map((p) => p.fen), finalFen];
	const chances: number[] = [];
	const evals = [];
	for (let i = 0; i < fens.length; i++) {
		if (signal?.aborted) return null;
		if (i === fens.length - 1 && finalChance !== null) {
			chances.push(finalChance);
			evals.push(null);
			continue;
		}
		const evaluation = await engine.evaluate(fens[i], LIMITS);
		chances.push(winChance(evaluation.score));
		evals.push(evaluation);
	}

	const mine = game.color === 'white' ? 0 : 1;
	const cards: Card[] = [];
	for (let ply = mine; ply < positions.length; ply += 2) {
		const evaluation = evals[ply];
		if (!evaluation?.best) continue;
		const before = chances[ply];
		const after = 1 - chances[ply + 1]; // the next position is from the opponent's side
		const { fen, san, uci } = positions[ply];
		if (before - after < BLUNDER_DROP || uci === evaluation.best) continue;
		const line = uciToSan(fen, evaluation.pv.length ? evaluation.pv : [evaluation.best]);
		if (!line.length) continue;
		cards.push({
			id: `${game.id}#${ply}`,
			gameId: game.id,
			endTime: game.endTime,
			timeClass: game.timeClass,
			opponent: game.opponent.username,
			color: game.color,
			ply,
			moveNumber: moveNumber(ply),
			fen,
			played: san,
			playedUci: uci,
			best: line[0],
			bestUci: evaluation.best,
			line,
			before,
			after
		});
	}
	return cards;
}

/** How many engines to run side by side: leave a core free so the page stays smooth */
export const engineCount = () =>
	Math.max(1, Math.min(3, (globalThis.navigator?.hardwareConcurrency ?? 2) - 1));
