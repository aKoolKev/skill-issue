import type { RawGame } from './chesscom';

export type Color = 'white' | 'black';
export type Result = 'win' | 'loss' | 'draw';

/** A game from the searched player's side */
export interface Game {
	/** chess.com's game URL, which is unique */
	id: string;
	/** When it ended, in ms */
	endTime: number;
	timeClass: string;
	color: Color;
	result: Result;
	rating: number;
	opponent: { username: string; rating: number };
	/** Every move in SAN (e.g. "Nf3"), from the starting position */
	moves: string[];
}

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// chess.com's result codes that mean a draw; "win" is a win, anything else is a loss
const DRAWS = new Set([
	'agreed',
	'repetition',
	'stalemate',
	'insufficient',
	'50move',
	'timevsinsufficient'
]);

/**
 * The moves of a PGN in SAN. A quick text scan rather than a full chess parse: chess.com's PGNs
 * are well formed, and the moves get replayed (and checked) by chess.js wherever they're used.
 */
export function movesFromPgn(pgn: string): string[] {
	const body = pgn
		.replace(/\[[^\]]*\]/g, ' ') // headers
		.replace(/\{[^}]*\}/g, ' ') // comments, including chess.com's clock times
		.replace(/\([^)]*\)/g, ' '); // variations
	return body
		.split(/\s+/)
		.filter((token) => token && !/^\d+\.+$/.test(token) && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(token))
		.map((token) => token.replace(/^\d+\.+/, '')) // "1.e4" written without a space
		.filter(Boolean);
}

/** The game from `username`'s side, or null for games this app skips (variants, custom starts) */
export function toGame(raw: RawGame, username: string): Game | null {
	if (raw.rules !== 'chess' || !raw.pgn) return null;
	if (raw.initial_setup && raw.initial_setup !== START) return null;

	const color: Color =
		raw.white.username.toLowerCase() === username.toLowerCase() ? 'white' : 'black';
	const me = raw[color];
	const them = raw[color === 'white' ? 'black' : 'white'];
	const result: Result = me.result === 'win' ? 'win' : DRAWS.has(me.result) ? 'draw' : 'loss';
	const moves = movesFromPgn(raw.pgn);
	if (moves.length === 0) return null;

	return {
		id: raw.url,
		endTime: raw.end_time * 1000,
		timeClass: raw.time_class,
		color,
		result,
		rating: me.rating,
		opponent: { username: them.username, rating: them.rating },
		moves
	};
}

/** Win / draw / loss counts */
export function tally(games: Game[]) {
	const counts = { win: 0, draw: 0, loss: 0 };
	for (const game of games) counts[game.result]++;
	return counts;
}

/** "Mar 3" (or "Mar 3, 2025" for another year) */
export function shortDate(ms: number) {
	const date = new Date(ms);
	const sameYear = date.getFullYear() === new Date().getFullYear();
	return date.toLocaleDateString(undefined, {
		month: 'short',
		day: 'numeric',
		...(sameYear ? {} : { year: 'numeric' })
	});
}

/** The full move number of a ply (0-based): plies 0 and 1 are move 1 */
export const moveNumber = (ply: number) => Math.floor(ply / 2) + 1;

/** A move with its number, like "12. Nf3" or "12... Nf6" */
export const numbered = (ply: number, san: string) =>
	`${moveNumber(ply)}${ply % 2 === 0 ? '.' : '...'} ${san}`;
