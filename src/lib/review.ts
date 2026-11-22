// Spaced repetition for the blunder cards (a Leitner box system): a card you get right moves up
// a box and comes back later each time; a miss sends it back to box 0. Same idea as Quizlet's
// Learn mode or Anki, kept simple.
import type { Card } from './analysis';

export interface CardProgress {
	/** 0 = still learning, 5 = known */
	box: number;
	/** When it's next due, in ms */
	due: number;
	/** Times answered, and answered right */
	seen: number;
	right: number;
}

export type Progress = Record<string, CardProgress>;

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
/** How long until a card in each box comes back */
const WAIT = [10 * MINUTE, 1 * DAY, 3 * DAY, 7 * DAY, 14 * DAY, 30 * DAY];
export const TOP_BOX = WAIT.length - 1;

/** The card's progress after an answer */
export function grade(previous: CardProgress | undefined, right: boolean, now = Date.now()) {
	const box = right ? Math.min((previous?.box ?? -1) + 1, TOP_BOX) : 0;
	return {
		box,
		due: now + WAIT[box],
		seen: (previous?.seen ?? 0) + 1,
		right: (previous?.right ?? 0) + (right ? 1 : 0)
	};
}

/** Cards to study now: the ones due (most overdue first), then new ones, up to `size` */
export function session(cards: Card[], progress: Progress, size = 20, now = Date.now()) {
	const due = cards
		.filter((card) => progress[card.id] && progress[card.id].due <= now)
		.sort((a, b) => progress[a.id].due - progress[b.id].due);
	const fresh = cards.filter((card) => !progress[card.id]).sort((a, b) => b.endTime - a.endTime);
	return [...due, ...fresh].slice(0, size);
}

/** How many cards are due now or never seen */
export const dueCount = (cards: Card[], progress: Progress, now = Date.now()) =>
	cards.filter((card) => !progress[card.id] || progress[card.id].due <= now).length;

/** Cards known well enough to be in the top two boxes */
export const knownCount = (cards: Card[], progress: Progress) =>
	cards.filter((card) => (progress[card.id]?.box ?? 0) >= TOP_BOX - 1).length;
