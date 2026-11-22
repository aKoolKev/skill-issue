// Checks the library (src/lib/data/library.ts): every position is legal, every puzzle move is
// legal, mates really mate, and Stockfish agrees each of your moves is the best one. It also
// lists other moves that work just as well, so they can go in `accept`.
// Run with: npm run library:check
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { Chess } from 'chess.js';
import { CONCEPTS, parseMark } from '../src/lib/data/library.ts';

const engine = spawn(process.execPath, ['node_modules/stockfish/bin/stockfish-19-lite-single.js']);
const lines = createInterface({ input: engine.stdout });
let waiter: ((line: string) => void) | null = null;
lines.on('line', (line) => waiter?.(line));

type Score = { cp?: number; mate?: number };

/** Top moves for a position: [{ uci, score }] from MultiPV */
function analyse(fen: string, depth = 18, multipv = 5) {
	return new Promise<{ uci: string; score: Score }[]>((resolve) => {
		const best = new Map<number, { uci: string; score: Score }>();
		waiter = (line) => {
			const m = line.match(/ multipv (\d+) score (cp|mate) (-?\d+).* pv (\S+)/);
			if (m) best.set(Number(m[1]), { uci: m[4], score: { [m[2]]: Number(m[3]) } });
			if (line.startsWith('bestmove')) resolve([...best.values()]);
		};
		engine.stdin.write(
			`setoption name MultiPV value ${multipv}\nposition fen ${fen}\ngo depth ${depth}\n`
		);
	});
}

/** A score as one number, mates far above any centipawn score */
const value = (s: Score) =>
	s.mate !== undefined ? (s.mate > 0 ? 100000 - s.mate : -100000 - s.mate) : (s.cp ?? 0);
/** Close enough to the best to count as also right */
const asGood = (s: Score, best: Score) =>
	best.mate !== undefined && best.mate > 0
		? s.mate !== undefined && s.mate > 0 && s.mate <= best.mate
		: value(s) >= value(best) - 60;

const uciOf = (chess: Chess, san: string) => {
	const move = new Chess(chess.fen()).move(san);
	return move.from + move.to + (move.promotion ?? '');
};

let problems = 0;
const fail = (id: string, message: string) => {
	problems++;
	console.log(`✗ ${id}: ${message}`);
};

const ids = new Set<string>();
for (const concept of CONCEPTS) {
	if (ids.has(concept.id)) fail(concept.id, 'duplicate id');
	ids.add(concept.id);

	if (concept.diagram) {
		try {
			new Chess(concept.diagram.fen);
		} catch (error) {
			fail(concept.id, `diagram fen: ${(error as Error).message}`);
		}
		for (const mark of concept.diagram.marks ?? []) {
			const { from, to } = parseMark(mark);
			if (!/^[a-h][1-8]$/.test(from) || !/^[a-h][1-8]$/.test(to))
				fail(concept.id, `bad mark ${mark}`);
		}
	}

	const puzzle = concept.puzzle;
	if (!puzzle) continue;
	let chess: Chess;
	try {
		chess = new Chess(puzzle.fen);
	} catch (error) {
		fail(concept.id, `puzzle fen: ${(error as Error).message}`);
		continue;
	}
	for (const [i, san] of puzzle.moves.entries()) {
		const fen = chess.fen();
		let uci: string;
		try {
			uci = uciOf(chess, san);
		} catch {
			fail(concept.id, `move ${i + 1} (${san}) is illegal`);
			break;
		}
		if (i % 2 === 0 && !puzzle.rule) {
			const top = await analyse(fen);
			const best = top[0].score;
			const mine = top.find((t) => t.uci === uci);
			const accepted = i === 0 ? (puzzle.accept ?? []).map((a) => uciOf(chess, a)) : [];
			if (!mine || !asGood(mine.score, best))
				fail(
					concept.id,
					`${san} isn't best (engine: ${top[0].uci} ${JSON.stringify(best)}, ${san}: ${JSON.stringify(mine?.score ?? 'not in top 5')})`
				);
			for (const other of top) {
				if (other.uci === uci || !asGood(other.score, best)) continue;
				if (!accepted.includes(other.uci))
					fail(concept.id, `move ${i + 1}: ${other.uci} works too ${JSON.stringify(other.score)}`);
			}
			for (const a of accepted)
				if (!top.some((t) => t.uci === a && asGood(t.score, best)))
					fail(concept.id, `accepted ${a} isn't as good`);
		}
		chess.move(san);
	}
	if (puzzle.moves.at(-1)?.endsWith('#') && !chess.isCheckmate())
		fail(concept.id, 'last move is marked # but isn’t mate');
}

engine.kill();
console.log(problems ? `\n${problems} problem(s)` : `\nAll ${CONCEPTS.length} concepts check out.`);
process.exit(problems ? 1 : 0);
