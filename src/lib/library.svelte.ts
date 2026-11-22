// Quiz progress for the library, per device. Same spaced-repetition boxes as the blunder cards:
// concepts you get right come back later, misses come back soon.
import { load, save } from './storage';
import { grade, TOP_BOX, type Progress } from './review';
import { CONCEPTS, type Category, type Concept } from './data/library';

const KEY = 'library';

class Library {
	progress = $state.raw<Progress>({});

	constructor() {
		load<Progress>(KEY).then((saved) => {
			if (saved) this.progress = saved;
		});
	}

	answer(id: string, right: boolean) {
		this.progress = { ...this.progress, [id]: grade(this.progress[id], right) };
		save(KEY, this.progress);
	}

	/** Known well: in the top two boxes */
	learned(id: string) {
		return (this.progress[id]?.box ?? -1) >= TOP_BOX - 1;
	}
}

export const library = new Library();

function shuffle<T>(items: T[]) {
	const out = [...items];
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}

export type Question =
	| { kind: 'name' | 'meaning'; concept: Concept; options: Concept[] }
	| { kind: 'puzzle'; concept: Concept };

/**
 * A quiz: concepts that are due come first, then ones never seen, then the rest (weakest first).
 * Concepts with a puzzle are asked as a puzzle about half the time.
 */
export function buildQuiz(progress: Progress, category?: Category, size = 10, now = Date.now()) {
	const pool = CONCEPTS.filter((c) => !category || c.category === category);
	const due = shuffle(pool.filter((c) => progress[c.id] && progress[c.id].due <= now));
	const fresh = shuffle(pool.filter((c) => !progress[c.id]));
	const rest = shuffle(pool.filter((c) => progress[c.id] && progress[c.id].due > now)).sort(
		(a, b) => progress[a.id].box - progress[b.id].box
	);
	const picked = shuffle([...due, ...fresh, ...rest].slice(0, size));

	return picked.map((concept): Question => {
		if (concept.puzzle && Math.random() < 0.5) return { kind: 'puzzle', concept };
		// Wrong answers from the same category when there are enough, so they're harder to guess
		const same = shuffle(
			CONCEPTS.filter((c) => c.id !== concept.id && c.category === concept.category)
		);
		const others = shuffle(
			CONCEPTS.filter((c) => c.id !== concept.id && c.category !== concept.category)
		);
		const options = shuffle([concept, ...[...same, ...others].slice(0, 3)]);
		return { kind: Math.random() < 0.5 ? 'name' : 'meaning', concept, options };
	});
}
