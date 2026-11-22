// Builds src/lib/data/openings.json from Lichess's open opening list
// (https://github.com/lichess-org/chess-openings, public domain / CC0).
// Each entry: [eco, name, moves in SAN separated by spaces, position key].
// The position key (the FEN without the move counters) lets $lib/openings.ts name a game's
// opening by the position it reached, so transpositions still match.
// Run with `npm run openings`; the output is committed, so builds don't need the network.
import { writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const BASE = 'https://raw.githubusercontent.com/lichess-org/chess-openings/master/';
const entries = [];

for (const file of ['a', 'b', 'c', 'd', 'e']) {
	const res = await fetch(`${BASE}${file}.tsv`);
	if (!res.ok) throw new Error(`${file}.tsv: ${res.status}`);
	const rows = (await res.text()).trim().split('\n').slice(1); // skip the header row
	for (const row of rows) {
		const [eco, name, pgn] = row.split('\t');
		const chess = new Chess();
		chess.loadPgn(pgn);
		const moves = chess.history();
		const key = chess.fen().split(' ').slice(0, 4).join(' ');
		entries.push([eco, name, moves.join(' '), key]);
	}
}

const out = new URL('../src/lib/data/openings.json', import.meta.url);
writeFileSync(out, JSON.stringify(entries));
console.log(`Wrote ${entries.length} opening lines`);
