// The daily session: a few blunder cards that are due, plus an opening line or two to practice,
// in one short sitting. Finishing one a day keeps a streak going.
import type { Card } from './analysis';
import { pointsVsExpected, type Color, type Game } from './games';
import type { Family, Line } from './openings';
import { session, type Progress } from './review';

/** One thing to do in a session */
export type Step = { kind: 'card'; card: Card } | { kind: 'line'; line: Line; color: Color };

const CARDS = 8;
const LINES = 2;
/** Lines shorter than this (in plies) are too short to be worth drilling */
const MIN_LINE = 4;

/** Key for an opening line's practice progress */
export const lineKey = (color: Color, lineId: number) => `${color}:${lineId}`;

/**
 * Opening lines to practice: ones the player has reached in their games that are due or never
 * practiced, the ones costing the most points first, then the most played.
 */
export function linesToDrill(
	openings: Family[],
	linesProgress: Progress,
	size = LINES,
	now = Date.now()
) {
	const lines = new Map<string, { line: Line; color: Color; games: Game[] }>();
	for (const family of openings) {
		for (const { line, game } of family.games) {
			if (line.moves.length < MIN_LINE) continue;
			const key = lineKey(family.color, line.id);
			const entry = lines.get(key) ?? { line, color: family.color, games: [] };
			entry.games.push(game);
			lines.set(key, entry);
		}
	}
	return [...lines.entries()]
		.filter(([key]) => !linesProgress[key] || linesProgress[key].due <= now)
		.map(([, entry]) => ({ ...entry, cost: pointsVsExpected(entry.games) }))
		.sort((a, b) => a.cost - b.cost || b.games.length - a.games.length)
		.slice(0, size);
}

/** Today's session: due cards, with a line slotted in after every few */
export function buildSession(
	cards: Card[],
	progress: Progress,
	openings: Family[],
	linesProgress: Progress
): Step[] {
	const cardSteps: Step[] = session(cards, progress, CARDS).map((card) => ({ kind: 'card', card }));
	const lineSteps: Step[] = linesToDrill(openings, linesProgress).map(({ line, color }) => ({
		kind: 'line',
		line,
		color
	}));
	const steps: Step[] = [];
	const every = Math.max(1, Math.ceil(cardSteps.length / (lineSteps.length + 1)));
	cardSteps.forEach((step, i) => {
		steps.push(step);
		if ((i + 1) % every === 0 && lineSteps.length) steps.push(lineSteps.shift()!);
	});
	return [...steps, ...lineSteps];
}

/** Days in a row with a finished session */
export interface Streak {
	/** Local date of the last finished session, "2026-03-14" */
	last: string;
	count: number;
}

export function dayKey(date = new Date()) {
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function yesterday(now: Date) {
	const date = new Date(now);
	date.setDate(date.getDate() - 1);
	return dayKey(date);
}

/** The streak after finishing a session now */
export function extendStreak(streak: Streak | undefined, now = new Date()): Streak {
	const today = dayKey(now);
	if (streak?.last === today) return streak;
	return { last: today, count: streak?.last === yesterday(now) ? streak.count + 1 : 1 };
}

/** The streak as it stands: still alive if the last session was today or yesterday */
export function currentStreak(streak: Streak | undefined, now = new Date()) {
	if (!streak) return 0;
	return streak.last === dayKey(now) || streak.last === yesterday(now) ? streak.count : 0;
}

export const doneToday = (streak: Streak | undefined, now = new Date()) =>
	streak?.last === dayKey(now);
