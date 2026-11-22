// The searched player, shared by every page under /u/[username]: their games, openings,
// blunder cards and flashcard progress. Lives in a module so switching pages doesn't refetch.
import {
	getArchives,
	getMonth,
	getProfile,
	getRatings,
	PlayerNotFound,
	type Profile,
	type Ratings
} from './chesscom';
import { toGame, type Game } from './games';
import { classifyAll, families, loadBook, type Book } from './openings';
import { Engine } from './engine';
import { engineCount, findBlunders, type Card } from './analysis';
import { grade, type Progress } from './review';
import { load, remove, save } from './storage';

/** How far back to look, and the most games to keep */
const MONTHS = 6;
const MAX_GAMES = 400;
/** The current month's archive changes as games are played, so it's refetched after this long */
const FRESH_MS = 15 * 60_000;

interface SavedMonth {
	fetchedAt: number;
	games: Game[];
}

interface SavedBlunders {
	cards: Card[];
	/** gameId → number of blunders found, for every game analysed */
	analyzed: Record<string, number>;
}

/** "March 2026" from an archive URL ending in /2026/03 */
function monthLabel(archiveUrl: string) {
	const [year, month] = archiveUrl.split('/').slice(-2).map(Number);
	return new Date(year, month - 1).toLocaleDateString(undefined, {
		month: 'long',
		year: 'numeric'
	});
}

function isCurrentMonth(archiveUrl: string) {
	const now = new Date();
	const current = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
	return archiveUrl.endsWith(current);
}

const byNewest = (a: { endTime: number }, b: { endTime: number }) => b.endTime - a.endTime;

class Player {
	/** Lowercase username */
	username = $state('');
	profile = $state<Profile | null>(null);
	ratings = $state<Ratings>({});
	games = $state.raw<Game[]>([]);
	status = $state<'idle' | 'loading' | 'ready' | 'missing' | 'error'>('idle');
	loadingLabel = $state('');
	error = $state('');

	book = $state.raw<Book | null>(null);
	/** Games named by opening, then grouped into families (most played first) */
	classified = $derived(this.book ? classifyAll(this.book, this.games) : []);
	openings = $derived(families(this.classified));

	cards = $state.raw<Card[]>([]);
	analyzed = $state.raw<Record<string, number>>({});
	progress = $state.raw<Progress>({});
	/** The blunder search in progress, if any */
	job = $state<{ total: number; done: number } | null>(null);
	private abort: AbortController | null = null;

	/** Loads a player (no-op if they're already loaded or loading) */
	async open(name: string) {
		const key = name.toLowerCase();
		if (this.username === key && this.status !== 'error') return;
		this.stopAnalysis();
		this.username = key;
		this.profile = null;
		this.ratings = {};
		this.games = [];
		this.cards = [];
		this.analyzed = {};
		this.progress = {};
		this.error = '';
		this.status = 'loading';
		loadBook().then((book) => (this.book = book));

		const stillCurrent = () => this.username === key;
		try {
			this.loadingLabel = 'Finding player…';
			const profile = await getProfile(key);
			if (!stillCurrent()) return;
			this.profile = profile;

			const [blunders, progress, ratings] = await Promise.all([
				load<SavedBlunders>(`blunders:${key}`),
				load<Progress>(`progress:${key}`),
				getRatings(key).catch(() => ({}))
			]);
			if (!stillCurrent()) return;
			this.cards = blunders?.cards ?? [];
			this.analyzed = blunders?.analyzed ?? {};
			this.progress = progress ?? {};
			this.ratings = ratings;

			// Newest months first, one request at a time (chess.com asks for no parallel calls)
			const archives = (await getArchives(key)).slice(-MONTHS).reverse();
			const games: Game[] = [];
			for (const url of archives) {
				if (!stillCurrent()) return;
				this.loadingLabel = `Loading ${monthLabel(url)}…`;
				games.push(...(await this.month(url, key)));
				this.games = [...games].sort(byNewest).slice(0, MAX_GAMES);
				if (games.length >= MAX_GAMES) break;
			}
			if (!stillCurrent()) return;
			this.status = 'ready';
		} catch (error) {
			if (!stillCurrent()) return;
			if (error instanceof PlayerNotFound) this.status = 'missing';
			else {
				this.status = 'error';
				this.error = error instanceof Error ? error.message : 'Something went wrong';
			}
		}
	}

	/** One month of games, from the saved copy when it's still good */
	private async month(url: string, key: string): Promise<Game[]> {
		const cacheKey = `month:${key}:${url}`;
		const saved = await load<SavedMonth>(cacheKey);
		if (saved && (!isCurrentMonth(url) || Date.now() - saved.fetchedAt < FRESH_MS)) {
			return saved.games;
		}
		const games = (await getMonth(url))
			.map((raw) => toGame(raw, key))
			.filter((game): game is Game => game !== null);
		await save(cacheKey, { fetchedAt: Date.now(), games } satisfies SavedMonth);
		return games;
	}

	/** Runs the engine over these games (skipping ones already done), saving cards as it goes */
	async analyze(games: Game[]) {
		if (this.job) return;
		const queue = games.filter((game) => !(game.id in this.analyzed));
		if (!queue.length) return;

		const key = this.username;
		const abort = new AbortController();
		this.abort = abort;
		this.job = { total: queue.length, done: 0 };
		const engines = Array.from(
			{ length: Math.min(engineCount(), queue.length) },
			() => new Engine()
		);

		// Each engine takes the next game off the queue until it's empty
		let next = 0;
		const work = async (engine: Engine) => {
			while (!abort.signal.aborted && next < queue.length) {
				const game = queue[next++];
				const found = await findBlunders(engine, game, abort.signal);
				if (!found || this.username !== key) return;
				this.cards = [...this.cards, ...found].sort((a, b) => byNewest(a, b) || a.ply - b.ply);
				this.analyzed = { ...this.analyzed, [game.id]: found.length };
				if (this.job) this.job = { ...this.job, done: this.job.done + 1 };
				await save(`blunders:${key}`, {
					cards: this.cards,
					analyzed: this.analyzed
				} satisfies SavedBlunders);
			}
		};

		try {
			await Promise.all(engines.map(work));
		} finally {
			for (const engine of engines) engine.terminate();
			if (this.abort === abort) {
				this.abort = null;
				this.job = null;
			}
		}
	}

	/** Stops after the positions being evaluated right now */
	stopAnalysis() {
		this.abort?.abort();
		this.abort = null;
		this.job = null;
	}

	/** Records a flashcard answer */
	answer(card: Card, right: boolean) {
		this.progress = { ...this.progress, [card.id]: grade(this.progress[card.id], right) };
		save(`progress:${this.username}`, this.progress);
	}

	/** Forgets this player's cards and progress on this device */
	async clearBlunders() {
		this.stopAnalysis();
		this.cards = [];
		this.analyzed = {};
		this.progress = {};
		await remove(`blunders:${this.username}`);
		await remove(`progress:${this.username}`);
	}
}

export const player = new Player();
