// Stockfish in a Web Worker, talking UCI (the text protocol chess engines use).
// The engine files are copied into static/engine/ on install (scripts/copy-engine.js).

const ENGINE_URL = '/engine/stockfish-19-lite-single.js';

/** An evaluation from the side to move's point of view: centipawns, or mate in N (negative: getting mated) */
export interface Score {
	cp?: number;
	mate?: number;
}

export interface Evaluation {
	score: Score;
	/** Best move in UCI, like "g1f3" or "e7e8q"; empty when the game is over */
	best: string;
	/** The engine's main line in UCI, starting with the best move */
	pv: string[];
}

export interface SearchLimits {
	depth: number;
	/** Stop early after this long, in ms, even if `depth` isn't reached */
	movetime?: number;
}

export class Engine {
	private worker = new Worker(ENGINE_URL);
	private listeners = new Set<(line: string) => void>();
	private queue: Promise<unknown> = Promise.resolve();
	private ready: Promise<void>;

	constructor() {
		this.worker.onmessage = (event) => {
			const line = String(event.data);
			for (const listener of this.listeners) listener(line);
		};
		this.ready = (async () => {
			await this.send('uci', 'uciok');
			this.worker.postMessage('setoption name Hash value 16');
			await this.send('isready', 'readyok');
		})();
	}

	/** Sends a command and waits for the line starting with `until` */
	private send(command: string, until: string) {
		return new Promise<string>((resolve) => {
			const listener = (line: string) => {
				if (line.startsWith(until)) {
					this.listeners.delete(listener);
					resolve(line);
				}
			};
			this.listeners.add(listener);
			this.worker.postMessage(command);
		});
	}

	/** Evaluates a position. Calls are queued, so the engine works on one at a time. */
	evaluate(fen: string, limits: SearchLimits): Promise<Evaluation> {
		const run = async () => {
			await this.ready;
			let score: Score = { cp: 0 };
			let pv: string[] = [];
			const listener = (line: string) => {
				// e.g. "info depth 12 ... score cp 34 ... pv e2e4 e7e5 g1f3"
				if (!line.startsWith('info') || !line.includes(' pv ')) return;
				if (/ multipv (?!1 )/.test(line)) return;
				const cp = line.match(/ score cp (-?\d+)/);
				const mate = line.match(/ score mate (-?\d+)/);
				if (cp) score = { cp: Number(cp[1]) };
				else if (mate) score = { mate: Number(mate[1]) };
				pv = line.split(' pv ')[1].trim().split(' ');
			};
			this.listeners.add(listener);
			this.worker.postMessage(`position fen ${fen}`);
			const go = `go depth ${limits.depth}${limits.movetime ? ` movetime ${limits.movetime}` : ''}`;
			const done = await this.send(go, 'bestmove');
			this.listeners.delete(listener);
			const best = done.split(' ')[1];
			return { score, best: best && best !== '(none)' ? best : '', pv };
		};
		const result = this.queue.then(run, run);
		this.queue = result.catch(() => undefined);
		return result;
	}

	terminate() {
		this.worker.terminate();
		this.listeners.clear();
	}
}

/**
 * Chance of winning for the side the score is for, from 0 to 1 (0.5 = level). Lichess's
 * formula: it turns centipawns into something that matches how often positions are won, so
 * going from +8 to +5 (still winning) counts for much less than 0 to -3.
 */
export function winChance(score: Score) {
	if (score.mate !== undefined) return score.mate > 0 ? 1 : score.mate < 0 ? 0 : 0.5;
	return 1 / (1 + Math.exp(-0.00368208 * (score.cp ?? 0)));
}
