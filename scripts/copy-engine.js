// Copies the Stockfish engine (lite, single-threaded WebAssembly build) from node_modules into
// static/engine/, where the browser loads it as a Web Worker ($lib/engine.ts). Runs after every
// npm install, so the engine always matches the installed stockfish package.
// Lite single-threaded: about 2MB, and works on any static host (the multi-threaded builds need
// special cross-origin headers).
import { copyFileSync, mkdirSync } from 'node:fs';

const from = new URL('../node_modules/stockfish/bin/', import.meta.url);
const to = new URL('../static/engine/', import.meta.url);
mkdirSync(to, { recursive: true });
for (const file of ['stockfish-19-lite-single.js', 'stockfish-19-lite-single.wasm']) {
	copyFileSync(new URL(file, from), new URL(file, to));
}
console.log('Copied Stockfish into static/engine/');
