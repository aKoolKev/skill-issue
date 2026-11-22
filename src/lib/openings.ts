// Naming openings and grouping a player's games by them, using Lichess's open opening list
// (src/lib/data/openings.json, built by scripts/build-openings.js).
import { Chess } from 'chess.js';
import type { Color, Game } from './games';

export interface Line {
	id: number;
	eco: string;
	/** Full name, e.g. "Sicilian Defense: Najdorf Variation, English Attack" */
	name: string;
	/** The part before the colon, e.g. "Sicilian Defense" */
	family: string;
	/** The part after it, or "Main line" */
	variation: string;
	moves: string[];
}

export interface Book {
	lines: Line[];
	/** Position key → the line that names it */
	byPosition: Map<string, Line>;
}

/** The FEN without the move counters, so the same position always gives the same key */
export const positionKey = (fen: string) => fen.split(' ').slice(0, 4).join(' ');

let book: Promise<Book> | undefined;

/** The opening list, loaded once and only when needed (it's about 600KB) */
export function loadBook(): Promise<Book> {
	book ??= import('./data/openings.json').then(({ default: rows }) => {
		const lines: Line[] = [];
		const byPosition = new Map<string, Line>();
		(rows as [string, string, string, string][]).forEach(([eco, name, moves, key], id) => {
			const [family, ...rest] = name.split(': ');
			const line = {
				id,
				eco,
				name,
				family,
				variation: rest.join(': ') || 'Main line',
				moves: moves.split(' ')
			};
			lines.push(line);
			// Two names for one position: keep the first, which the list orders as the main one
			if (!byPosition.has(key)) byPosition.set(key, line);
		});
		return { lines, byPosition };
	});
	return book;
}

/** How far into a game to look for named openings; the list's longest lines are about this long */
const MAX_BOOK_PLY = 36;

/**
 * The deepest named line a game reached, matched by position so move-order tricks still count,
 * and the ply count where it was reached.
 */
export function classify(book: Book, moves: string[]): { line: Line | null; ply: number } {
	const chess = new Chess();
	let line: Line | null = null;
	let ply = 0;
	for (let i = 0; i < Math.min(moves.length, MAX_BOOK_PLY); i++) {
		try {
			chess.move(moves[i]);
		} catch {
			break;
		}
		const hit = book.byPosition.get(positionKey(chess.fen()));
		if (hit) {
			line = hit;
			ply = i + 1;
		}
	}
	return { line, ply };
}

/** A game with the opening it was played in */
export interface ClassifiedGame {
	game: Game;
	line: Line;
	/** How many moves (plies) into the game the line was reached */
	ply: number;
}

export function classifyAll(book: Book, games: Game[]): ClassifiedGame[] {
	const out: ClassifiedGame[] = [];
	for (const game of games) {
		const { line, ply } = classify(book, game.moves);
		if (line) out.push({ game, line, ply });
	}
	return out;
}

/** One opening family as one color, e.g. the Sicilian as Black */
export interface Family {
	name: string;
	color: Color;
	slug: string;
	games: ClassifiedGame[];
}

export const slugify = (name: string) =>
	name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

/** The player's openings, most played first */
export function families(classified: ClassifiedGame[]): Family[] {
	const map = new Map<string, Family>();
	for (const item of classified) {
		const key = `${item.game.color}:${item.line.family}`;
		let family = map.get(key);
		if (!family) {
			family = {
				name: item.line.family,
				color: item.game.color,
				slug: slugify(item.line.family),
				games: []
			};
			map.set(key, family);
		}
		family.games.push(item);
	}
	return [...map.values()].sort((a, b) => b.games.length - a.games.length);
}

/** One line of a family, with the player's games in it */
export interface LineStats {
	line: Line;
	games: ClassifiedGame[];
	/** True for the family's principal named variations (no sub-variation after a comma) */
	main: boolean;
}

/**
 * The lines worth knowing in a family: every line the player has reached, then the family's
 * principal variations (shortest first), so the list starts with what actually comes up.
 * Lichess's list has no popularity numbers, so "principal" means a variation named on its own
 * rather than a sub-line of one.
 */
export function linesToKnow(book: Book, family: Family): LineStats[] {
	const played = new Map<number, ClassifiedGame[]>();
	for (const item of family.games) {
		played.set(item.line.id, [...(played.get(item.line.id) ?? []), item]);
	}
	const all = book.lines.filter((line) => line.family === family.name);
	const stats = all.map((line) => ({
		line,
		games: played.get(line.id) ?? [],
		main: !line.variation.includes(',')
	}));
	return stats.sort(
		(a, b) =>
			b.games.length - a.games.length ||
			Number(b.main) - Number(a.main) ||
			a.line.moves.length - b.line.moves.length ||
			a.line.name.localeCompare(b.line.name)
	);
}

/** What was played right after the line was reached in these games, most common first */
export function nextMoves(games: ClassifiedGame[]) {
	const counts = new Map<string, number>();
	for (const { game, ply } of games) {
		const next = game.moves[ply];
		if (next) counts.set(next, (counts.get(next) ?? 0) + 1);
	}
	return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}
